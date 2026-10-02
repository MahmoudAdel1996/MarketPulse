using System.Net;
using MarketPulse.Application.Alerts;
using MarketPulse.Application.Common;
using MarketPulse.Domain.Alerts;
using MarketPulse.IntegrationTests.TestInfrastructure;
using Microsoft.AspNetCore.Http;

namespace MarketPulse.IntegrationTests.Market;

public class AlertEndpointsTests(PostgresApiFactory factory) : IClassFixture<PostgresApiFactory>
{
    [Theory]
    [InlineData("/api/v1/alerts")]
    [InlineData("/api/v1/alert-events")]
    public async Task Anonymous_request_returns_unauthorized(string url)
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Full_price_alert_lifecycle()
    {
        var instrument = await factory.SeedInstrumentAsync();
        using var client = await factory.CreateAuthenticatedClientAsync();

        var created = await client.PostJsonAsync(
            "/api/v1/alerts", new CreatePriceAlertRequest(instrument.Id, PriceSide.Bid, AlertDirection.Above, 1.25m));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var alert = await created.ReadJsonAsync<PriceAlertResponse>();
        Assert.Equal(instrument.Symbol, alert.Symbol);
        Assert.True(alert.IsEnabled);

        var url = $"/api/v1/alerts/{alert.Id}";
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"{url}/disable", null)).StatusCode);

        var disabled = await (await client.GetAsync("/api/v1/alerts?isEnabled=false"))
            .ReadJsonAsync<PagedResponse<PriceAlertResponse>>();
        Assert.Equal(alert.Id, Assert.Single(disabled.Items).Id);

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync($"{url}/enable", null)).StatusCode);
        Assert.True((await (await client.GetAsync(url)).ReadJsonAsync<PriceAlertResponse>()).IsEnabled);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(url)).StatusCode);
    }

    [Fact]
    public async Task Create_with_non_positive_threshold_returns_validation_problem()
    {
        var instrument = await factory.SeedInstrumentAsync();
        using var client = await factory.CreateAuthenticatedClientAsync();

        var response = await client.PostJsonAsync(
            "/api/v1/alerts", new CreatePriceAlertRequest(instrument.Id, PriceSide.Ask, AlertDirection.Below, 0m));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_with_undefined_enum_values_returns_validation_problem()
    {
        var instrument = await factory.SeedInstrumentAsync();
        using var client = await factory.CreateAuthenticatedClientAsync();

        var response = await client.PostJsonAsync(
            "/api/v1/alerts", new { instrumentId = instrument.Id, priceSide = 42, direction = 42, threshold = 1m });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.ReadJsonAsync<HttpValidationProblemDetails>();
        Assert.Contains(problem.Errors.Keys, k => k.Contains("PriceSide", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(problem.Errors.Keys, k => k.Contains("Direction", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Create_for_unknown_instrument_returns_not_found()
    {
        using var client = await factory.CreateAuthenticatedClientAsync();

        var response = await client.PostJsonAsync(
            "/api/v1/alerts", new CreatePriceAlertRequest(Guid.NewGuid(), PriceSide.Ask, AlertDirection.Below, 1m));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Alert_events_include_deliveries_and_are_isolated_per_user()
    {
        var instrument = await factory.SeedInstrumentAsync();
        using var owner = await factory.CreateAuthenticatedClientAsync();
        using var intruder = await factory.CreateAuthenticatedClientAsync();
        var alert = await (await owner.PostJsonAsync(
                "/api/v1/alerts", new CreatePriceAlertRequest(instrument.Id, PriceSide.Bid, AlertDirection.Above, 1m)))
            .ReadJsonAsync<PriceAlertResponse>();

        var alertEvent = new AlertEvent(alert.Id, 1.5m, DateTimeOffset.UtcNow);
        var delivery = new NotificationDelivery(alertEvent.Id, NotificationChannel.Email);
        delivery.MarkSent(DateTimeOffset.UtcNow);
        await factory.SeedAsync(alertEvent, delivery);

        var ownerEvents = await (await owner.GetAsync($"/api/v1/alert-events?alertId={alert.Id}"))
            .ReadJsonAsync<PagedResponse<AlertEventResponse>>();
        var ownerEvent = Assert.Single(ownerEvents.Items);
        var ownerDelivery = Assert.Single(ownerEvent.Deliveries);
        Assert.Equal(DeliveryStatus.Sent, ownerDelivery.Status);
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync($"/api/v1/alert-events/{alertEvent.Id}")).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await intruder.GetAsync($"/api/v1/alerts/{alert.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await intruder.PostAsync($"/api/v1/alerts/{alert.Id}/disable", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await intruder.GetAsync($"/api/v1/alert-events/{alertEvent.Id}")).StatusCode);
        var intruderEvents = await (await intruder.GetAsync("/api/v1/alert-events"))
            .ReadJsonAsync<PagedResponse<AlertEventResponse>>();
        Assert.Equal(0, intruderEvents.TotalCount);
        var intruderAlerts = await (await intruder.GetAsync("/api/v1/alerts"))
            .ReadJsonAsync<PagedResponse<PriceAlertResponse>>();
        Assert.Equal(0, intruderAlerts.TotalCount);
    }

    [Theory]
    [InlineData("/api/v1/watchlists?page=0")]
    [InlineData("/api/v1/watchlists?pageSize=101")]
    [InlineData("/api/v1/alerts?pageSize=0")]
    [InlineData("/api/v1/alert-events?page=-1")]
    public async Task Authenticated_lists_reject_invalid_paging(string url)
    {
        using var client = await factory.CreateAuthenticatedClientAsync();

        var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.ReadJsonAsync<HttpValidationProblemDetails>();
        Assert.NotEmpty(problem.Errors);
    }
}
