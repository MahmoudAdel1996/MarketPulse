using MarketPulse.Domain.Instruments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MarketPulse.Infrastructure.Persistence.Configurations;

internal sealed class LatestQuoteConfiguration : IEntityTypeConfiguration<LatestQuote>
{
    public void Configure(EntityTypeBuilder<LatestQuote> builder)
    {
        builder.ToTable("LatestQuotes");
        builder.HasKey(q => q.InstrumentId);
        builder.Property(q => q.Bid).HasPrecision(18, 8);
        builder.Property(q => q.Ask).HasPrecision(18, 8);
        builder.Property(q => q.Source).HasMaxLength(64).IsRequired();
        builder.Property(q => q.Freshness).HasConversion<string>().HasMaxLength(32);
    }
}
