using MarketPulse.Application.Common;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MarketPulse.Application.Instruments;

public sealed class InstrumentService(IApplicationDbContext db, IPriceHistoryStore history, ILogger<InstrumentService> logger)
{
    // History is optional: a slow or unreachable store must never hold up quotes.
    private static readonly TimeSpan HistoryBudget = TimeSpan.FromSeconds(2);

    public async Task<Result<PagedResponse<InstrumentResponse>>> ListAsync(
        InstrumentQuery query, PagedRequest paging, CancellationToken cancellationToken)
    {
        var instruments = db.Instruments.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            instruments = instruments.Where(i => i.Symbol.ToLower().Contains(term) || i.Name.ToLower().Contains(term));
        }

        if (query.AssetClass is { } assetClass)
        {
            instruments = instruments.Where(i => i.AssetClass == assetClass);
        }

        var page = await instruments
            .OrderBy(i => i.Symbol)
            .Select(InstrumentResponse.Projection)
            .ToPagedResponseAsync(paging, cancellationToken);

        return Result<PagedResponse<InstrumentResponse>>.Ok(page with { Items = await WithChangesAsync(page.Items, cancellationToken) });
    }

    public async Task<Result<InstrumentResponse>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var instrument = await db.Instruments
            .AsNoTracking()
            .Where(i => i.Id == id)
            .Select(InstrumentResponse.Projection)
            .SingleOrDefaultAsync(cancellationToken);

        return instrument is null
            ? Result<InstrumentResponse>.NotFound()
            : Result<InstrumentResponse>.Ok((await WithChangesAsync([instrument], cancellationToken))[0]);
    }

    public async Task<Result<HistoryResponse>> GetHistoryAsync(Guid id, string? range, CancellationToken cancellationToken)
    {
        if (!HistoryRanges.TryParse(range, out var parsed))
        {
            return Result<HistoryResponse>.Invalid(new Dictionary<string, string[]>
            {
                ["range"] = ["Range must be one of 1h, 24h, 7d, 30d."],
            });
        }

        var symbol = await db.Instruments
            .AsNoTracking()
            .Where(i => i.Id == id)
            .Select(i => i.Symbol)
            .SingleOrDefaultAsync(cancellationToken);
        if (symbol is null)
        {
            return Result<HistoryResponse>.NotFound();
        }

        try
        {
            using var budget = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            budget.CancelAfter(HistoryBudget);
            var points = await history.GetSeriesAsync(symbol, parsed, budget.Token);
            return Result<HistoryResponse>.Ok(new HistoryResponse(
                parsed.ToQueryValue(),
                points.Select(p => new HistoryPointResponse(p.Time, p.Bid, p.Ask)).ToList()));
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Price history unavailable for {Symbol}", symbol);
            return Result<HistoryResponse>.Unavailable();
        }
    }

    private async Task<IReadOnlyList<InstrumentResponse>> WithChangesAsync(
        IReadOnlyList<InstrumentResponse> items, CancellationToken cancellationToken)
    {
        if (items.Count == 0)
        {
            return items;
        }

        try
        {
            using var budget = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            budget.CancelAfter(HistoryBudget);
            var changes = await history.GetChanges24hAsync(items.Select(i => i.Symbol).ToList(), budget.Token);
            return items
                .Select(i => i with { Change24h = changes.TryGetValue(i.Symbol, out var change) ? change : null })
                .ToList();
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            // History is optional: quotes must keep working when the store is down.
            logger.LogWarning(ex, "Price history unavailable; returning instruments without 24h change");
            return items;
        }
    }
}
