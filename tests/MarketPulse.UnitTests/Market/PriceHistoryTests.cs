using MarketPulse.Application.Instruments;

namespace MarketPulse.UnitTests.Market;

public class PriceHistoryTests
{
    [Theory]
    [InlineData("1h", HistoryRange.OneHour, 60, 1)]
    [InlineData("24h", HistoryRange.OneDay, 1440, 15)]
    [InlineData("7d", HistoryRange.SevenDays, 10080, 120)]
    [InlineData("30d", HistoryRange.ThirtyDays, 43200, 480)]
    public void Parses_ranges_and_maps_bins(string value, HistoryRange expected, int minutes, int binMinutes)
    {
        Assert.True(HistoryRanges.TryParse(value, out var range));
        Assert.Equal(expected, range);
        Assert.Equal(TimeSpan.FromMinutes(minutes), range.Duration());
        Assert.Equal(TimeSpan.FromMinutes(binMinutes), range.Bin());
        Assert.Equal(value, range.ToQueryValue());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("2d")]
    [InlineData("24H")]
    public void Rejects_unknown_ranges(string? value) => Assert.False(HistoryRanges.TryParse(value, out _));

    [Theory]
    [InlineData(100, 101, 1.00)]
    [InlineData(2, 1, -50.00)]
    [InlineData(1.0713, 1.0713, 0)]
    public void Computes_percent_change(decimal first, decimal last, decimal expected) =>
        Assert.Equal(expected, HistoryRanges.PercentChange(first, last));

    [Fact]
    public void Percent_change_is_null_when_first_is_zero() => Assert.Null(HistoryRanges.PercentChange(0, 5));

    [Fact]
    public async Task Null_store_returns_empty_results()
    {
        var store = new NullPriceHistoryStore();
        Assert.Empty(await store.GetSeriesAsync("EURUSD", HistoryRange.OneDay, default));
        Assert.Empty(await store.GetChanges24hAsync(["EURUSD"], default));
    }
}
