namespace MegaERP.Shared.Core.Models;

public sealed class Result<T>
{
    public bool IsSuccess { get; }
    public T? Value { get; }
    public string? Error { get; }
    public string? ErrorCode { get; }

    private Result(bool success, T? value, string? error, string? errorCode)
    {
        IsSuccess = success;
        Value = value;
        Error = error;
        ErrorCode = errorCode;
    }

    public static Result<T> Success(T value) => new(true, value, null, null);
    public static Result<T> Failure(string error, string? errorCode = null) => new(false, default, error, errorCode);

    public static implicit operator Result<T>(T value) => Success(value);
}

public sealed class Result
{
    public bool IsSuccess { get; }
    public string? Error { get; }
    public string? ErrorCode { get; }

    private Result(bool success, string? error, string? errorCode)
    {
        IsSuccess = success;
        Error = error;
        ErrorCode = errorCode;
    }

    public static Result Success() => new(true, null, null);
    public static Result Failure(string error, string? errorCode = null) => new(false, error, errorCode);
}
