using System.Net;
using MarketPulse.Application.Common;
using MarketPulse.Application.Instruments;
using MarketPulse.Domain.Instruments;
using MarketPulse.IntegrationTests.TestInfrastructure;

namespace MarketPulse.IntegrationTests.Market;

public class InstrumentEndpointsTests(PostgresApiFactory factory) : IClassFixture<PostgresApiFactory>
{
    [Fact]
    public async Task Get_by_id_returns_instrument_with_latest_quote_anonymously()
    {
        var instrument = await factory.SeedInstrumentAsync();
        await factory.SeedAsync(new LatestQuote(instrument.Id, 1.1m, 1.2m, DateTimeOffset.UtcNow, "test", QuoteFreshness.Live));
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/v1/instruments/{instrument.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.ReadJsonAsync<InstrumentResponse>();
        Assert.Equal(instrument.Symbol, body.Symbol);
        Assert.NotNull(body.LatestQuote);
        Assert.Equal(1.2m, body.LatestQuote!.Ask);
    }

    [Fact]
    public async Task Get_by_unknown_id_returns_not_found()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/v1/instruments/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task List_filters_by_search_and_asset_class_and_pages()
    {
        var tag = Guid.NewGuid().ToString("N")[..8];
        await factory.SeedInstrumentAsync(name: $"Coin {tag} A", assetClass: AssetClass.Crypto);
        await factory.SeedInstrumentAsync(name: $"Coin {tag} B", assetClass: AssetClass.Crypto);
        await factory.SeedInstrumentAsync(name: $"Coin {tag} C", assetClass: AssetClass.Equity);
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/v1/instruments?search={tag.ToUpperInvariant()}&assetClass=Crypto&page=1&pageSize=1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.ReadJsonAsync<PagedResponse<InstrumentResponse>>();
        Assert.Equal(2, body.TotalCount);
        Assert.Single(body.Items);
        Assert.Equal(AssetClass.Crypto, body.Items[0].AssetClass);
    }

    [Theory]
    [InlineData("page=0")]
    [InlineData("pageSize=101")]
    public async Task List_rejects_invalid_paging(string queryString)
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/v1/instruments?{queryString}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
