using MarketPulse.Application.Instruments;
using MarketPulse.Domain.Instruments;
using MarketPulse.Infrastructure.History;
using MarketPulse.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;

namespace MarketPulse.Infrastructure.Persistence;

public static class DevelopmentSeeder
{
    private static readonly (string Symbol, string Name, AssetClass AssetClass, decimal Bid, decimal Ask)[] Instruments =
    [
        ("EURUSD", "Euro / US Dollar", AssetClass.Forex, 1.0712m, 1.0714m),
        ("GBPUSD", "British Pound / US Dollar", AssetClass.Forex, 1.2843m, 1.2846m),
        ("BTCUSD", "Bitcoin", AssetClass.Crypto, 62000.50m, 62010.25m),
        ("ETHUSD", "Ether", AssetClass.Crypto, 2450.10m, 2451.00m),
        ("SHIBUSD", "Shiba Inu", AssetClass.Crypto, 0.00001734m, 0.00001736m),
        ("AAPL", "Apple Inc.", AssetClass.Equity, 227.10m, 227.15m),
        ("MSFT", "Microsoft Corp.", AssetClass.Equity, 416.20m, 416.30m),
        ("XAUUSD", "Gold Spot", AssetClass.Commodity, 2650.40m, 2650.90m),
        ("XAGUSD", "Silver Spot", AssetClass.Commodity, 31.12m, 31.15m),
        ("SPX", "S&P 500", AssetClass.Index, 5750.20m, 5751.00m),
    ];

    public static async Task SeedAsync(ApplicationDbContext db, TimeProvider timeProvider, CancellationToken ct = default)
    {
        var existing = await db.Instruments.Select(i => i.Symbol).ToListAsync(ct);
        var now = timeProvider.GetUtcNow();

        foreach (var (symbol, name, assetClass, bid, ask) in Instruments)
        {
            if (existing.Contains(symbol))
            {
                continue;
            }

            var instrument = new Instrument(symbol, name, assetClass, "USD");
            db.Instruments.Add(instrument);
            db.LatestQuotes.Add(new LatestQuote(instrument.Id, bid, ask, now, "seed", QuoteFreshness.Delayed));
        }

        await db.SaveChangesAsync(ct);
    }

    /// <summary>Writes 30 days of synthetic history for every instrument whose recent series is empty.</summary>
    public static async Task SeedHistoryAsync(
        ApplicationDbContext db, IPriceHistoryStore history, TimeProvider timeProvider, CancellationToken ct = default)
    {
        var instruments = await db.Instruments
            .AsNoTracking()
            .Include(i => i.LatestQuote)
            .Where(i => i.LatestQuote != null)
            .ToListAsync(ct);
        var now = timeProvider.GetUtcNow();

        foreach (var instrument in instruments)
        {
            if ((await history.GetSeriesAsync(instrument.Symbol, HistoryRange.OneDay, ct)).Count > 0)
            {
                continue;
            }

            var ticks = RandomWalk.Generate(
                instrument.Symbol,
                instrument.AssetClass.ToString(),
                instrument.LatestQuote!.Bid,
                instrument.LatestQuote.Ask,
                now,
                TimeSpan.FromDays(30),
                TimeSpan.FromMinutes(5),
                StableSeed(instrument.Symbol));
            await history.WriteAsync(ticks, ct);
        }
    }

    // string.GetHashCode is randomised per process; seeds must be stable across runs.
    private static int StableSeed(string value) => value.Aggregate(17, (hash, c) => unchecked(hash * 31 + c));
}
