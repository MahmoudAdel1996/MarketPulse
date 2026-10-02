using System.ComponentModel.DataAnnotations;
using MarketPulse.Application.Common;
using MarketPulse.Domain.Alerts;

namespace MarketPulse.Application.Alerts;

public sealed record PriceAlertQuery(Guid? InstrumentId, bool? IsEnabled);

public sealed record CreatePriceAlertRequest(
    Guid InstrumentId,
    [EnumDataType(typeof(PriceSide))] PriceSide PriceSide,
    [EnumDataType(typeof(AlertDirection))] AlertDirection Direction,
    [GreaterThanZero] decimal Threshold);

public sealed record PriceAlertResponse(
    Guid Id,
    Guid InstrumentId,
    string Symbol,
    PriceSide PriceSide,
    AlertDirection Direction,
    decimal Threshold,
    bool IsEnabled,
    DateTimeOffset CreatedAt);

public sealed record AlertEventQuery(Guid? AlertId, AlertEventStatus? Status);

public sealed record DeliveryResponse(NotificationChannel Channel, DeliveryStatus Status, int AttemptCount, DateTimeOffset? SentAt);

public sealed record AlertEventResponse(
    Guid Id,
    Guid PriceAlertId,
    decimal ObservedPrice,
    DateTimeOffset TriggeredAt,
    AlertEventStatus Status,
    IReadOnlyList<DeliveryResponse> Deliveries);
