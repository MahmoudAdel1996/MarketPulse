namespace MarketPulse.Domain.Watchlists;

public sealed class Watchlist
{
    private readonly List<WatchlistInstrument> _instruments = [];

    private Watchlist()
    {
    }

    public Watchlist(Guid userId, string name, DateTimeOffset createdAt)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        Name = name;
        CreatedAt = createdAt;
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public string Name { get; private set; } = null!;
    public DateTimeOffset CreatedAt { get; private set; }
    public IReadOnlyCollection<WatchlistInstrument> Instruments => _instruments;

    public void Rename(string name) => Name = name;

    public void AddInstrument(Guid instrumentId, DateTimeOffset addedAt)
    {
        if (_instruments.Any(i => i.InstrumentId == instrumentId))
        {
            return;
        }

        _instruments.Add(new WatchlistInstrument(Id, instrumentId, addedAt));
    }

    public void RemoveInstrument(Guid instrumentId)
        => _instruments.RemoveAll(i => i.InstrumentId == instrumentId);
}
