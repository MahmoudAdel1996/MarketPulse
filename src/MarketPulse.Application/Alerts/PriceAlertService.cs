using MarketPulse.Application.Auth;
using MarketPulse.Application.Common;
using MarketPulse.Domain.Alerts;
using Microsoft.EntityFrameworkCore;

namespace MarketPulse.Application.Alerts;

public sealed class PriceAlertService(IApplicationDbContext db, ICurrentUser currentUser, TimeProvider timeProvider)
{
    public async Task<Result<PagedResponse<PriceAlertResponse>>> ListAsync(
        PriceAlertQuery query, PagedRequest paging, CancellationToken cancellationToken)
    {
        var errors = paging.Validate();
        if (errors.Count > 0)
        {
            return Result<PagedResponse<PriceAlertResponse>>.Invalid(errors);
        }

        var alerts = db.PriceAlerts.AsNoTracking();

        if (query.InstrumentId is { } instrumentId)
        {
            alerts = alerts.Where(a => a.InstrumentId == instrumentId);
        }

        if (query.IsEnabled is { } isEnabled)
        {
            alerts = alerts.Where(a => a.IsEnabled == isEnabled);
        }

        var page = await Project(alerts.OrderByDescending(a => a.CreatedAt))
            .ToPagedResponseAsync(paging, cancellationToken);

        return Result<PagedResponse<PriceAlertResponse>>.Ok(page);
    }

    public async Task<Result<PriceAlertResponse>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var alert = await Project(db.PriceAlerts.AsNoTracking().Where(a => a.Id == id))
            .SingleOrDefaultAsync(cancellationToken);

        return alert is null
            ? Result<PriceAlertResponse>.NotFound()
            : Result<PriceAlertResponse>.Ok(alert);
    }

    public async Task<Result<PriceAlertResponse>> CreateAsync(CreatePriceAlertRequest request, CancellationToken cancellationToken)
    {
        var errors = Validate(request);
        if (errors.Count > 0)
        {
            return Result<PriceAlertResponse>.Invalid(errors);
        }

        var symbol = await db.Instruments
            .Where(i => i.Id == request.InstrumentId)
            .Select(i => i.Symbol)
            .SingleOrDefaultAsync(cancellationToken);
        if (symbol is null)
        {
            return Result<PriceAlertResponse>.NotFound();
        }

        var userId = currentUser.UserId ?? throw new InvalidOperationException("An authenticated user is required.");
        var alert = new PriceAlert(
            userId, request.InstrumentId, request.PriceSide, request.Direction, request.Threshold, timeProvider.GetUtcNow());

        db.PriceAlerts.Add(alert);
        await db.SaveChangesAsync(cancellationToken);

        return Result<PriceAlertResponse>.Ok(new PriceAlertResponse(
            alert.Id, alert.InstrumentId, symbol, alert.PriceSide, alert.Direction, alert.Threshold, alert.IsEnabled, alert.CreatedAt));
    }

    public Task<Result> EnableAsync(Guid id, CancellationToken cancellationToken)
        => UpdateAsync(id, a => a.Enable(), cancellationToken);

    public Task<Result> DisableAsync(Guid id, CancellationToken cancellationToken)
        => UpdateAsync(id, a => a.Disable(), cancellationToken);

    public async Task<Result> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var alert = await db.PriceAlerts.SingleOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (alert is null)
        {
            return Result.NotFound();
        }

        db.PriceAlerts.Remove(alert);
        await db.SaveChangesAsync(cancellationToken);

        return Result.Ok();
    }

    public static Dictionary<string, string[]> Validate(CreatePriceAlertRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (request.Threshold <= 0)
        {
            errors[nameof(request.Threshold)] = ["Threshold must be greater than 0."];
        }

        if (!Enum.IsDefined(request.PriceSide))
        {
            errors[nameof(request.PriceSide)] = ["PriceSide is not a supported value."];
        }

        if (!Enum.IsDefined(request.Direction))
        {
            errors[nameof(request.Direction)] = ["Direction is not a supported value."];
        }

        return errors;
    }

    private async Task<Result> UpdateAsync(Guid id, Action<PriceAlert> update, CancellationToken cancellationToken)
    {
        var alert = await db.PriceAlerts.SingleOrDefaultAsync(a => a.Id == id, cancellationToken);
        if (alert is null)
        {
            return Result.NotFound();
        }

        update(alert);
        await db.SaveChangesAsync(cancellationToken);

        return Result.Ok();
    }

    private IQueryable<PriceAlertResponse> Project(IQueryable<PriceAlert> alerts)
        => alerts.Join(
            db.Instruments,
            a => a.InstrumentId,
            i => i.Id,
            (a, i) => new PriceAlertResponse(a.Id, a.InstrumentId, i.Symbol, a.PriceSide, a.Direction, a.Threshold, a.IsEnabled, a.CreatedAt));
}
