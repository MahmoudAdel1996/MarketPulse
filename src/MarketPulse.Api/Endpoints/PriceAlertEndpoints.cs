using MarketPulse.Application.Alerts;
using MarketPulse.Application.Common;

namespace MarketPulse.Api.Endpoints;

public static class PriceAlertEndpoints
{
    public static RouteGroupBuilder MapPriceAlertEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/alerts").WithTags("Price alerts").RequireAuthorization();

        group.MapGet("/", async (
            PriceAlertService service,
            CancellationToken cancellationToken,
            Guid? instrumentId,
            bool? isEnabled,
            int page = PagedRequest.DefaultPage,
            int pageSize = PagedRequest.DefaultPageSize) =>
        {
            var result = await service.ListAsync(
                new PriceAlertQuery(instrumentId, isEnabled), new PagedRequest(page, pageSize), cancellationToken);
            return result.ToHttpResult();
        });

        group.MapGet("/{id:guid}", async (Guid id, PriceAlertService service, CancellationToken cancellationToken) =>
            (await service.GetAsync(id, cancellationToken)).ToHttpResult());

        group.MapPost("/", async (CreatePriceAlertRequest request, PriceAlertService service, CancellationToken cancellationToken) =>
            (await service.CreateAsync(request, cancellationToken)).ToCreatedResult(a => $"/api/v1/alerts/{a.Id}"));

        group.MapPost("/{id:guid}/enable", async (Guid id, PriceAlertService service, CancellationToken cancellationToken) =>
            (await service.EnableAsync(id, cancellationToken)).ToHttpResult());

        group.MapPost("/{id:guid}/disable", async (Guid id, PriceAlertService service, CancellationToken cancellationToken) =>
            (await service.DisableAsync(id, cancellationToken)).ToHttpResult());

        group.MapDelete("/{id:guid}", async (Guid id, PriceAlertService service, CancellationToken cancellationToken) =>
            (await service.DeleteAsync(id, cancellationToken)).ToHttpResult());

        return group;
    }
}
