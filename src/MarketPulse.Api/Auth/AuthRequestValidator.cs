namespace MarketPulse.Api.Auth;

public static class AuthRequestValidator
{
    public static bool IsValid(string? email, string? password)
        => !string.IsNullOrWhiteSpace(email) && email.Contains('@') && !string.IsNullOrWhiteSpace(password);
}
