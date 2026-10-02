using MarketPulse.Domain.Watchlists;
using MarketPulse.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MarketPulse.Infrastructure.Persistence.Configurations;

internal sealed class WatchlistConfiguration : IEntityTypeConfiguration<Watchlist>
{
    public void Configure(EntityTypeBuilder<Watchlist> builder)
    {
        builder.ToTable("Watchlists");
        builder.HasKey(w => w.Id);
        builder.Property(w => w.Name).HasMaxLength(100).IsRequired();

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(w => w.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(w => w.Instruments)
            .WithOne()
            .HasForeignKey(wi => wi.WatchlistId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Navigation(w => w.Instruments).HasField("_instruments");
    }
}
