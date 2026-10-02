using MarketPulse.Domain.Instruments;
using MarketPulse.Domain.Watchlists;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MarketPulse.Infrastructure.Persistence.Configurations;

internal sealed class WatchlistInstrumentConfiguration : IEntityTypeConfiguration<WatchlistInstrument>
{
    public void Configure(EntityTypeBuilder<WatchlistInstrument> builder)
    {
        builder.ToTable("WatchlistInstruments");
        builder.HasKey(wi => new { wi.WatchlistId, wi.InstrumentId });

        builder.HasOne<Instrument>()
            .WithMany()
            .HasForeignKey(wi => wi.InstrumentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
