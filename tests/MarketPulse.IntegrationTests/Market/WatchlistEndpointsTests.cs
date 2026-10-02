using System.Net;
using System.Net.Http.Json;
using MarketPulse.Application.Common;
using MarketPulse.Application.Watchlists;
using MarketPulse.IntegrationTests.TestInfrastructure;

namespace MarketPulse.IntegrationTests.Market;

public class WatchlistEndpointsTests(PostgresApiFactory factory) : IClassFixture<PostgresApiFactory>
{
    [Fact]
    public async Task Anonymous_request_returns_unauthorized()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/v1/watchlists");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Full_watchlist_lifecycle()
    {
        var instrument = await factory.SeedInstrumentAsync();
        using var client = await factory.CreateAuthenticatedClientAsync();

        var created = await client.PostJsonAsync("/api/v1/watchlists", new CreateWatchlistRequest("  Majors  "));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var watchlist = await created.ReadJsonAsync<WatchlistResponse>();
        Assert.Equal("Majors", watchlist.Name);
        Assert.Equal($"/api/v1/watchlists/{watchlist.Id}", created.Headers.Location?.OriginalString);

        var url = $"/api/v1/watchlists/{watchlist.Id}";
        Assert.Equal(HttpStatusCode.NoContent, (await client.PutAsJsonAsync(url, new RenameWatchlistRequest("FX"))).StatusCode);

        var add = new AddWatchlistInstrumentRequest(instrument.Id);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostJsonAsync($"{url}/instruments", add)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostJsonAsync($"{url}/instruments", add)).StatusCode);

        var detail = await (await client.GetAsync(url)).ReadJsonAsync<WatchlistResponse>();
        Assert.Equal("FX", detail.Name);
        var item = Assert.Single(detail.Instruments);
        Assert.Equal(instrument.Symbol, item.Instrument.Symbol);

        var list = await (await client.GetAsync("/api/v1/watchlists")).ReadJsonAsync<PagedResponse<WatchlistSummaryResponse>>();
        var summary = Assert.Single(list.Items);
        Assert.Equal(1, summary.InstrumentCount);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"{url}/instruments/{instrument.Id}")).StatusCode);
        Assert.Empty((await (await client.GetAsync(url)).ReadJsonAsync<WatchlistResponse>()).Instruments);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(url)).StatusCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Create_with_blank_name_returns_validation_problem(string name)
    {
        using var client = await factory.CreateAuthenticatedClientAsync();

        var response = await client.PostJsonAsync("/api/v1/watchlists", new CreateWatchlistRequest(name));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Adding_unknown_instrument_returns_not_found()
    {
        using var client = await factory.CreateAuthenticatedClientAsync();
        var watchlist = await (await client.PostJsonAsync("/api/v1/watchlists", new CreateWatchlistRequest("W")))
            .ReadJsonAsync<WatchlistResponse>();

        var response = await client.PostJsonAsync(
            $"/api/v1/watchlists/{watchlist.Id}/instruments", new AddWatchlistInstrumentRequest(Guid.NewGuid()));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Other_users_watchlist_is_not_visible()
    {
        var instrument = await factory.SeedInstrumentAsync();
        using var owner = await factory.CreateAuthenticatedClientAsync();
        using var intruder = await factory.CreateAuthenticatedClientAsync();
        var watchlist = await (await owner.PostJsonAsync("/api/v1/watchlists", new CreateWatchlistRequest("Mine")))
            .ReadJsonAsync<WatchlistResponse>();
        var url = $"/api/v1/watchlists/{watchlist.Id}";

        Assert.Equal(HttpStatusCode.NotFound, (await intruder.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await intruder.PutAsJsonAsync(url, new RenameWatchlistRequest("Hacked"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await intruder.PostJsonAsync($"{url}/instruments", new AddWatchlistInstrumentRequest(instrument.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await intruder.DeleteAsync(url)).StatusCode);

        var intruderList = await (await intruder.GetAsync("/api/v1/watchlists")).ReadJsonAsync<PagedResponse<WatchlistSummaryResponse>>();
        Assert.Equal(0, intruderList.TotalCount);

        Assert.Equal("Mine", (await (await owner.GetAsync(url)).ReadJsonAsync<WatchlistResponse>()).Name);
    }
}
