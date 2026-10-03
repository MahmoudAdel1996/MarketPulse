namespace MarketPulse.Application.Instruments;

public enum HistoryRange
{
    OneHour,
    OneDay,
    SevenDays,
    ThirtyDays,
}

public sealed record PricePoint(DateTimeOffset Time, decimal Bid, decimal Ask);

public sealed record PriceTick(string Symbol, string AssetClass, DateTimeOffset Time, decimal Bid, decimal Ask);

public interface IPriceHistoryStore
{
    Task<IReadOnlyList<PricePoint>> GetSeriesAsync(string symbol, HistoryRange range, CancellationToken ct);

    Task<IReadOnlyDictionary<string, decimal>> GetChanges24hAsync(IReadOnlyCollection<string> symbols, CancellationToken ct);

    Task WriteAsync(IReadOnlyCollection<PriceTick> ticks, CancellationToken ct);
}

/// <summary>Used when no history store is configured: no history, never fails.</summary>
public sealed class NullPriceHistoryStore : IPriceHistoryStore
{
    public Task<IReadOnlyList<PricePoint>> GetSeriesAsync(string symbol, HistoryRange range, CancellationToken ct) =>
        Task.FromResult<IReadOnlyList<PricePoint>>([]);

    public Task<IReadOnlyDictionary<string, decimal>> GetChanges24hAsync(IReadOnlyCollection<string> symbols, CancellationToken ct) =>
        Task.FromResult<IReadOnlyDictionary<string, decimal>>(new Dictionary<string, decimal>());

    public Task WriteAsync(IReadOnlyCollection<PriceTick> ticks, CancellationToken ct) => Task.CompletedTask;
}

public static class HistoryRanges
{
    private static readonly Dictionary<string, HistoryRange> ByValue = new(StringComparer.Ordinal)
    {
        ["1h"] = HistoryRange.OneHour,
        ["24h"] = HistoryRange.OneDay,
        ["7d"] = HistoryRange.SevenDays,
        ["30d"] = HistoryRange.ThirtyDays,
    };

    public static bool TryParse(string? value, out HistoryRange range) =>
        ByValue.TryGetValue(value ?? string.Empty, out range);

    public static string ToQueryValue(this HistoryRange range) => ByValue.First(p => p.Value == range).Key;

    public static TimeSpan Duration(this HistoryRange range) => range switch
    {
        HistoryRange.OneHour => TimeSpan.FromHours(1),
        HistoryRange.OneDay => TimeSpan.FromHours(24),
        HistoryRange.SevenDays => TimeSpan.FromDays(7),
        _ => TimeSpan.FromDays(30),
    };

    public static TimeSpan Bin(this HistoryRange range) => range switch
    {
        HistoryRange.OneHour => TimeSpan.FromMinutes(1),
        HistoryRange.OneDay => TimeSpan.FromMinutes(15),
        HistoryRange.SevenDays => TimeSpan.FromHours(2),
        _ => TimeSpan.FromHours(8),
    };

    public static decimal? PercentChange(decimal firstMid, decimal lastMid) =>
        firstMid == 0 ? null : Math.Round((lastMid - firstMid) / firstMid * 100m, 2);
}
