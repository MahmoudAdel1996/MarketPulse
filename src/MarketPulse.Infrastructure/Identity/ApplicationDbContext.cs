using MarketPulse.Application.Auth;
using MarketPulse.Application.Common;
using MarketPulse.Domain.Alerts;
using MarketPulse.Domain.Instruments;
using MarketPulse.Domain.Watchlists;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace MarketPulse.Infrastructure.Identity;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, ICurrentUser currentUser)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options), IApplicationDbContext
{
    public DbSet<Instrument> Instruments => Set<Instrument>();
    public DbSet<LatestQuote> LatestQuotes => Set<LatestQuote>();
    public DbSet<Watchlist> Watchlists => Set<Watchlist>();
    public DbSet<PriceAlert> PriceAlerts => Set<PriceAlert>();
    public DbSet<AlertEvent> AlertEvents => Set<AlertEvent>();
    public DbSet<NotificationDelivery> NotificationDeliveries => Set<NotificationDelivery>();

    // Read by the global query filters per context instance. A null user matches no rows (fails closed);
    // system code that needs every user's data must opt out with IgnoreQueryFilters().
    private Guid? CurrentUserId => currentUser.UserId;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        builder.Entity<Watchlist>().HasQueryFilter(w => w.UserId == CurrentUserId);
        builder.Entity<WatchlistInstrument>().HasQueryFilter(wi => Watchlists.Any(w => w.Id == wi.WatchlistId));
        builder.Entity<PriceAlert>().HasQueryFilter(a => a.UserId == CurrentUserId);
        builder.Entity<AlertEvent>().HasQueryFilter(e => PriceAlerts.Any(a => a.Id == e.PriceAlertId));
        builder.Entity<NotificationDelivery>().HasQueryFilter(d => AlertEvents.Any(e => e.Id == d.AlertEventId));
    }
}
