# Market Endpoints Design

**Date:** 2026-10-02
**Status:** Approved for planning

## Goal

Expose the market domain (Instruments, Watchlists, Price Alerts, Alert Events) over HTTP so the UI can browse instruments, manage per-user watchlists and price alerts, and review triggered alert history.

## Scope

In scope:
- Instruments: read-only catalog with search, filtering, paging, and latest quote.
- Watchlists: per-user CRUD plus add/remove instruments.
- Price alerts: per-user create/list/get/enable/disable/delete.
- Alert events: per-user read-only history including notification deliveries.

Out of scope:
- Creating/editing instruments via API (catalog is fed by the Worker/seed).
- Alert evaluation logic in the Worker.
- Real-time quote push (SignalR etc.).

## Architecture

### Application layer (`src/MarketPulse.Application`)

Feature folders `Instruments/`, `Watchlists/`, `Alerts/`, plus `Common/`:

- `Common/IApplicationDbContext` — port exposing `DbSet<Instrument> Instruments`, `DbSet<LatestQuote> LatestQuotes`, `DbSet<Watchlist> Watchlists`, `DbSet<PriceAlert> PriceAlerts`, `DbSet<AlertEvent> AlertEvents`, `DbSet<NotificationDelivery> NotificationDeliveries`, and `Task<int> SaveChangesAsync(CancellationToken)`. Application takes a dependency on `Microsoft.EntityFrameworkCore` (abstractions only; no provider).
- `Common/PagedRequest(int Page = 1, int PageSize = 20)` and `Common/PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)`, with a shared `ToPagedResponseAsync` extension on `IQueryable<T>`.
- `Common/Result` / `Result<T>` — outcome type with three states: `Ok(value)`, `NotFound`, `Validation(IDictionary<string, string[]> errors)`.
- Services (scoped, registered via an `AddApplication()` extension):
  - `InstrumentService` — `ListAsync(InstrumentQuery, ct)`, `GetAsync(id, ct)`.
  - `WatchlistService` — list, get, create, rename, delete, add instrument, remove instrument.
  - `PriceAlertService` — list, get, create, enable, disable, delete.
  - `AlertEventService` — list, get.
- Request/response DTOs live next to their service (e.g. `Watchlists/WatchlistContracts.cs`).

Services set `UserId` from `ICurrentUser` on create; never from the request body.

### Domain changes

- `Watchlist.Rename(string name)`.

### Infrastructure (`src/MarketPulse.Infrastructure`)

- `ApplicationDbContext` implements `IApplicationDbContext` and receives `ICurrentUser` via constructor.
- An `ICurrentUser` implementation backed by `IHttpContextAccessor` for the Api (reuse if one already exists).
- A system `ICurrentUser` (`UserId = null`, not authenticated) registered by the Worker.

### Ownership: global query filters

Registered in `ApplicationDbContext.OnModelCreating`:

- `Watchlist`: `w => w.UserId == CurrentUserId`
- `PriceAlert`: `a => a.UserId == CurrentUserId`
- `AlertEvent`: `e => PriceAlerts.Any(a => a.Id == e.PriceAlertId)` (composes with the `PriceAlert` filter)
- `NotificationDelivery`: `d => AlertEvents.Any(e => e.Id == d.AlertEventId)`

`CurrentUserId` is a context property reading `ICurrentUser.UserId`, so EF evaluates it per context instance.

A null `UserId` matches nothing (fails closed). Background/system code that legitimately needs all rows (Worker) must call `.IgnoreQueryFilters()` explicitly.

Consequence: another user's resource is indistinguishable from a missing one → **404**.

### Api (`src/MarketPulse.Api`)

- `Endpoints/InstrumentEndpoints.cs`, `WatchlistEndpoints.cs`, `PriceAlertEndpoints.cs`, `AlertEventEndpoints.cs`, each a `Map...Endpoints(this IEndpointRouteBuilder)` extension mapped in `Program.cs`.
- Endpoints are thin: bind request, call service, map `Result` → HTTP via a shared `ResultExtensions.ToHttpResult()`.
- Groups other than instruments use `.RequireAuthorization()`.
- Enums serialize as strings: `JsonStringEnumConverter` configured globally via `ConfigureHttpJsonOptions`.

## Endpoints

### Instruments — `/api/v1/instruments` (anonymous)

| Method | Route | Behavior |
|---|---|---|
| GET | `/` | Query: `search` (case-insensitive contains on symbol or name), `assetClass`, `page`, `pageSize`. Returns `PagedResponse<InstrumentResponse>`, ordered by symbol. |
| GET | `/{id:guid}` | `InstrumentResponse` or 404. |

`InstrumentResponse(Guid Id, string Symbol, string Name, AssetClass AssetClass, string QuoteCurrency, QuoteResponse? LatestQuote)`
`QuoteResponse(decimal Bid, decimal Ask, DateTimeOffset UpdatedAt, string Source, QuoteFreshness Freshness)`

### Watchlists — `/api/v1/watchlists` (authenticated)

| Method | Route | Behavior |
|---|---|---|
| GET | `/` | Paged `WatchlistSummaryResponse(Id, Name, CreatedAt, InstrumentCount)`, ordered by `CreatedAt` desc. |
| GET | `/{id:guid}` | `WatchlistResponse(Id, Name, CreatedAt, IReadOnlyList<WatchlistItemResponse> Instruments)`; each item is `(InstrumentResponse Instrument, DateTimeOffset AddedAt)`. 404 if not found. |
| POST | `/` | Body `CreateWatchlistRequest(string Name)`. 201 + Location `/api/v1/watchlists/{id}` + `WatchlistResponse`. |
| PUT | `/{id:guid}` | Body `RenameWatchlistRequest(string Name)`. 204 / 404. |
| DELETE | `/{id:guid}` | 204 / 404. |
| POST | `/{id:guid}/instruments` | Body `AddWatchlistInstrumentRequest(Guid InstrumentId)`. 204; idempotent. 404 if watchlist or instrument not found. |
| DELETE | `/{id:guid}/instruments/{instrumentId:guid}` | 204 (idempotent) / 404 if watchlist not found. |

### Price alerts — `/api/v1/alerts` (authenticated)

| Method | Route | Behavior |
|---|---|---|
| GET | `/` | Query: `instrumentId`, `isEnabled`, paging. Paged `PriceAlertResponse`, ordered by `CreatedAt` desc. |
| GET | `/{id:guid}` | `PriceAlertResponse` or 404. |
| POST | `/` | Body `CreatePriceAlertRequest(Guid InstrumentId, PriceSide PriceSide, AlertDirection Direction, decimal Threshold)`. 201 + Location. 404 if instrument not found. |
| POST | `/{id:guid}/enable` | 204 / 404. |
| POST | `/{id:guid}/disable` | 204 / 404. |
| DELETE | `/{id:guid}` | 204 / 404. |

`PriceAlertResponse(Guid Id, Guid InstrumentId, string Symbol, PriceSide PriceSide, AlertDirection Direction, decimal Threshold, bool IsEnabled, DateTimeOffset CreatedAt)`

### Alert events — `/api/v1/alert-events` (authenticated, read-only)

| Method | Route | Behavior |
|---|---|---|
| GET | `/` | Query: `alertId`, `status`, paging. Paged `AlertEventResponse`, ordered by `TriggeredAt` desc. |
| GET | `/{id:guid}` | `AlertEventResponse` or 404. |

`AlertEventResponse(Guid Id, Guid PriceAlertId, decimal ObservedPrice, DateTimeOffset TriggeredAt, AlertEventStatus Status, IReadOnlyList<DeliveryResponse> Deliveries)`
`DeliveryResponse(NotificationChannel Channel, DeliveryStatus Status, int AttemptCount, DateTimeOffset? SentAt)`

## Validation and errors

Validation runs in Application services and returns `Result.Validation`, mapped to `Results.ValidationProblem` (400), consistent with the auth endpoints.

| Field | Rule |
|---|---|
| Watchlist `Name` | Required, trimmed, 1–100 chars (matches column length). |
| `Threshold` | > 0. |
| Enum fields (`PriceSide`, `Direction`, `AssetClass`, `Status` filters) | Must be a defined value (`Enum.IsDefined`); unknown strings fail JSON/query binding → 400. |
| `page` | ≥ 1. |
| `pageSize` | 1–100; default 20. |

Status code summary: 200 / 201 / 204 on success; 400 validation; 401 anonymous on protected routes; 404 missing or not owned.

## Testing

- **Unit tests** (`tests/MarketPulse.UnitTests`): validation rules, paging math, `Watchlist.Rename`.
- **Integration tests** (`tests/MarketPulse.IntegrationTests`, using existing `PostgresApiFactory`), one class per endpoint group:
  - Happy path for every endpoint.
  - Cross-user isolation: user B gets 404 on user A's watchlist, alert, and alert event, and B's lists never include A's rows.
  - Anonymous → 401 on protected groups; instruments readable anonymously.
  - Paging metadata (`TotalCount`, `Page`, `PageSize`) and `pageSize` > 100 → 400.
  - Instruments, quotes, and alert events seeded directly via the DbContext (with `IgnoreQueryFilters` where needed).

## Self-review notes

- Ownership is enforced in exactly one place (query filters); services never add manual `UserId` checks for reads.
- `NotificationDelivery` filter added beyond the chat design so deliveries can't be reached around the event filter.
- Fail-closed null user is an explicit decision; Worker must opt out via `IgnoreQueryFilters()`.
