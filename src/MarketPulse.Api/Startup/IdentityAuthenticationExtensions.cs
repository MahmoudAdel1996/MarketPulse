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
}
