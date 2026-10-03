using MarketPulse.Application.Instruments;

namespace MarketPulse.Infrastructure.History;

/// <summary>Synthetic price history for development data.</summary>
public static class RandomWalk
{
    private const double MaxStep = 0.003;

    /// <summary>
    /// Walks backwards from the end quote so the newest tick matches it exactly; each forward step moves at most 0.3%.
    /// </summary>
    public static IReadOnlyList<PriceTick> Generate(
        string symbol, string assetClass, decimal endBid, decimal endAsk, DateTimeOffset end, TimeSpan span, TimeSpan step, int seed)
    {
        var random = new Random(seed);
        var spread = endAsk - endBid;
        var count = (int)(span / step) + 1;
        var ticks = new PriceTick[count];
        var bid = endBid;
        for (var i = count - 1; i >= 0; i--)
        {
            ticks[i] = new PriceTick(symbol, assetClass, end - step * (count - 1 - i), bid, bid + spread);
            var move = (decimal)(random.NextDouble() * MaxStep * 2 - MaxStep);
            bid /= 1 + move;
        }
        return ticks;
    }
}
