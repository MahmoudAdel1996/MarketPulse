using MarketPulse.Application.Alerts;
using MarketPulse.Application.Common;

namespace MarketPulse.Api.Endpoints;

public static class PriceAlertEndpoints
{
    public static RouteGroupBuilder MapPriceAlertEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/alerts").WithTags("Price alerts").RequireAuthorization();

        group.MapGet("/", ListAlerts);
        group.MapGet("/{id:guid}", GetAlert);
        group.MapPost("/", CreateAlert);
        group.MapPost("/{id:guid}/enable", EnableAlert);
        group.MapPost("/{id:guid}/disable", DisableAlert);
        group.MapDelete("/{id:guid}", DeleteAlert);

        return group;
    }

    private static async Task<IResult> ListAlerts(
        PriceAlertService service,
        Guid? instrumentId,
        bool? isEnabled,
        [AsParameters] PagedRequest paging,
        CancellationToken cancellationToken = default)
    {
        var result = await service.ListAsync(
            new PriceAlertQuery(instrumentId, isEnabled), paging, cancellationToken);
        return result.ToHttpResult();
    }

    private static async Task<IResult> GetAlert(Guid id, PriceAlertService service, CancellationToken cancellationToken = default)
    {
        var result = await service.GetAsync(id, cancellationToken);
        return result.ToHttpResult();
    }

    private static async Task<IResult> CreateAlert(
        CreatePriceAlertRequest request, PriceAlertService service, CancellationToken cancellationToken = default)
    {
        var result = await service.CreateAsync(request, cancellationToken);
        return result.ToCreatedResult(a => $"/api/v1/alerts/{a.Id}");
    }

    private static async Task<IResult> EnableAlert(Guid id, PriceAlertService service, CancellationToken cancellationToken = default)
    {
        var result = await service.EnableAsync(id, cancellationToken);
        return result.ToHttpResult();
    }

    private static async Task<IResult> DisableAlert(Guid id, PriceAlertService service, CancellationToken cancellationToken = default)
    {
        var result = await service.DisableAsync(id, cancellationToken);
        return result.ToHttpResult();
    }

    private static async Task<IResult> DeleteAlert(Guid id, PriceAlertService service, CancellationToken cancellationToken = default)
    {
        var result = await service.DeleteAsync(id, cancellationToken);
        return result.ToHttpResult();
    }
}
