using MarketPulse.Domain.Alerts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MarketPulse.Infrastructure.Persistence.Configurations;

internal sealed class AlertEventConfiguration : IEntityTypeConfiguration<AlertEvent>
{
    public void Configure(EntityTypeBuilder<AlertEvent> builder)
    {
        builder.ToTable("AlertEvents");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.ObservedPrice).HasPrecision(18, 8);
        builder.Property(e => e.Status).HasConversion<string>().HasMaxLength(16);

        builder.HasOne<PriceAlert>()
            .WithMany()
            .HasForeignKey(e => e.PriceAlertId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
