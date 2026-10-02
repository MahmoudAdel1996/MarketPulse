using MarketPulse.Application.Common;
using MarketPulse.Domain.Watchlists;

namespace MarketPulse.UnitTests.Market;

public class ValidationTests
{
    [Theory]
    [InlineData(1, true)]
    [InlineData(0.00000001, true)]
    [InlineData(0, false)]
    [InlineData(-1, false)]
    public void Greater_than_zero_validates_decimals(double value, bool valid)
    {
        Assert.Equal(valid, new GreaterThanZeroAttribute().IsValid((decimal)value));
    }

    [Fact]
    public void Greater_than_zero_ignores_null_and_rejects_unsupported_types()
    {
        var attribute = new GreaterThanZeroAttribute();
        Assert.True(attribute.IsValid(null));
        Assert.False(attribute.IsValid("5"));
    }

    [Fact]
    public void Watchlist_rename_changes_name()
    {
        var watchlist = new Watchlist(Guid.NewGuid(), "Old", DateTimeOffset.UtcNow);
        watchlist.Rename("New");
        Assert.Equal("New", watchlist.Name);
    }
}
