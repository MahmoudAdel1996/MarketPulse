using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MarketPulse.Api.Auth;
using MarketPulse.Domain.Instruments;
using MarketPulse.Infrastructure.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace MarketPulse.IntegrationTests.TestInfrastructure;

internal static class MarketTestHelpers
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public static async Task<HttpClient> CreateAuthenticatedClientAsync(this PostgresApiFactory factory)
    {
        var client = factory.CreateClient();
        var email = $"user-{Guid.NewGuid():N}@example.com";
        var response = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest(email, "P@ssword123!"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return client;
    }

    public static async Task<Instrument> SeedInstrumentAsync(
        this PostgresApiFactory factory,
        string? symbol = null,
        string name = "Test instrument",
        AssetClass assetClass = AssetClass.Forex)
    {
        var instrument = new Instrument(
            symbol ?? $"T{Guid.NewGuid():N}"[..12].ToUpperInvariant(), name, assetClass, "USD");

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Instruments.Add(instrument);
        await db.SaveChangesAsync();

        return instrument;
    }

    public static async Task SeedAsync(this PostgresApiFactory factory, params object[] entities)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.AddRange(entities);
        await db.SaveChangesAsync();
    }

    public static Task<HttpResponseMessage> PostJsonAsync<T>(this HttpClient client, string url, T body)
        => client.PostAsJsonAsync(url, body, Json);

    public static async Task<T> ReadJsonAsync<T>(this HttpResponseMessage response)
        => (await response.Content.ReadFromJsonAsync<T>(Json))!;
}
