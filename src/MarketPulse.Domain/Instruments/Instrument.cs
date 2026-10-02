namespace MarketPulse.Domain.Instruments;

public sealed class Instrument
{
    private Instrument()
    {
    }

    public Instrument(string symbol, string name, AssetClass assetClass, string quoteCurrency)
    {
        Id = Guid.NewGuid();
        Symbol = symbol;
        Name = name;
        AssetClass = assetClass;
        QuoteCurrency = quoteCurrency;
    }

    public Guid Id { get; private set; }
    public string Symbol { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public AssetClass AssetClass { get; private set; }
    public string QuoteCurrency { get; private set; } = null!;
    public LatestQuote? LatestQuote { get; private set; }
}
