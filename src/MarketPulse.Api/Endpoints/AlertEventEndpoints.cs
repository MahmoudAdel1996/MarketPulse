using MarketPulse.Application.Alerts;
using MarketPulse.Application.Common;
using MarketPulse.Domain.Alerts;

namespace MarketPulse.Api.Endpoints;

public static class AlertEventEndpoints
{
    public static RouteGroupBuilder MapAlertEventEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/alert-events").WithTags("Alert events").RequireAuthorization();

        group.MapGet("/", ListAlertEvents);
        group.MapGet("/{id:guid}", GetAlertEvent);

        return group;
    }

    private static async Task<IResult> ListAlertEvents(
        AlertEventService service,
        Guid? alertId,
        AlertEventStatus? status,
        [AsParameters] PagedRequest paging,
        CancellationToken cancellationToken = default)
    {
        var result = await service.ListAsync(
            new AlertEventQuery(alertId, status), paging, cancellationToken);
        return result.ToHttpResult();
    }

    private static async Task<IResult> GetAlertEvent(Guid id, AlertEventService service, CancellationToken cancellationToken = default)
    {
        var result = await service.GetAsync(id, cancellationToken);
        return result.ToHttpResult();
    }
}
