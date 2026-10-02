using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace MarketPulse.Application.Common;

public sealed record PagedRequest(
    [Range(1, int.MaxValue)] int Page = PagedRequest.DefaultPage,
    [Range(1, PagedRequest.MaxPageSize)] int PageSize = PagedRequest.DefaultPageSize)
{
    public const int DefaultPage = 1;
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;
}

public sealed record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount);

public static class PagingExtensions
{
    public static async Task<PagedResponse<T>> ToPagedResponseAsync<T>(
        this IQueryable<T> query, PagedRequest paging, CancellationToken cancellationToken)
    {
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip((paging.Page - 1) * paging.PageSize)
            .Take(paging.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResponse<T>(items, paging.Page, paging.PageSize, totalCount);
    }
}
