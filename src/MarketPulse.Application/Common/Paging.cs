using Microsoft.EntityFrameworkCore;

namespace MarketPulse.Application.Common;

public sealed record PagedRequest(int Page = PagedRequest.DefaultPage, int PageSize = PagedRequest.DefaultPageSize)
{
    public const int DefaultPage = 1;
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    public Dictionary<string, string[]> Validate()
    {
        var errors = new Dictionary<string, string[]>();
        if (Page < 1)
        {
            errors[nameof(Page)] = ["Page must be greater than or equal to 1."];
        }

        if (PageSize is < 1 or > MaxPageSize)
        {
            errors[nameof(PageSize)] = [$"PageSize must be between 1 and {MaxPageSize}."];
        }

        return errors;
    }
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
