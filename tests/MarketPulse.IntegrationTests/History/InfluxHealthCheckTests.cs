using MarketPulse.Infrastructure.History;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace MarketPulse.IntegrationTests.History;

public class InfluxHealthCheckTests
{
    [Fact]
    public async Task Reports_failure_quickly_when_influx_does_not_answer()
    {
        // 10.255.255.1 is a non-routable address: connections hang rather than being refused.
        var check = new InfluxHealthCheck(new InfluxDbOptions { Host = "http://10.255.255.1:8181", Database = "x", Token = "t" });
        var registration = new HealthCheckRegistration("influxdb", check, HealthStatus.Degraded, null);

        var watch = System.Diagnostics.Stopwatch.StartNew();
        var result = await check.CheckHealthAsync(new HealthCheckContext { Registration = registration });

        Assert.Equal(HealthStatus.Degraded, result.Status);
        Assert.True(watch.Elapsed < TimeSpan.FromSeconds(5), $"took {watch.Elapsed}");
    }
}
