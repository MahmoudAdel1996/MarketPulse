namespace MarketPulse.Domain.Watchlists;

public sealed class WatchlistInstrument
{
    private WatchlistInstrument()
    {
    }

    internal WatchlistInstrument(Guid watchlistId, Guid instrumentId, DateTimeOffset addedAt)
    {
        WatchlistId = watchlistId;
        InstrumentId = instrumentId;
        AddedAt = addedAt;
    }

    public Guid WatchlistId { get; private set; }
    public Guid InstrumentId { get; private set; }
    public DateTimeOffset AddedAt { get; private set; }
}
