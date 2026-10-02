using MarketPulse.Application.Instruments;

namespace MarketPulse.Application.Watchlists;

public sealed record CreateWatchlistRequest(string Name);

public sealed record RenameWatchlistRequest(string Name);

public sealed record AddWatchlistInstrumentRequest(Guid InstrumentId);

public sealed record WatchlistSummaryResponse(Guid Id, string Name, DateTimeOffset CreatedAt, int InstrumentCount);

public sealed record WatchlistItemResponse(InstrumentResponse Instrument, DateTimeOffset AddedAt);

public sealed record WatchlistResponse(Guid Id, string Name, DateTimeOffset CreatedAt, IReadOnlyList<WatchlistItemResponse> Instruments);
