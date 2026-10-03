using MarketPulse.Application.Auth;
using MarketPulse.Application.Common;
using MarketPulse.Application.Instruments;
using MarketPulse.Infrastructure.History;
using MarketPulse.Infrastructure.Identity;
using MarketPulse.Infrastructure.Identity.External;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace MarketPulse.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("Postgres")));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddScoped<ExternalLoginProvisioner>();

        var influx = configuration.GetSection(InfluxDbOptions.SectionName).Get<InfluxDbOptions>() ?? new InfluxDbOptions();
        if (influx.IsEnabled)
        {
            services.AddSingleton(influx);
            services.AddSingleton<IPriceHistoryStore, InfluxPriceHistoryStore>();
            services.AddHealthChecks().AddCheck<InfluxHealthCheck>("influxdb", failureStatus: HealthStatus.Degraded);
        }
        else
        {
            services.AddSingleton<IPriceHistoryStore, NullPriceHistoryStore>();
            services.AddHealthChecks();
        }

        return services;
    }
}
