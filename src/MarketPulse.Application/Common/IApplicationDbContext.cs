using MarketPulse.Domain.Alerts;
using MarketPulse.Domain.Instruments;
using MarketPulse.Domain.Watchlists;
using Microsoft.EntityFrameworkCore;

namespace MarketPulse.Application.Common;

public interface IApplicationDbContext
{
    DbSet<Instrument> Instruments { get; }

    DbSet<LatestQuote> LatestQuotes { get; }

    DbSet<Watchlist> Watchlists { get; }

    DbSet<PriceAlert> PriceAlerts { get; }

    DbSet<AlertEvent> AlertEvents { get; }

    DbSet<NotificationDelivery> NotificationDeliveries { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
