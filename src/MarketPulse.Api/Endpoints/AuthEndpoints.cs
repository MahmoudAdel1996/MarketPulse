using System.Security.Claims;
using MarketPulse.Api.Auth;
using MarketPulse.Application.Auth;
using MarketPulse.Infrastructure.Identity;
using MarketPulse.Infrastructure.Identity.External;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;

namespace MarketPulse.Api.Endpoints;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth").WithTags("Auth");

        group.MapPost("/register", Register);
        group.MapPost("/login", Login);
        group.MapPost("/logout", Logout);
        group.MapGet("/me", GetCurrentUser).RequireAuthorization();
        group.MapGet("/google/login", GoogleLogin);
        group.MapGet("/google/callback", GoogleCallback).WithName("google-callback");

        return group;
    }

    private static async Task<IResult> Register(
        RegisterRequest request,
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager)
    {
        var user = new ApplicationUser { UserName = request.Email, Email = request.Email };
        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return Results.ValidationProblem(
                result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description }));
        }

        await signInManager.SignInAsync(user, isPersistent: false);
        return Results.Ok();
    }

    private static async Task<IResult> Login(
        LoginRequest request,
        SignInManager<ApplicationUser> signInManager)
    {
        var result = await signInManager.PasswordSignInAsync(
            request.Email, request.Password, isPersistent: false, lockoutOnFailure: false);
        return result.Succeeded ? Results.Ok() : Results.Unauthorized();
    }

    private static async Task<IResult> Logout(SignInManager<ApplicationUser> signInManager)
    {
        await signInManager.SignOutAsync();
        return Results.Ok();
    }

    private static async Task<IResult> GetCurrentUser(
        ClaimsPrincipal principal,
        UserManager<ApplicationUser> userManager)
    {
        var user = await userManager.GetUserAsync(principal);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        var logins = await userManager.GetLoginsAsync(user);
        var hasPassword = await userManager.HasPasswordAsync(user);

        return Results.Ok(new MeResponse(
            user.Id,
            user.Email!,
            hasPassword,
            logins.Select(l => l.LoginProvider).ToArray()));
    }

    private static IResult GoogleLogin(
        SignInManager<ApplicationUser> signInManager,
        IConfiguration configuration,
        LinkGenerator linkGenerator,
        HttpContext httpContext,
        string? returnUrl)
    {
        var (allowedOrigins, defaultReturnUrl) = ReadReturnUrlConfig(configuration);
        var safeReturnUrl = RedirectUrlValidator.SafeOrDefault(returnUrl, allowedOrigins, defaultReturnUrl);

        var callbackUrl = linkGenerator.GetUriByName(httpContext, "google-callback")
            ?? throw new InvalidOperationException("google-callback route is not registered.");

        var properties = signInManager.ConfigureExternalAuthenticationProperties(
            GoogleDefaults.AuthenticationScheme, callbackUrl);
        properties.Items["returnUrl"] = safeReturnUrl;

        return Results.Challenge(properties, [GoogleDefaults.AuthenticationScheme]);
    }

    private static async Task<IResult> GoogleCallback(
        SignInManager<ApplicationUser> signInManager,
        ExternalLoginProvisioner provisioner,
        IConfiguration configuration,
        HttpContext httpContext)
    {
        var (allowedOrigins, defaultReturnUrl) = ReadReturnUrlConfig(configuration);

        var info = await signInManager.GetExternalLoginInfoAsync();
        if (info is null)
        {
            return Results.Redirect(QueryHelpers.AddQueryString(defaultReturnUrl, "error", "external_login_failed"));
        }

        var storedReturnUrl = info.AuthenticationProperties is not null
            && info.AuthenticationProperties.Items.TryGetValue("returnUrl", out var value)
                ? value
                : null;
        var returnUrl = RedirectUrlValidator.SafeOrDefault(storedReturnUrl, allowedOrigins, defaultReturnUrl);

        var email = info.Principal.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrEmpty(email))
        {
            return Results.Redirect(QueryHelpers.AddQueryString(returnUrl, "error", "missing_email"));
        }

        var emailVerified = bool.TryParse(info.Principal.FindFirstValue("email_verified"), out var parsedEmailVerified)
            && parsedEmailVerified;

        var details = new ExternalLoginDetails(
            info.LoginProvider, info.ProviderKey, email, info.ProviderDisplayName ?? email, emailVerified);

        ApplicationUser user;
        try
        {
            user = await provisioner.ProvisionOrSignInAsync(details);
        }
        catch (InvalidOperationException)
        {
            return Results.Redirect(QueryHelpers.AddQueryString(returnUrl, "error", "account_link_failed"));
        }

        await signInManager.SignInAsync(user, isPersistent: false);
        await httpContext.SignOutAsync(IdentityConstants.ExternalScheme);
        return Results.Redirect(returnUrl);
    }

    private static (string[] AllowedOrigins, string DefaultReturnUrl) ReadReturnUrlConfig(IConfiguration configuration)
    {
        var allowedOrigins = configuration.GetSection("Auth:AllowedReturnUrls").Get<string[]>() ?? [];
        var defaultReturnUrl = configuration["Auth:DefaultReturnUrl"] ?? allowedOrigins.FirstOrDefault() ?? "/";
        return (allowedOrigins, defaultReturnUrl);
    }
}
