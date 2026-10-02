using MarketPulse.Domain.Instruments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MarketPulse.Infrastructure.Persistence.Configurations;

internal sealed class InstrumentConfiguration : IEntityTypeConfiguration<Instrument>
{
    public void Configure(EntityTypeBuilder<Instrument> builder)
    {
        builder.ToTable("Instruments");
        builder.HasKey(i => i.Id);
        builder.Property(i => i.Symbol).HasMaxLength(32).IsRequired();
        builder.HasIndex(i => i.Symbol).IsUnique();
        builder.Property(i => i.Name).HasMaxLength(200).IsRequired();
        builder.Property(i => i.AssetClass).HasConversion<string>().HasMaxLength(32);
        builder.Property(i => i.QuoteCurrency).HasMaxLength(3).IsRequired();

        builder.HasOne(i => i.LatestQuote)
            .WithOne()
            .HasForeignKey<LatestQuote>(q => q.InstrumentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
