using System.Text.Json.Serialization;
using MarketPulse.Api.Endpoints;
using MarketPulse.Api.Startup;
using MarketPulse.Application;
using MarketPulse.Application.Instruments;
using MarketPulse.Infrastructure;
using MarketPulse.Infrastructure.Identity;
using MarketPulse.Infrastructure.Persistence;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;

DotEnvLoader.Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddValidation();
builder.Services.ConfigureHttpJsonOptions(options =>
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddApplication();

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddIdentityAuthentication(builder.Configuration, builder.Environment);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.MigrateAsync();
    await DevelopmentSeeder.SeedAsync(db, TimeProvider.System);
    try
    {
        var history = scope.ServiceProvider.GetRequiredService<IPriceHistoryStore>();
        await DevelopmentSeeder.SeedHistoryAsync(db, history, TimeProvider.System);
    }
    catch (Exception ex)
    {
        // History is optional; an unreachable InfluxDB must not stop the API.
        app.Logger.LogWarning(ex, "Skipping price history seed: history store unavailable");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarWithGoogleLogin();
}

app.UseHttpsRedirection();
// The UI proxies to the API, so honour its scheme (default trusts loopback proxies only).
// Otherwise OAuth redirect URIs are built as https even when the UI is served over http.
// Runs after UseHttpsRedirection, which must judge the real connection, not the browser's scheme.
app.UseForwardedHeaders(new ForwardedHeadersOptions { ForwardedHeaders = ForwardedHeaders.XForwardedProto });
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapAuthEndpoints();
app.MapInstrumentEndpoints();
app.MapWatchlistEndpoints();
app.MapPriceAlertEndpoints();
app.MapAlertEventEndpoints();

app.Run();

