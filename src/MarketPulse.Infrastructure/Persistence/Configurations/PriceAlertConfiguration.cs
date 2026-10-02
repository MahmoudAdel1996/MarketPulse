using MarketPulse.Domain.Alerts;
using MarketPulse.Domain.Instruments;
using MarketPulse.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MarketPulse.Infrastructure.Persistence.Configurations;

internal sealed class PriceAlertConfiguration : IEntityTypeConfiguration<PriceAlert>
{
    public void Configure(EntityTypeBuilder<PriceAlert> builder)
    {
        builder.ToTable("PriceAlerts");
        builder.HasKey(a => a.Id);
        builder.Property(a => a.PriceSide).HasConversion<string>().HasMaxLength(16);
        builder.Property(a => a.Direction).HasConversion<string>().HasMaxLength(16);
        builder.Property(a => a.Threshold).HasPrecision(18, 8);

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<Instrument>()
            .WithMany()
            .HasForeignKey(a => a.InstrumentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(a => new { a.InstrumentId, a.IsEnabled });
    }
}
