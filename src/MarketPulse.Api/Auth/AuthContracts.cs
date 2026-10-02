using System.ComponentModel.DataAnnotations;

namespace MarketPulse.Api.Auth;

public sealed record RegisterRequest([Required, EmailAddress] string Email, [Required] string Password);

public sealed record LoginRequest([Required, EmailAddress] string Email, [Required] string Password);

public sealed record MeResponse(Guid Id, string Email, bool HasPassword, IReadOnlyCollection<string> ExternalLogins);
