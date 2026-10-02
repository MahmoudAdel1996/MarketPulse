using MarketPulse.Application.Common;

namespace MarketPulse.Api.Endpoints;

internal static class ResultExtensions
{
    public static IResult ToHttpResult(this Result result) => result.Status switch
    {
        ResultStatus.Ok => Results.NoContent(),
        _ => ToFailure(result),
    };

    public static IResult ToHttpResult<T>(this Result<T> result) => result.Status switch
    {
        ResultStatus.Ok => Results.Ok(result.Value),
        _ => ToFailure(result),
    };

    public static IResult ToCreatedResult<T>(this Result<T> result, Func<T, string> location) => result.Status switch
    {
        ResultStatus.Ok => Results.Created(location(result.Value!), result.Value),
        _ => ToFailure(result),
    };

    private static IResult ToFailure(Result result) => result.Status switch
    {
        ResultStatus.NotFound => Results.NotFound(),
        ResultStatus.Invalid => Results.ValidationProblem(result.Errors),
        _ => throw new InvalidOperationException($"Unexpected result status {result.Status}."),
    };
}
