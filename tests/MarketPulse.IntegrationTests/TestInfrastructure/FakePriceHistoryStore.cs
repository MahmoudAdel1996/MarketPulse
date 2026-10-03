using MarketPulse.Application.Instruments;

namespace MarketPulse.IntegrationTests.TestInfrastructure;

public sealed class FakePriceHistoryStore : IPriceHistoryStore
{
    public Dictionary<string, decimal> Changes { get; } = new();
    public List<PricePoint> Series { get; } = [];
    public bool Fail { get; set; }
    public bool Hang { get; set; }

    public Task<IReadOnlyList<PricePoint>> GetSeriesAsync(string symbol, HistoryRange range, CancellationToken ct) =>
        Fail ? throw new HttpRequestException("influx down") : Task.FromResult<IReadOnlyList<PricePoint>>(Series.ToList());

    public async Task<IReadOnlyDictionary<string, decimal>> GetChanges24hAsync(IReadOnlyCollection<string> symbols, CancellationToken ct)
    {
        if (Hang)
        {
            await Task.Delay(Timeout.Infinite, ct);
        }
        return await GetChangesCoreAsync(symbols);
    }

    private Task<IReadOnlyDictionary<string, decimal>> GetChangesCoreAsync(IReadOnlyCollection<string> symbols) =>
        Fail
            ? throw new HttpRequestException("influx down")
            : Task.FromResult<IReadOnlyDictionary<string, decimal>>(Changes.Where(c => symbols.Contains(c.Key)).ToDictionary());

    public Task WriteAsync(IReadOnlyCollection<PriceTick> ticks, CancellationToken ct) => Task.CompletedTask;
}
