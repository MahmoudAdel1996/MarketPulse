using MarketPulse.Domain.Alerts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MarketPulse.Infrastructure.Persistence.Configurations;

internal sealed class NotificationDeliveryConfiguration : IEntityTypeConfiguration<NotificationDelivery>
{
    public void Configure(EntityTypeBuilder<NotificationDelivery> builder)
    {
        builder.ToTable("NotificationDeliveries");
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Channel).HasConversion<string>().HasMaxLength(16);
        builder.Property(d => d.Status).HasConversion<string>().HasMaxLength(16);

        builder.HasOne<AlertEvent>()
            .WithMany()
            .HasForeignKey(d => d.AlertEventId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
