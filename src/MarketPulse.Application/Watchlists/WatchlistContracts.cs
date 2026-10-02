using System.ComponentModel.DataAnnotations;
using MarketPulse.Application.Instruments;

namespace MarketPulse.Application.Watchlists;

public static class WatchlistRules
{
    public const int MaxNameLength = 100;
}

public sealed record CreateWatchlistRequest([Required, StringLength(WatchlistRules.MaxNameLength)] string Name);

public sealed record RenameWatchlistRequest([Required, StringLength(WatchlistRules.MaxNameLength)] string Name);

public sealed record AddWatchlistInstrumentRequest(Guid InstrumentId);

public sealed record WatchlistSummaryResponse(Guid Id, string Name, DateTimeOffset CreatedAt, int InstrumentCount);

public sealed record WatchlistItemResponse(InstrumentResponse Instrument, DateTimeOffset AddedAt);

public sealed record WatchlistResponse(Guid Id, string Name, DateTimeOffset CreatedAt, IReadOnlyList<WatchlistItemResponse> Instruments);
