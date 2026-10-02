using MarketPulse.Application.Common;
using MarketPulse.Domain.Alerts;
using Microsoft.EntityFrameworkCore;

namespace MarketPulse.Application.Alerts;

public sealed class AlertEventService(IApplicationDbContext db)
{
    public async Task<Result<PagedResponse<AlertEventResponse>>> ListAsync(
        AlertEventQuery query, PagedRequest paging, CancellationToken cancellationToken)
    {
        var errors = paging.Validate();
        if (errors.Count > 0)
        {
            return Result<PagedResponse<AlertEventResponse>>.Invalid(errors);
        }

        var events = db.AlertEvents.AsNoTracking();

        if (query.AlertId is { } alertId)
        {
            events = events.Where(e => e.PriceAlertId == alertId);
        }

        if (query.Status is { } status)
        {
            events = events.Where(e => e.Status == status);
        }

        var page = await Project(events.OrderByDescending(e => e.TriggeredAt))
            .ToPagedResponseAsync(paging, cancellationToken);

        return Result<PagedResponse<AlertEventResponse>>.Ok(page);
    }

    public async Task<Result<AlertEventResponse>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var alertEvent = await Project(db.AlertEvents.AsNoTracking().Where(e => e.Id == id))
            .SingleOrDefaultAsync(cancellationToken);

        return alertEvent is null
            ? Result<AlertEventResponse>.NotFound()
            : Result<AlertEventResponse>.Ok(alertEvent);
    }

    private IQueryable<AlertEventResponse> Project(IQueryable<AlertEvent> events)
        => events.Select(e => new AlertEventResponse(
            e.Id,
            e.PriceAlertId,
            e.ObservedPrice,
            e.TriggeredAt,
            e.Status,
            db.NotificationDeliveries
                .Where(d => d.AlertEventId == e.Id)
                .Select(d => new DeliveryResponse(d.Channel, d.Status, d.AttemptCount, d.SentAt))
                .ToList()));
}
