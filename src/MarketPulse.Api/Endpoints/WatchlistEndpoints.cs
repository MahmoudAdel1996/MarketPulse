using MarketPulse.Application.Common;
using MarketPulse.Application.Watchlists;

namespace MarketPulse.Api.Endpoints;

public static class WatchlistEndpoints
{
    public static RouteGroupBuilder MapWatchlistEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/watchlists").WithTags("Watchlists").RequireAuthorization();

        group.MapGet("/", ListWatchlists);
        group.MapGet("/{id:guid}", GetWatchlist);
        group.MapPost("/", CreateWatchlist);
        group.MapPut("/{id:guid}", RenameWatchlist);
        group.MapDelete("/{id:guid}", DeleteWatchlist);
        group.MapPost("/{id:guid}/instruments", AddWatchlistInstrument);
        group.MapDelete("/{id:guid}/instruments/{instrumentId:guid}", RemoveWatchlistInstrument);

        return group;
    }

    private static async Task<IResult> ListWatchlists(
        WatchlistService service,
        [AsParameters] PagedRequest paging,
        CancellationToken cancellationToken = default)
    {
        var result = await service.ListAsync(paging, cancellationToken);
        return result.ToHttpResult();
    }

    private static async Task<IResult> GetWatchlist(Guid id, WatchlistService service, CancellationToken cancellationToken = default)
    {
        var result = await service.GetAsync(id, cancellationToken);
        return result.ToHttpResult();
    }

    private static async Task<IResult> CreateWatchlist(
        CreateWatchlistRequest request, WatchlistService service, CancellationToken cancellationToken = default)
    {
        var result = await service.CreateAsync(request, cancellationToken);
        return result.ToCreatedResult(w => $"/api/v1/watchlists/{w.Id}");
    }

    private static async Task<IResult> RenameWatchlist(
        Guid id, RenameWatchlistRequest request, WatchlistService service, CancellationToken cancellationToken = default)
    {
        var result = await service.RenameAsync(id, request, cancellationToken);
        return result.ToHttpResult();
    }

    private static async Task<IResult> DeleteWatchlist(Guid id, WatchlistService service, CancellationToken cancellationToken = default)
    {
        var result = await service.DeleteAsync(id, cancellationToken);
        return result.ToHttpResult();
    }

    private static async Task<IResult> AddWatchlistInstrument(
        Guid id, AddWatchlistInstrumentRequest request, WatchlistService service, CancellationToken cancellationToken = default)
    {
        var result = await service.AddInstrumentAsync(id, request, cancellationToken);
        return result.ToHttpResult();
    }

    private static async Task<IResult> RemoveWatchlistInstrument(
        Guid id, Guid instrumentId, WatchlistService service, CancellationToken cancellationToken = default)
    {
        var result = await service.RemoveInstrumentAsync(id, instrumentId, cancellationToken);
        return result.ToHttpResult();
    }
}
