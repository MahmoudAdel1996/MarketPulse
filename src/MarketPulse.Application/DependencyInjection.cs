using MarketPulse.Application.Alerts;
using MarketPulse.Application.Instruments;
using MarketPulse.Application.Watchlists;
using Microsoft.Extensions.DependencyInjection;

namespace MarketPulse.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<InstrumentService>();
        services.AddScoped<WatchlistService>();
        services.AddScoped<PriceAlertService>();
        services.AddScoped<AlertEventService>();

        return services;
    }
}
