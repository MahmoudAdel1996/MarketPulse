using MarketPulse.Api.Endpoints;
using MarketPulse.Api.Startup;
using MarketPulse.Infrastructure;

DotEnvLoader.Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddValidation();

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddIdentityAuthentication(builder.Configuration, builder.Environment);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarWithGoogleLogin();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();

app.Run();

