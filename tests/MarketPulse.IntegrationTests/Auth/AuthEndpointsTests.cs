using System.Net;
using System.Net.Http.Json;
using MarketPulse.Api.Auth;
using MarketPulse.IntegrationTests.TestInfrastructure;

namespace MarketPulse.IntegrationTests.Auth;

public class AuthEndpointsTests(PostgresApiFactory factory) : IClassFixture<PostgresApiFactory>
{
    [Fact]
    public async Task Register_then_me_returns_authenticated_user()
    {
        using var client = factory.CreateClient();
        var email = $"user-{Guid.NewGuid():N}@example.com";

        var registerResponse = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest(email, "P@ssword123!"));
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        var meResponse = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);

        var me = await meResponse.Content.ReadFromJsonAsync<MeResponse>();
        Assert.NotNull(me);
        Assert.Equal(email, me!.Email);
        Assert.True(me.HasPassword);
    }

    [Fact]
    public async Task Me_returns_unauthorized_when_anonymous()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/v1/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Duplicate_email_registration_is_rejected()
    {
        using var client = factory.CreateClient();
        var email = $"dup-{Guid.NewGuid():N}@example.com";

        var first = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest(email, "P@ssword123!"));
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest(email, "AnotherP@ss123!"));
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
    }

    [Theory]
    [InlineData("/api/v1/auth/register", "", "P@ssword123!", "Email")]
    [InlineData("/api/v1/auth/register", "userexample.com", "P@ssword123!", "Email")]
    [InlineData("/api/v1/auth/register", "user@example.com", "   ", "Password")]
    [InlineData("/api/v1/auth/login", "", "P@ssword123!", "Email")]
    [InlineData("/api/v1/auth/login", "userexample.com", "P@ssword123!", "Email")]
    [InlineData("/api/v1/auth/login", "user@example.com", "", "Password")]
    public async Task Invalid_request_returns_validation_problem(string url, string email, string password, string invalidField)
    {
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync(url, new { email, password });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains(invalidField, body);
    }

    [Fact]
    public async Task Login_then_logout_clears_session()
    {
        using var client = factory.CreateClient();
        var email = $"login-{Guid.NewGuid():N}@example.com";
        const string password = "P@ssword123!";

        var registerResponse = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest(email, password));
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        var logoutResponse = await client.PostAsync("/api/v1/auth/logout", content: null);
        Assert.Equal(HttpStatusCode.OK, logoutResponse.StatusCode);

        var meAfterLogout = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, meAfterLogout.StatusCode);

        var loginResponse = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, password));
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var meAfterLogin = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.OK, meAfterLogin.StatusCode);
    }
}
