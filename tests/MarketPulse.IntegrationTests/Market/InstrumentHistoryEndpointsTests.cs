using System.Net;
using MarketPulse.Application.Common;
using MarketPulse.Application.Instruments;
using MarketPulse.IntegrationTests.TestInfrastructure;

namespace MarketPulse.IntegrationTests.Market;

public class InstrumentHistoryEndpointsTests(PostgresApiFactory factory) : IClassFixture<PostgresApiFactory>
{
    [Fact]
    public async Task List_and_detail_include_change24h()
    {
        var instrument = await factory.SeedInstrumentAsync();
        factory.History.Changes[instrument.Symbol] = 1.25m;
        using var client = factory.CreateClient();

        var detail = await (await client.GetAsync($"/api/v1/instruments/{instrument.Id}")).ReadJsonAsync<InstrumentResponse>();
        Assert.Equal(1.25m, detail.Change24h);

        var list = await (await client.GetAsync($"/api/v1/instruments?search={instrument.Symbol}")).ReadJsonAsync<PagedResponse<InstrumentResponse>>();
        Assert.Equal(1.25m, Assert.Single(list.Items).Change24h);
    }

    [Fact]
    public async Task List_still_loads_with_null_change_when_history_store_fails()
    {
        var instrument = await factory.SeedInstrumentAsync();
        factory.History.Fail = true;
        try
        {
            using var client = factory.CreateClient();
            var response = await client.GetAsync($"/api/v1/instruments?search={instrument.Symbol}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Null(Assert.Single((await response.ReadJsonAsync<PagedResponse<InstrumentResponse>>()).Items).Change24h);
        }
        finally
        {
            factory.History.Fail = false;
        }
    }

    [Fact]
    public async Task History_returns_points_for_valid_range()
    {
        var instrument = await factory.SeedInstrumentAsync();
        factory.History.Series.Clear();
        factory.History.Series.Add(new PricePoint(DateTimeOffset.UtcNow.AddMinutes(-15), 1.1m, 1.2m));
        using var client = factory.CreateClient();

        var body = await (await client.GetAsync($"/api/v1/instruments/{instrument.Id}/history?range=24h")).ReadJsonAsync<HistoryResponse>();

        Assert.Equal("24h", body.Range);
        Assert.Equal(1.1m, Assert.Single(body.Points).Bid);
    }

    [Theory]
    [InlineData("2d")]
    [InlineData("")]
    public async Task History_rejects_invalid_range(string range)
    {
        var instrument = await factory.SeedInstrumentAsync();
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync($"/api/v1/instruments/{instrument.Id}/history?range={range}")).StatusCode);
    }

    [Fact]
    public async Task History_returns_404_for_unknown_instrument_and_503_when_store_fails()
    {
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/v1/instruments/{Guid.NewGuid()}/history?range=24h")).StatusCode);

        var instrument = await factory.SeedInstrumentAsync();
        factory.History.Fail = true;
        try
        {
            Assert.Equal(HttpStatusCode.ServiceUnavailable, (await client.GetAsync($"/api/v1/instruments/{instrument.Id}/history?range=24h")).StatusCode);
        }
        finally
        {
            factory.History.Fail = false;
        }
    }

    [Fact]
    public async Task Health_endpoint_is_mapped()
    {
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health")).StatusCode);
    }

    [Fact]
    public async Task List_does_not_wait_on_a_hanging_history_store()
    {
        var instrument = await factory.SeedInstrumentAsync();
        factory.History.Hang = true;
        try
        {
            using var client = factory.CreateClient();
            var watch = System.Diagnostics.Stopwatch.StartNew();
            var response = await client.GetAsync($"/api/v1/instruments?search={instrument.Symbol}");
            watch.Stop();
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Null(Assert.Single((await response.ReadJsonAsync<PagedResponse<InstrumentResponse>>()).Items).Change24h);
            Assert.True(watch.Elapsed < TimeSpan.FromSeconds(5), $"took {watch.Elapsed}");
        }
        finally
        {
            factory.History.Hang = false;
        }
    }
}
