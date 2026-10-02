using MarketPulse.IntegrationTests.TestInfrastructure;
using MarketPulse.Infrastructure.Identity;
using MarketPulse.Infrastructure.Identity.External;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace MarketPulse.IntegrationTests.Auth;

public class ExternalLoginProvisionerTests(PostgresApiFactory factory) : IClassFixture<PostgresApiFactory>
{
    [Fact]
    public async Task First_sign_in_provisions_new_user_and_links_login()
    {
        using var scope = factory.Services.CreateScope();
        var provisioner = scope.ServiceProvider.GetRequiredService<ExternalLoginProvisioner>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var email = $"google-{Guid.NewGuid():N}@example.com";
        var details = new ExternalLoginDetails(
            "Google", $"google-key-{Guid.NewGuid():N}", email, "Test User", EmailVerified: true);

        var user = await provisioner.ProvisionOrSignInAsync(details);

        Assert.Equal(email, user.Email);
        var logins = await userManager.GetLoginsAsync(user);
        Assert.Contains(logins, l => l.LoginProvider == "Google" && l.ProviderKey == details.ProviderKey);
    }

    [Fact]
    public async Task Second_sign_in_with_same_external_identity_reuses_user()
    {
        using var scope = factory.Services.CreateScope();
        var provisioner = scope.ServiceProvider.GetRequiredService<ExternalLoginProvisioner>();

        var email = $"google-{Guid.NewGuid():N}@example.com";
        var providerKey = $"google-key-{Guid.NewGuid():N}";
        var details = new ExternalLoginDetails("Google", providerKey, email, "Test User", EmailVerified: true);

        var firstUser = await provisioner.ProvisionOrSignInAsync(details);
        var secondUser = await provisioner.ProvisionOrSignInAsync(details);

        Assert.Equal(firstUser.Id, secondUser.Id);
    }
}
