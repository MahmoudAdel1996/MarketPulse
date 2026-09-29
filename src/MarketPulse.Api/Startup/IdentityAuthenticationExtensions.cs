using MarketPulse.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Identity;

namespace MarketPulse.Api.Startup;

public static class IdentityAuthenticationExtensions
{
    public static IServiceCollection AddIdentityAuthentication(
        this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment environment)
    {
        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.SignIn.RequireConfirmedAccount = false;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddSignInManager()
            .AddDefaultTokenProviders();

        var authenticationBuilder = services.AddAuthentication(IdentityConstants.ApplicationScheme);
        authenticationBuilder.AddIdentityCookies();
        authenticationBuilder.AddGoogle(GoogleDefaults.AuthenticationScheme, options =>
        {
            options.ClientId = configuration["Authentication:Google:ClientId"] ?? "";
            options.ClientSecret = configuration["Authentication:Google:ClientSecret"] ?? "";
            options.SignInScheme = IdentityConstants.ExternalScheme;
            options.CallbackPath = "/signin-google";
        });

        services.ConfigureApplicationCookie(options =>
        {
            options.Cookie.HttpOnly = true;
            options.Cookie.SameSite = SameSiteMode.Lax;
            options.Cookie.SecurePolicy = environment.IsDevelopment()
                ? CookieSecurePolicy.SameAsRequest
                : CookieSecurePolicy.Always;
            options.Events.OnRedirectToLogin = context =>
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            };
            options.Events.OnRedirectToAccessDenied = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            };
        });

        services.AddAuthorization();

        return services;
    }

    /// <summary>
    /// Fails fast at startup if Google OAuth credentials are missing, rather than
    /// failing lazily on the first request that touches the Google auth handler.
    /// </summary>
    public static WebApplication EnsureGoogleAuthenticationConfigured(this WebApplication app)
    {
        var clientId = app.Configuration["Authentication:Google:ClientId"];
        var clientSecret = app.Configuration["Authentication:Google:ClientSecret"];
        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
        {
            throw new InvalidOperationException(
                "Authentication:Google:ClientId and Authentication:Google:ClientSecret must both be configured.");
        }

        return app;
    }
}
