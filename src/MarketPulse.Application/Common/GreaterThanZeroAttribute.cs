using System.ComponentModel.DataAnnotations;

namespace MarketPulse.Application.Common;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class GreaterThanZeroAttribute() : ValidationAttribute("{0} must be greater than 0.")
{
    public override bool IsValid(object? value) => value switch
    {
        null => true,
        decimal d => d > 0,
        int i => i > 0,
        long l => l > 0,
        double d => d > 0,
        _ => false,
    };
}
