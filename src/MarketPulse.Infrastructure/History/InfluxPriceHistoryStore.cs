using System.Globalization;
using Grpc.Core;
using InfluxDB3.Client;
using InfluxDB3.Client.Write;
using MarketPulse.Application.Instruments;
using Microsoft.Extensions.Logging;

namespace MarketPulse.Infrastructure.History;

public sealed class InfluxPriceHistoryStore(InfluxDbOptions options, ILogger<InfluxPriceHistoryStore> logger)
    : IPriceHistoryStore, IDisposable
{
    private readonly InfluxDBClient _client = new(
        options.Host,
        token: string.IsNullOrEmpty(options.Token) ? null : options.Token,
        database: options.Database);

    // Public methods wrap the client calls in WaitAsync so callers' time budgets hold even if the client ignores cancellation.
    public Task<IReadOnlyList<PricePoint>> GetSeriesAsync(string symbol, HistoryRange range, CancellationToken ct) =>
        QuerySeriesAsync(symbol, range, ct).WaitAsync(ct);

    public Task<IReadOnlyDictionary<string, decimal>> GetChanges24hAsync(IReadOnlyCollection<string> symbols, CancellationToken ct) =>
        QueryChangesAsync(symbols, ct).WaitAsync(ct);

    private async Task<IReadOnlyList<PricePoint>> QuerySeriesAsync(string symbol, HistoryRange range, CancellationToken ct)
    {
        // Interval literals come from the fixed HistoryRange enum; the symbol is always a named parameter.
        var sql = $"""
            SELECT date_bin(INTERVAL '{Interval(range.Bin())}', time) AS t,
                   last_value(bid ORDER BY time) AS bid,
                   last_value(ask ORDER BY time) AS ask
            FROM quote
            WHERE symbol = $symbol AND time >= now() - INTERVAL '{Interval(range.Duration())}'
            GROUP BY 1
            ORDER BY 1
            """;
        var points = new List<PricePoint>();
        await foreach (var row in QueryRowsAsync(sql, new Dictionary<string, object> { ["symbol"] = symbol }, ct))
        {
            points.Add(new PricePoint(ToTime(row[0]), ToDecimal(row[1]), ToDecimal(row[2])));
        }
        return points;
    }

    private async Task<IReadOnlyDictionary<string, decimal>> QueryChangesAsync(IReadOnlyCollection<string> symbols, CancellationToken ct)
    {
        var result = new Dictionary<string, decimal>();
        if (symbols.Count == 0)
        {
            return result;
        }

        var parameters = symbols.Select((symbol, i) => (Name: $"s{i}", Value: symbol)).ToList();
        var sql = $"""
            SELECT symbol,
                   first_value((bid + ask) / 2 ORDER BY time) AS first_mid,
                   last_value((bid + ask) / 2 ORDER BY time) AS last_mid
            FROM quote
            WHERE symbol IN ({string.Join(", ", parameters.Select(p => "$" + p.Name))}) AND time >= now() - INTERVAL '24 hours'
            GROUP BY symbol
            """;
        var named = parameters.ToDictionary(p => p.Name, p => (object)p.Value);
        await foreach (var row in QueryRowsAsync(sql, named, ct))
        {
            if (HistoryRanges.PercentChange(ToDecimal(row[1]), ToDecimal(row[2])) is { } change)
            {
                result[Convert.ToString(row[0], CultureInfo.InvariantCulture)!] = change;
            }
        }
        return result;
    }

    // InfluxDB creates the quote table on first write; until then a query fails instead of returning no rows.
    private async IAsyncEnumerable<object?[]> QueryRowsAsync(
        string sql, Dictionary<string, object> parameters, [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken ct)
    {
        await using var rows = _client.Query(sql, namedParameters: parameters).WithCancellation(ct).GetAsyncEnumerator();
        while (true)
        {
            try
            {
                if (!await rows.MoveNextAsync())
                {
                    yield break;
                }
            }
            catch (RpcException ex) when (IsMissingQuoteTable(ex))
            {
                yield break;
            }
            yield return rows.Current;
        }
    }

    private static bool IsMissingQuoteTable(RpcException ex) =>
        ex.StatusCode == StatusCode.InvalidArgument && ex.Status.Detail.Contains("table 'public.iox.quote' not found", StringComparison.Ordinal);

    public async Task WriteAsync(IReadOnlyCollection<PriceTick> ticks, CancellationToken ct)
    {
        var points = ticks.Select(t => PointData.Measurement("quote")
            .SetTag("symbol", t.Symbol)
            .SetTag("asset_class", t.AssetClass)
            .SetField("bid", (double)t.Bid)
            .SetField("ask", (double)t.Ask)
            .SetTimestamp(t.Time.UtcDateTime));
        foreach (var batch in points.Chunk(5000))
        {
            await _client.WritePointsAsync(batch, cancellationToken: ct);
        }
        logger.LogDebug("Wrote {Count} price ticks", ticks.Count);
    }

    public void Dispose() => _client.Dispose();

    private static string Interval(TimeSpan span) =>
        span.TotalHours >= 1 && span.TotalHours % 1 == 0 ? $"{(int)span.TotalHours} hours" : $"{(int)span.TotalMinutes} minutes";

    private static decimal ToDecimal(object? value) => Convert.ToDecimal(value, CultureInfo.InvariantCulture);

    private static DateTimeOffset ToTime(object? value) => value switch
    {
        DateTimeOffset dto => dto,
        DateTime dt => new DateTimeOffset(DateTime.SpecifyKind(dt, DateTimeKind.Utc)),
        long ns => DateTimeOffset.UnixEpoch.AddTicks(ns / 100),
        System.Numerics.BigInteger ns => DateTimeOffset.UnixEpoch.AddTicks((long)(ns / 100)),
        _ => throw new InvalidOperationException($"Unexpected time value of type {value?.GetType().Name}"),
    };
}
