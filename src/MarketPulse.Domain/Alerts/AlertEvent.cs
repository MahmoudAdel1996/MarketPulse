namespace MarketPulse.Domain.Alerts;

public sealed class AlertEvent
{
    private AlertEvent()
    {
    }

    public AlertEvent(Guid priceAlertId, decimal observedPrice, DateTimeOffset triggeredAt)
    {
        Id = Guid.NewGuid();
        PriceAlertId = priceAlertId;
        ObservedPrice = observedPrice;
        TriggeredAt = triggeredAt;
        Status = AlertEventStatus.Pending;
    }

    public Guid Id { get; private set; }
    public Guid PriceAlertId { get; private set; }
    public decimal ObservedPrice { get; private set; }
    public DateTimeOffset TriggeredAt { get; private set; }
    public AlertEventStatus Status { get; private set; }

    public void MarkNotified() => Status = AlertEventStatus.Notified;

    public void MarkFailed() => Status = AlertEventStatus.Failed;
}
