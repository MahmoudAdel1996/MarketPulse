using MarketPulse.Infrastructure.History;

namespace MarketPulse.UnitTests.Market;

public class RandomWalkTests
{
    [Fact]
    public void Ends_at_the_current_quote_and_stays_positive_and_smooth()
    {
        var end = new DateTimeOffset(2026, 10, 3, 12, 0, 0, TimeSpan.Zero);
        var ticks = RandomWalk.Generate("SHIBUSD", "Crypto", 0.00001734m, 0.00001736m, end, TimeSpan.FromDays(1), TimeSpan.FromMinutes(5), seed: 42);

        Assert.Equal(289, ticks.Count);
        Assert.Equal(end, ticks[^1].Time);
        Assert.Equal(0.00001734m, ticks[^1].Bid);
        Assert.Equal(0.00001736m, ticks[^1].Ask);
        Assert.All(ticks, t => Assert.True(t.Bid > 0 && t.Ask > t.Bid));
        Assert.All(ticks.Zip(ticks.Skip(1)), p => Assert.True(Math.Abs(p.Second.Bid / p.First.Bid - 1) <= 0.0031m));
        Assert.Equal(ticks.OrderBy(t => t.Time), ticks);
    }

    [Fact]
    public void Is_deterministic_for_a_seed()
    {
        var end = DateTimeOffset.UnixEpoch.AddDays(1000);
        var a = RandomWalk.Generate("X", "Forex", 1m, 1.1m, end, TimeSpan.FromHours(1), TimeSpan.FromMinutes(5), seed: 7);
        var b = RandomWalk.Generate("X", "Forex", 1m, 1.1m, end, TimeSpan.FromHours(1), TimeSpan.FromMinutes(5), seed: 7);
        Assert.Equal(a, b);
    }
}
