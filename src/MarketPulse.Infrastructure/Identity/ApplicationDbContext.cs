using MarketPulse.Domain.Alerts;
using MarketPulse.Domain.Instruments;
using MarketPulse.Domain.Watchlists;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace MarketPulse.Infrastructure.Identity;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Instrument> Instruments => Set<Instrument>();
    public DbSet<LatestQuote> LatestQuotes => Set<LatestQuote>();
    public DbSet<Watchlist> Watchlists => Set<Watchlist>();
    public DbSet<PriceAlert> PriceAlerts => Set<PriceAlert>();
    public DbSet<AlertEvent> AlertEvents => Set<AlertEvent>();
    public DbSet<NotificationDelivery> NotificationDeliveries => Set<NotificationDelivery>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
}
