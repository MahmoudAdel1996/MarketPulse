using MarketPulse.Infrastructure.Identity;
using MarketPulse.Infrastructure.Persistence;
using MarketPulse.IntegrationTests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MarketPulse.IntegrationTests.Market;

public class DevelopmentSeederTests(PostgresApiFactory factory) : IClassFixture<PostgresApiFactory>
{
    [Fact]
    public async Task Seeding_is_idempotent_and_creates_quotes()
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        await DevelopmentSeeder.SeedAsync(db, TimeProvider.System);
        var firstCount = await db.Instruments.CountAsync(i => i.Symbol == "EURUSD" || i.Symbol == "SHIBUSD");
        await DevelopmentSeeder.SeedAsync(db, TimeProvider.System);
        var secondCount = await db.Instruments.CountAsync(i => i.Symbol == "EURUSD" || i.Symbol == "SHIBUSD");

        Assert.Equal(2, firstCount);
        Assert.Equal(firstCount, secondCount);
        var shib = await db.Instruments.Include(i => i.LatestQuote).SingleAsync(i => i.Symbol == "SHIBUSD");
        Assert.Equal(0.00001734m, shib.LatestQuote!.Bid);
    }
}
