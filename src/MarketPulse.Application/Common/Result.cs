namespace MarketPulse.Application.Common;

public enum ResultStatus
{
    Ok,
    NotFound,
    Invalid,
    Unavailable,
}

public class Result
{
    private static readonly IReadOnlyDictionary<string, string[]> NoErrors = new Dictionary<string, string[]>();

    protected Result(ResultStatus status, IReadOnlyDictionary<string, string[]>? errors)
    {
        Status = status;
        Errors = errors ?? NoErrors;
    }

    public ResultStatus Status { get; }

    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public static Result Ok() => new(ResultStatus.Ok, null);

    public static Result NotFound() => new(ResultStatus.NotFound, null);

    public static Result Invalid(IReadOnlyDictionary<string, string[]> errors) => new(ResultStatus.Invalid, errors);

    public static Result Unavailable() => new(ResultStatus.Unavailable, null);
}

public sealed class Result<T> : Result
{
    private Result(ResultStatus status, T? value, IReadOnlyDictionary<string, string[]>? errors)
        : base(status, errors)
    {
        Value = value;
    }

    public T? Value { get; }

    public static Result<T> Ok(T value) => new(ResultStatus.Ok, value, null);

    public static new Result<T> NotFound() => new(ResultStatus.NotFound, default, null);

    public static new Result<T> Invalid(IReadOnlyDictionary<string, string[]> errors) => new(ResultStatus.Invalid, default, errors);

    public static new Result<T> Unavailable() => new(ResultStatus.Unavailable, default, null);
}
