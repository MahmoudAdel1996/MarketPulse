using MarketPulse.Application.Auth;
using MarketPulse.Application.Common;
using MarketPulse.Application.Instruments;
using MarketPulse.Domain.Watchlists;
using Microsoft.EntityFrameworkCore;

namespace MarketPulse.Application.Watchlists;

public sealed class WatchlistService(IApplicationDbContext db, ICurrentUser currentUser, TimeProvider timeProvider)
{
    public async Task<Result<PagedResponse<WatchlistSummaryResponse>>> ListAsync(
        PagedRequest paging, CancellationToken cancellationToken)
    {
        var page = await db.Watchlists
            .AsNoTracking()
            .OrderByDescending(w => w.CreatedAt)
            .Select(w => new WatchlistSummaryResponse(w.Id, w.Name, w.CreatedAt, w.Instruments.Count))
            .ToPagedResponseAsync(paging, cancellationToken);

        return Result<PagedResponse<WatchlistSummaryResponse>>.Ok(page);
    }

    public async Task<Result<WatchlistResponse>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var watchlist = await db.Watchlists
            .AsNoTracking()
            .Include(w => w.Instruments)
            .SingleOrDefaultAsync(w => w.Id == id, cancellationToken);

        if (watchlist is null)
        {
            return Result<WatchlistResponse>.NotFound();
        }

        return Result<WatchlistResponse>.Ok(await ToResponseAsync(watchlist, cancellationToken));
    }

    public async Task<Result<WatchlistResponse>> CreateAsync(CreateWatchlistRequest request, CancellationToken cancellationToken)
    {
        var userId = currentUser.UserId ?? throw new InvalidOperationException("An authenticated user is required.");
        var watchlist = new Watchlist(userId, request.Name.Trim(), timeProvider.GetUtcNow());

        db.Watchlists.Add(watchlist);
        await db.SaveChangesAsync(cancellationToken);

        return Result<WatchlistResponse>.Ok(new WatchlistResponse(watchlist.Id, watchlist.Name, watchlist.CreatedAt, []));
    }

    public async Task<Result> RenameAsync(Guid id, RenameWatchlistRequest request, CancellationToken cancellationToken)
    {
        var watchlist = await db.Watchlists.SingleOrDefaultAsync(w => w.Id == id, cancellationToken);
        if (watchlist is null)
        {
            return Result.NotFound();
        }

        watchlist.Rename(request.Name.Trim());
        await db.SaveChangesAsync(cancellationToken);

        return Result.Ok();
    }

    public async Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var watchlist = await db.Watchlists.SingleOrDefaultAsync(w => w.Id == id, cancellationToken);
        if (watchlist is null)
        {
            return Result.NotFound();
        }

        db.Watchlists.Remove(watchlist);
        await db.SaveChangesAsync(cancellationToken);

        return Result.Ok();
    }

    public async Task<Result> AddInstrumentAsync(Guid id, AddWatchlistInstrumentRequest request, CancellationToken cancellationToken)
    {
        var watchlist = await db.Watchlists
            .Include(w => w.Instruments)
            .SingleOrDefaultAsync(w => w.Id == id, cancellationToken);
        if (watchlist is null)
        {
            return Result.NotFound();
        }

        var instrumentExists = await db.Instruments.AnyAsync(i => i.Id == request.InstrumentId, cancellationToken);
        if (!instrumentExists)
        {
            return Result.NotFound();
        }

        watchlist.AddInstrument(request.InstrumentId, timeProvider.GetUtcNow());
        await db.SaveChangesAsync(cancellationToken);

        return Result.Ok();
    }

    public async Task<Result> RemoveInstrumentAsync(Guid id, Guid instrumentId, CancellationToken cancellationToken)
    {
        var watchlist = await db.Watchlists
            .Include(w => w.Instruments)
            .SingleOrDefaultAsync(w => w.Id == id, cancellationToken);
        if (watchlist is null)
        {
            return Result.NotFound();
        }

        watchlist.RemoveInstrument(instrumentId);
        await db.SaveChangesAsync(cancellationToken);

        return Result.Ok();
    }

    private async Task<WatchlistResponse> ToResponseAsync(Watchlist watchlist, CancellationToken cancellationToken)
    {
        var instrumentIds = watchlist.Instruments.Select(i => i.InstrumentId).ToList();
        var instruments = await db.Instruments
            .AsNoTracking()
            .Where(i => instrumentIds.Contains(i.Id))
            .Select(InstrumentResponse.Projection)
            .ToDictionaryAsync(i => i.Id, cancellationToken);

        var items = watchlist.Instruments
            .OrderBy(i => i.AddedAt)
            .Where(i => instruments.ContainsKey(i.InstrumentId))
            .Select(i => new WatchlistItemResponse(instruments[i.InstrumentId], i.AddedAt))
            .ToList();

        return new WatchlistResponse(watchlist.Id, watchlist.Name, watchlist.CreatedAt, items);
    }
}
