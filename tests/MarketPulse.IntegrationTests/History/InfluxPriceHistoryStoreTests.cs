using MarketPulse.Application.Instruments;
using MarketPulse.Infrastructure.History;
using MarketPulse.IntegrationTests.TestInfrastructure;
using Microsoft.Extensions.Logging.Abstractions;

namespace MarketPulse.IntegrationTests.History;

public class InfluxPriceHistoryStoreTests(InfluxContainer influx) : IClassFixture<InfluxContainer>
{
    private InfluxPriceHistoryStore CreateStore() => new(influx.Options, NullLogger<InfluxPriceHistoryStore>.Instance);

    private static IReadOnlyCollection<PriceTick> Ticks(string symbol, int count, decimal start, decimal step, TimeSpan every)
    {
        var now = DateTimeOffset.UtcNow;
        return Enumerable.Range(0, count)
            .Select(i => new PriceTick(symbol, "Forex", now - every * (count - 1 - i), start + step * i, start + step * i + 0.0002m))
            .ToList();
    }

    [Fact]
    public async Task Writes_and_reads_a_binned_series_ordered_by_time()
    {
        using var store = CreateStore();
        var symbol = $"S{Guid.NewGuid():N}"[..10];
        await store.WriteAsync(Ticks(symbol, 288, 1.0m, 0.0001m, TimeSpan.FromMinutes(5)), default);

        var series = await store.GetSeriesAsync(symbol, HistoryRange.OneDay, default);

        Assert.InRange(series.Count, 90, 98);
        Assert.Equal(series.OrderBy(p => p.Time), series);
        Assert.True(series[^1].Bid > series[0].Bid);
    }

    [Fact]
    public async Task Computes_24h_changes_for_many_symbols_in_one_call()
    {
        using var store = CreateStore();
        var up = $"U{Guid.NewGuid():N}"[..10];
        var down = $"D{Guid.NewGuid():N}"[..10];
        await store.WriteAsync([.. Ticks(up, 10, 100m, 1m, TimeSpan.FromHours(1)), .. Ticks(down, 10, 100m, -1m, TimeSpan.FromHours(1))], default);

        var changes = await store.GetChanges24hAsync([up, down, "MISSING"], default);

        Assert.True(changes[up] > 0);
        Assert.True(changes[down] < 0);
        Assert.False(changes.ContainsKey("MISSING"));
    }

    [Fact]
    public async Task Symbols_are_parameterised_not_concatenated()
    {
        using var store = CreateStore();
        await store.WriteAsync(Ticks("SAFE", 3, 1m, 0m, TimeSpan.FromMinutes(5)), default);

        Assert.Empty(await store.GetSeriesAsync("EUR'USD; DROP TABLE quote; --", HistoryRange.OneDay, default));
        Assert.Empty(await store.GetChanges24hAsync(["x' OR '1'='1"], default));
        Assert.NotEmpty(await store.GetSeriesAsync("SAFE", HistoryRange.OneDay, default));
    }

    [Fact]
    public async Task A_database_without_any_quotes_yet_reads_as_empty()
    {
        using var store = new InfluxPriceHistoryStore(await influx.CreateEmptyDatabaseAsync(), NullLogger<InfluxPriceHistoryStore>.Instance);

        Assert.Empty(await store.GetSeriesAsync("EURUSD", HistoryRange.OneDay, default));
        Assert.Empty(await store.GetChanges24hAsync(["EURUSD"], default));
    }
}
