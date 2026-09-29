namespace MarketPulse.Application.Auth;

public static class RedirectUrlValidator
{
    public static string SafeOrDefault(string? returnUrl, IReadOnlyCollection<string> allowedOrigins, string defaultUrl)
    {
        if (string.IsNullOrWhiteSpace(returnUrl))
        {
            return defaultUrl;
        }

        if (!Uri.TryCreate(returnUrl, UriKind.Absolute, out var uri))
        {
            return defaultUrl;
        }

        var origin = uri.GetLeftPart(UriPartial.Authority);
        return allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase)
            ? returnUrl
            : defaultUrl;
    }
}
