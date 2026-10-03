namespace MarketPulse.Infrastructure.History;

public sealed class InfluxDbOptions
{
    public const string SectionName = "InfluxDb";

    public string Host { get; set; } = "";
    public string Database { get; set; } = "";
    public string Token { get; set; } = "";

    /// <summary>Only for servers started with --without-auth (tests).</summary>
    public bool AllowAnonymous { get; set; }

    public bool IsEnabled =>
        !string.IsNullOrWhiteSpace(Host)
        && !string.IsNullOrWhiteSpace(Database)
        && (AllowAnonymous || !string.IsNullOrWhiteSpace(Token));
}
