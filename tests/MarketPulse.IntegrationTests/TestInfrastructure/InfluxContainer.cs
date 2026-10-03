using System.Net.Http.Json;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using MarketPulse.Infrastructure.History;

namespace MarketPulse.IntegrationTests.TestInfrastructure;

public sealed class InfluxContainer : IAsyncLifetime
{
    private readonly IContainer _container = new ContainerBuilder()
        .WithImage("influxdb:3-core")
        .WithCommand("influxdb3", "serve", "--node-id=test", "--object-store=memory", "--without-auth")
        .WithPortBinding(8181, true)
        .WithWaitStrategy(Wait.ForUnixContainer().UntilHttpRequestIsSucceeded(r => r.ForPort(8181).ForPath("/health")))
        .Build();

    public InfluxDbOptions Options { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        var host = $"http://{_container.Hostname}:{_container.GetMappedPublicPort(8181)}";
        Options = await CreateDatabaseAsync(host, "marketpulse");
    }

    /// <summary>A new database with no tables, as a fresh server has before its first write.</summary>
    public Task<InfluxDbOptions> CreateEmptyDatabaseAsync() => CreateDatabaseAsync(Options.Host, $"empty_{Guid.NewGuid():N}");

    private static async Task<InfluxDbOptions> CreateDatabaseAsync(string host, string database)
    {
        using var http = new HttpClient();
        var response = await http.PostAsJsonAsync($"{host}/api/v3/configure/database", new { db = database });
        response.EnsureSuccessStatusCode();
        return new InfluxDbOptions { Host = host, Database = database, Token = "", AllowAnonymous = true };
    }

    public Task DisposeAsync() => _container.DisposeAsync().AsTask();
}
