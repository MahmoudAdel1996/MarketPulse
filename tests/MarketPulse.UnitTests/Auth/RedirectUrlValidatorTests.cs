using MarketPulse.Application.Auth;

namespace MarketPulse.UnitTests.Auth;

public class RedirectUrlValidatorTests
{
    private static readonly string[] AllowedOrigins = ["http://localhost:4200"];
    private const string DefaultUrl = "http://localhost:4200";

    [Fact]
    public void Allowed_origin_is_returned_unchanged()
    {
        var result = RedirectUrlValidator.SafeOrDefault("http://localhost:4200/dashboard", AllowedOrigins, DefaultUrl);
        Assert.Equal("http://localhost:4200/dashboard", result);
    }

    [Fact]
    public void Disallowed_origin_falls_back_to_default()
    {
        var result = RedirectUrlValidator.SafeOrDefault("https://evil.example.com/steal", AllowedOrigins, DefaultUrl);
        Assert.Equal(DefaultUrl, result);
    }

    [Fact]
    public void Null_or_whitespace_returns_default()
    {
        Assert.Equal(DefaultUrl, RedirectUrlValidator.SafeOrDefault(null, AllowedOrigins, DefaultUrl));
        Assert.Equal(DefaultUrl, RedirectUrlValidator.SafeOrDefault("   ", AllowedOrigins, DefaultUrl));
    }

    [Fact]
    public void Malformed_url_returns_default()
    {
        var result = RedirectUrlValidator.SafeOrDefault("not a url", AllowedOrigins, DefaultUrl);
        Assert.Equal(DefaultUrl, result);
    }
}
