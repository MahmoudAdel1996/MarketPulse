namespace MarketPulse.Domain.Instruments;

public sealed class LatestQuote
{
    private LatestQuote()
    {
    }

    public LatestQuote(Guid instrumentId, decimal bid, decimal ask, DateTimeOffset updatedAt, string source, QuoteFreshness freshness)
    {
        InstrumentId = instrumentId;
        Update(bid, ask, updatedAt, source, freshness);
    }

    public Guid InstrumentId { get; private set; }
    public decimal Bid { get; private set; }
    public decimal Ask { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }
    public string Source { get; private set; } = null!;
    public QuoteFreshness Freshness { get; private set; }

    public void Update(decimal bid, decimal ask, DateTimeOffset updatedAt, string source, QuoteFreshness freshness)
    {
        Bid = bid;
        Ask = ask;
        UpdatedAt = updatedAt;
        Source = source;
        Freshness = freshness;
    }
}
