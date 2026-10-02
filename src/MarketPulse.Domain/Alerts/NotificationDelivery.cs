namespace MarketPulse.Domain.Alerts;

public sealed class NotificationDelivery
{
    private NotificationDelivery()
    {
    }

    public NotificationDelivery(Guid alertEventId, NotificationChannel channel)
    {
        Id = Guid.NewGuid();
        AlertEventId = alertEventId;
        Channel = channel;
        Status = DeliveryStatus.Pending;
    }

    public Guid Id { get; private set; }
    public Guid AlertEventId { get; private set; }
    public NotificationChannel Channel { get; private set; }
    public DeliveryStatus Status { get; private set; }
    public int AttemptCount { get; private set; }
    public DateTimeOffset? SentAt { get; private set; }

    public void MarkSent(DateTimeOffset sentAt)
    {
        AttemptCount++;
        Status = DeliveryStatus.Sent;
        SentAt = sentAt;
    }

    public void MarkAttemptFailed()
    {
        AttemptCount++;
        Status = DeliveryStatus.Failed;
    }
}
