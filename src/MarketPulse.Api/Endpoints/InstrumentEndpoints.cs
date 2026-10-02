using MarketPulse.Application.Common;
using MarketPulse.Application.Instruments;
using MarketPulse.Domain.Instruments;

namespace MarketPulse.Api.Endpoints;

public static class InstrumentEndpoints
{
    public static RouteGroupBuilder MapInstrumentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/instruments").WithTags("Instruments");

        group.MapGet("/", ListInstruments);
        group.MapGet("/{id:guid}", GetInstrument);

        return group;
    }

    private static async Task<IResult> ListInstruments(
        InstrumentService service,
        string? search,
        AssetClass? assetClass,
        int page = PagedRequest.DefaultPage,
        int pageSize = PagedRequest.DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        var result = await service.ListAsync(
            new InstrumentQuery(search, assetClass), new PagedRequest(page, pageSize), cancellationToken);
        return result.ToHttpResult();
    }

    private static async Task<IResult> GetInstrument(Guid id, InstrumentService service, CancellationToken cancellationToken = default)
    {
        var result = await service.GetAsync(id, cancellationToken);
        return result.ToHttpResult();
    }
}
