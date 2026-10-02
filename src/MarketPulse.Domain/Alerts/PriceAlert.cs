namespace MarketPulse.Domain.Alerts;

public sealed class PriceAlert
{
    private PriceAlert()
    {
    }

    public PriceAlert(Guid userId, Guid instrumentId, PriceSide priceSide, AlertDirection direction, decimal threshold, DateTimeOffset createdAt)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        InstrumentId = instrumentId;
        PriceSide = priceSide;
        Direction = direction;
        Threshold = threshold;
        IsEnabled = true;
        CreatedAt = createdAt;
    }

    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid InstrumentId { get; private set; }
    public PriceSide PriceSide { get; private set; }
    public AlertDirection Direction { get; private set; }
    public decimal Threshold { get; private set; }
    public bool IsEnabled { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public void Enable() => IsEnabled = true;

    public void Disable() => IsEnabled = false;
}
