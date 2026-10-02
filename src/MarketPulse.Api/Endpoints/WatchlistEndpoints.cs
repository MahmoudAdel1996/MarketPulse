using MarketPulse.Application.Common;
using MarketPulse.Application.Watchlists;

namespace MarketPulse.Api.Endpoints;

public static class WatchlistEndpoints
{
    public static RouteGroupBuilder MapWatchlistEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/watchlists").WithTags("Watchlists").RequireAuthorization();

        group.MapGet("/", async (
            WatchlistService service,
            CancellationToken cancellationToken,
            int page = PagedRequest.DefaultPage,
            int pageSize = PagedRequest.DefaultPageSize) =>
            (await service.ListAsync(new PagedRequest(page, pageSize), cancellationToken)).ToHttpResult());

        group.MapGet("/{id:guid}", async (Guid id, WatchlistService service, CancellationToken cancellationToken) =>
            (await service.GetAsync(id, cancellationToken)).ToHttpResult());

        group.MapPost("/", async (CreateWatchlistRequest request, WatchlistService service, CancellationToken cancellationToken) =>
            (await service.CreateAsync(request, cancellationToken)).ToCreatedResult(w => $"/api/v1/watchlists/{w.Id}"));

        group.MapPut("/{id:guid}", async (
            Guid id, RenameWatchlistRequest request, WatchlistService service, CancellationToken cancellationToken) =>
            (await service.RenameAsync(id, request, cancellationToken)).ToHttpResult());

        group.MapDelete("/{id:guid}", async (Guid id, WatchlistService service, CancellationToken cancellationToken) =>
            (await service.DeleteAsync(id, cancellationToken)).ToHttpResult());

        group.MapPost("/{id:guid}/instruments", async (
            Guid id, AddWatchlistInstrumentRequest request, WatchlistService service, CancellationToken cancellationToken) =>
            (await service.AddInstrumentAsync(id, request, cancellationToken)).ToHttpResult());

        group.MapDelete("/{id:guid}/instruments/{instrumentId:guid}", async (
            Guid id, Guid instrumentId, WatchlistService service, CancellationToken cancellationToken) =>
            (await service.RemoveInstrumentAsync(id, instrumentId, cancellationToken)).ToHttpResult());

        return group;
    }
}
