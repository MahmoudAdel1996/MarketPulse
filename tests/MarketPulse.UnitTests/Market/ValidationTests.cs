using MarketPulse.Application.Alerts;
using MarketPulse.Application.Common;
using MarketPulse.Application.Watchlists;
using MarketPulse.Domain.Alerts;
using MarketPulse.Domain.Watchlists;

namespace MarketPulse.UnitTests.Market;

public class ValidationTests
{
    [Theory]
    [InlineData(1, 1, true)]
    [InlineData(1, 100, true)]
    [InlineData(0, 20, false)]
    [InlineData(1, 0, false)]
    [InlineData(1, 101, false)]
    public void Paged_request_validates_bounds(int page, int pageSize, bool valid)
    {
        Assert.Equal(valid, new PagedRequest(page, pageSize).Validate().Count == 0);
    }

    [Theory]
    [InlineData("Majors", true)]
    [InlineData("", false)]
    [InlineData("   ", false)]
    [InlineData(null, false)]
    public void Watchlist_name_is_required(string? name, bool valid)
    {
        Assert.Equal(valid, WatchlistService.ValidateName(name).Count == 0);
    }

    [Fact]
    public void Watchlist_name_longer_than_max_is_rejected()
    {
        Assert.Contains("Name", WatchlistService.ValidateName(new string('a', WatchlistService.MaxNameLength + 1)).Keys);
        Assert.Empty(WatchlistService.ValidateName(new string('a', WatchlistService.MaxNameLength)));
    }

    [Theory]
    [InlineData(1, true)]
    [InlineData(0, false)]
    [InlineData(-1, false)]
    public void Price_alert_threshold_must_be_positive(decimal threshold, bool valid)
    {
        var request = new CreatePriceAlertRequest(Guid.NewGuid(), PriceSide.Bid, AlertDirection.Above, threshold);
        Assert.Equal(valid, PriceAlertService.Validate(request).Count == 0);
    }

    [Fact]
    public void Price_alert_rejects_undefined_enum_values()
    {
        var request = new CreatePriceAlertRequest(Guid.NewGuid(), (PriceSide)42, (AlertDirection)42, 1m);
        var errors = PriceAlertService.Validate(request);
        Assert.Contains("PriceSide", errors.Keys);
        Assert.Contains("Direction", errors.Keys);
    }

    [Fact]
    public void Watchlist_rename_changes_name()
    {
        var watchlist = new Watchlist(Guid.NewGuid(), "Old", DateTimeOffset.UtcNow);
        watchlist.Rename("New");
        Assert.Equal("New", watchlist.Name);
    }
}
