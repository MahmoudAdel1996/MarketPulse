using MarketPulse.Application.Alerts;
using MarketPulse.Application.Common;
using MarketPulse.Domain.Alerts;

namespace MarketPulse.Api.Endpoints;

public static class AlertEventEndpoints
{
    public static RouteGroupBuilder MapAlertEventEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/alert-events").WithTags("Alert events").RequireAuthorization();

        group.MapGet("/", async (
            AlertEventService service,
            CancellationToken cancellationToken,
            Guid? alertId,
            AlertEventStatus? status,
            int page = PagedRequest.DefaultPage,
            int pageSize = PagedRequest.DefaultPageSize) =>
        {
            var result = await service.ListAsync(
                new AlertEventQuery(alertId, status), new PagedRequest(page, pageSize), cancellationToken);
            return result.ToHttpResult();
        });

        group.MapGet("/{id:guid}", async (Guid id, AlertEventService service, CancellationToken cancellationToken) =>
            (await service.GetAsync(id, cancellationToken)).ToHttpResult());

        return group;
    }
}
