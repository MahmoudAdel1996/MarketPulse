using MarketPulse.Domain.Instruments;
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
}
