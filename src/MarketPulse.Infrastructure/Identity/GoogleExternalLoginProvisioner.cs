using Microsoft.AspNetCore.Identity;

namespace MarketPulse.Infrastructure.Identity;

public sealed record ExternalLoginDetails(
    string Provider, string ProviderKey, string Email, string DisplayName, bool EmailVerified);

public sealed class GoogleExternalLoginProvisioner(UserManager<ApplicationUser> userManager)
{
    public async Task<ApplicationUser> ProvisionOrSignInAsync(
        ExternalLoginDetails details, CancellationToken cancellationToken = default)
    {
        var existingUser = await userManager.FindByLoginAsync(details.Provider, details.ProviderKey);
        if (existingUser is not null)
        {
            return existingUser;
        }

        var user = await userManager.FindByEmailAsync(details.Email);
        if (user is not null)
        {
            if (!details.EmailVerified || !user.EmailConfirmed)
            {
                throw new InvalidOperationException(
                    "Cannot link Google account: an existing account with this email is not verified.");
            }
        }
        else
        {
            user = new ApplicationUser
            {
                UserName = details.Email,
                Email = details.Email,
                EmailConfirmed = true,
            };

            var createResult = await userManager.CreateAsync(user);
            if (!createResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to provision user for {details.Email}: {string.Join(", ", createResult.Errors.Select(e => e.Description))}");
            }
        }

        var addLoginResult = await userManager.AddLoginAsync(
            user, new UserLoginInfo(details.Provider, details.ProviderKey, details.DisplayName));
        if (!addLoginResult.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to link external login for {details.Email}: {string.Join(", ", addLoginResult.Errors.Select(e => e.Description))}");
        }

        return user;
    }
}
