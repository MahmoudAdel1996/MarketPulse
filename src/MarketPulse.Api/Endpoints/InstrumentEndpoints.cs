using MarketPulse.Application.Common;
using MarketPulse.Application.Instruments;
using MarketPulse.Domain.Instruments;

namespace MarketPulse.Api.Endpoints;

public static class InstrumentEndpoints
{
    public static RouteGroupBuilder MapInstrumentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/instruments").WithTags("Instruments");

        group.MapGet("/", async (
            InstrumentService service,
            CancellationToken cancellationToken,
            string? search,
            AssetClass? assetClass,
            int page = PagedRequest.DefaultPage,
            int pageSize = PagedRequest.DefaultPageSize) =>
        {
            var result = await service.ListAsync(
                new InstrumentQuery(search, assetClass), new PagedRequest(page, pageSize), cancellationToken);
            return result.ToHttpResult();
        });

        group.MapGet("/{id:guid}", async (Guid id, InstrumentService service, CancellationToken cancellationToken) =>
            (await service.GetAsync(id, cancellationToken)).ToHttpResult());

        return group;
    }
}
