using InfluxDB3.Client;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace MarketPulse.Infrastructure.History;

public sealed class InfluxHealthCheck(InfluxDbOptions options) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(2));
        try
        {
            // WaitAsync gives up even if the client's connect ignores cancellation.
            await ProbeAsync(timeout.Token).WaitAsync(timeout.Token);
            return HealthCheckResult.Healthy();
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            // Registered as Degraded: history is optional, so the API stays in service.
            return new HealthCheckResult(context.Registration.FailureStatus, "InfluxDB is unreachable.", ex);
        }
    }

    private async Task ProbeAsync(CancellationToken cancellationToken)
    {
        using var client = new InfluxDBClient(
            options.Host,
            token: string.IsNullOrEmpty(options.Token) ? null : options.Token,
            database: options.Database);
        await foreach (var _ in client.Query("SELECT 1").WithCancellation(cancellationToken))
        {
            break;
        }
    }
}
