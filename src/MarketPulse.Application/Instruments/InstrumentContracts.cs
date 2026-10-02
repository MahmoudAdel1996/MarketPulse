using System.Linq.Expressions;
using MarketPulse.Domain.Instruments;

namespace MarketPulse.Application.Instruments;

public sealed record InstrumentQuery(string? Search, AssetClass? AssetClass);

public sealed record QuoteResponse(decimal Bid, decimal Ask, DateTimeOffset UpdatedAt, string Source, QuoteFreshness Freshness);

public sealed record InstrumentResponse(
    Guid Id,
    string Symbol,
    string Name,
    AssetClass AssetClass,
    string QuoteCurrency,
    QuoteResponse? LatestQuote)
{
    internal static readonly Expression<Func<Instrument, InstrumentResponse>> Projection = i => new InstrumentResponse(
        i.Id,
        i.Symbol,
        i.Name,
        i.AssetClass,
        i.QuoteCurrency,
        i.LatestQuote == null
            ? null
            : new QuoteResponse(i.LatestQuote.Bid, i.LatestQuote.Ask, i.LatestQuote.UpdatedAt, i.LatestQuote.Source, i.LatestQuote.Freshness));
}
