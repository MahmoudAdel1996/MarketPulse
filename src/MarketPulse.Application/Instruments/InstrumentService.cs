using MarketPulse.Application.Common;
using Microsoft.EntityFrameworkCore;

namespace MarketPulse.Application.Instruments;

public sealed class InstrumentService(IApplicationDbContext db)
{
    public async Task<Result<PagedResponse<InstrumentResponse>>> ListAsync(
        InstrumentQuery query, PagedRequest paging, CancellationToken cancellationToken)
    {
        var errors = paging.Validate();
        if (errors.Count > 0)
        {
            return Result<PagedResponse<InstrumentResponse>>.Invalid(errors);
        }

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

        return Result<PagedResponse<InstrumentResponse>>.Ok(page);
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
            : Result<InstrumentResponse>.Ok(instrument);
    }
}
