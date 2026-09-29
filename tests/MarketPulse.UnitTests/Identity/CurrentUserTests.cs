using System.Security.Claims;
using MarketPulse.Infrastructure.Identity;
using Microsoft.AspNetCore.Http;

namespace MarketPulse.UnitTests.Identity;

public class CurrentUserTests
{
    [Fact]
    public void Authenticated_user_exposes_id_and_email()
    {
        var userId = Guid.NewGuid();
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, "user@example.com"),
        };
        var identity = new ClaimsIdentity(claims, authenticationType: "TestAuth");
        var accessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };

        var currentUser = new CurrentUser(accessor);

        Assert.True(currentUser.IsAuthenticated);
        Assert.Equal(userId, currentUser.UserId);
        Assert.Equal("user@example.com", currentUser.Email);
    }

    [Fact]
    public void Anonymous_request_exposes_no_identity()
    {
        var accessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext()
        };

        var currentUser = new CurrentUser(accessor);

        Assert.False(currentUser.IsAuthenticated);
        Assert.Null(currentUser.UserId);
        Assert.Null(currentUser.Email);
    }

    [Fact]
    public void No_http_context_exposes_no_identity()
    {
        var accessor = new HttpContextAccessor();

        var currentUser = new CurrentUser(accessor);

        Assert.False(currentUser.IsAuthenticated);
        Assert.Null(currentUser.UserId);
        Assert.Null(currentUser.Email);
    }
}
