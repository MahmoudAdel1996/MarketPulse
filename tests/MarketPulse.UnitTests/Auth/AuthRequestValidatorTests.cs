using MarketPulse.Api.Auth;

namespace MarketPulse.UnitTests.Auth;

public class AuthRequestValidatorTests
{
    [Theory]
    [InlineData("user@example.com", "password123", true)]
    [InlineData(null, "password123", false)]
    [InlineData("", "password123", false)]
    [InlineData("   ", "password123", false)]
    [InlineData("userexample.com", "password123", false)]
    [InlineData("user@example.com", null, false)]
    [InlineData("user@example.com", "", false)]
    [InlineData("user@example.com", "   ", false)]
    public void IsValid_returns_expected_result(string? email, string? password, bool expected)
    {
        var result = AuthRequestValidator.IsValid(email, password);

        Assert.Equal(expected, result);
    }
}
