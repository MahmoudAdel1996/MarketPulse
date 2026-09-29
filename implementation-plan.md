# MarketPulse Live Prices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first backend slice that simulates gold and silver bid/ask ticks, persists every tick, serves historical chart data, and streams each live tick to public clients.

**Architecture:** Use the agreed modular .NET solution. A simulator implements the same feed interface intended for a future licensed provider; an ingestion worker publishes normalized events through a broker; consumers persist raw ticks and the latest quote in a time-series store; ASP.NET Core serves history and broadcasts live updates through SignalR. This plan covers the price pipeline only; authentication and alert evaluation are separate follow-up plans.

**Tech Stack:** .NET 10, ASP.NET Core, Worker Service, PostgreSQL, a selected time-series database, a selected Kafka-compatible broker, SignalR, xUnit, Docker Compose for local dependencies.

**Spec:** [2026-09-29-marketpulse-backend-design.md](../specs/2026-09-29-marketpulse-backend-design.md)

## Global Constraints

- “Initial instruments: gold and silver only.”
- “Initial currency: USD only; no SAR or other currency conversion in the first release.”
- “Update behavior: tick-by-tick from the selected feed.”
- “Feed for development: simulator using the production feed/event path.”
- “Quote fields: preserve and display bid and ask; do not calculate midpoint.”
- “Historical charts: 1-day, 1-week, 1-year, and custom date/time ranges; chart responses may use aggregates for broad ranges while raw ticks remain available for drill-down.”
- “A separate time-series database stores all raw ticks received, without a planned retention expiry.”
- “PostgreSQL stores relational data and remains the source of truth for alerts and their lifecycle state.”
- Do not claim five-million-concurrent-user capacity until representative end-to-end load tests demonstrate it.
- The production provider must explicitly permit the intended public display and redistribution; this plan uses simulated data only.

## Review Focus

- **Bid/ask integrity:** Reject invalid or non-positive quotes and preserve bid and ask independently; pin with domain tests in Task 3.
- **Duplicate/out-of-order ticks:** Retries must not duplicate stored ticks or overwrite a newer latest quote; pin with storage integration tests in Task 5.
- **Stale feed:** A disconnected or frozen simulator must make the quote visibly stale and must not be presented as a fresh update; pin with API/SignalR tests in Tasks 6–7.
- **Wide history windows:** One-year chart responses must use bounded aggregates while the raw tick endpoint remains pageable; pin with history API tests in Task 6.
- **UTC and boundaries:** Custom time ranges must handle inclusive/exclusive boundaries consistently and use UTC; pin with query tests in Task 6.

---

## Repository and implementation scope

The workspace was inspected during planning and currently contains only `.DS_Store`; no solution, project files, README, or `.git` directory were present. Before executing this plan, confirm this is the intended repository checkout and connect or initialize its Git repository through the user's normal repository workflow. Do not overwrite or duplicate an existing solution if the actual checkout differs.

This first plan intentionally ends with a working public live-price and history slice. Follow-up plans should cover accounts/identity, alert rule persistence and in-memory indexing, notification delivery, and production-scale regional fan-out.

## Technology decision gate

Before scaffolding, record an ADR that selects the concrete local/production-compatible broker and the concrete time-series database. The agreed direction is Kafka-compatible event streaming plus a separate online time-series store, but the spec intentionally leaves exact products and hosting open. Compare operational fit, .NET client support, local development, retention/partitioning, and old-tick query latency. Present the ADR for review before adding product-specific packages or containers. Keep the event and storage interfaces provider-neutral. The local broker, PostgreSQL, time-series store, and API can run in Docker Compose; production hosting and managed SignalR scale-out remain deployment decisions.

### Task 1: Confirm repository and record infrastructure decisions

**Files:**
- Create: `docs/architecture/decisions/0001-market-data-infrastructure.md`
- Inspect before modifying: repository root, existing `.sln`/`.slnx`, `AGENTS.md`, and Git status

**Interfaces:**
- Produces: approved selections for event broker, time-series database, and local container topology; no application code depends on this task's document format.

- [ ] Verify the real repository root and whether it is already a Git checkout. If no Git checkout exists, stop before source changes and ask the owner to attach/initialize the intended repository.
- [ ] Compare Kafka-compatible broker candidates and time-series database candidates against the criteria above; include the required public tick retention and similar latency for equivalent old/new lookups.
- [ ] Write the ADR with the selected products, local Docker images, .NET client packages to use, and known production-hosting gaps.
- [ ] Present the ADR for user review. Do not scaffold product-specific infrastructure until the choices are accepted.

**Review gate:** If the user changes a selected technology, update the ADR and this plan's package/container steps before implementation.

### Task 2: Create the solution and project skeleton

**Files:**
- Create: `MarketPulse.sln` (or retain the existing Rider-created `.sln`)
- Create: `Directory.Packages.props`
- Create: `.editorconfig`
- Create: `src/MarketPulse.Api/MarketPulse.Api.csproj`
- Create: `src/MarketPulse.Application/MarketPulse.Application.csproj`
- Create: `src/MarketPulse.Domain/MarketPulse.Domain.csproj`
- Create: `src/MarketPulse.Infrastructure/MarketPulse.Infrastructure.csproj`
- Create: `src/MarketPulse.Worker/MarketPulse.Worker.csproj`
- Create: `tests/MarketPulse.UnitTests/MarketPulse.UnitTests.csproj`
- Create: `tests/MarketPulse.IntegrationTests/MarketPulse.IntegrationTests.csproj`
- Create: `src/MarketPulse.Api/Program.cs`
- Create: `src/MarketPulse.Worker/Program.cs`

**Interfaces:**
- `Application` references `Domain`.
- `Infrastructure` references `Application` and `Domain`.
- `Api` and `Worker` reference `Application` and `Infrastructure` as composition roots.
- `Domain` has no solution-project references.

- [ ] Create or reuse the `.sln`; add the five production projects and two xUnit test projects.
- [ ] Set all projects to target `net10.0`; centralize package versions in `Directory.Packages.props` and select versions compatible with .NET 10 after Task 1's ADR.
- [ ] Add project references exactly as listed above; do not reference the Angular workspace from the .NET solution.
- [ ] Configure nullable reference types and implicit usings consistently for the C# projects.
- [ ] Add a minimal API health endpoint and a worker host that starts and stops cleanly.
- [ ] Run `dotnet build MarketPulse.sln` and `dotnet test MarketPulse.sln`; expect a clean build and both test projects discovered.

### Task 3: Define price domain and event contracts

**Files:**
- Create: `src/MarketPulse.Domain/MarketData/InstrumentId.cs`
- Create: `src/MarketPulse.Domain/MarketData/Quote.cs`
- Create: `src/MarketPulse.Domain/MarketData/MarketTick.cs`
- Create: `src/MarketPulse.Application/MarketData/MarketTickV1.cs`
- Create: `src/MarketPulse.Application/MarketData/IMarketDataFeed.cs`
- Create: `src/MarketPulse.Application/MarketData/IMarketTickPublisher.cs`
- Create: `tests/MarketPulse.UnitTests/MarketData/QuoteTests.cs`
- Create: `tests/MarketPulse.UnitTests/MarketData/MarketTickTests.cs`

**Interfaces:**
- `enum InstrumentId { Gold, Silver }`.
- `Quote(decimal Bid, decimal Ask, string Currency)`; creation validates positive bid/ask and `Bid <= Ask`; currency is `USD` in this release.
- `MarketTick(InstrumentId Instrument, Quote Quote, DateTimeOffset EventTimeUtc, DateTimeOffset ReceivedAtUtc, string Source, string EventId, long? Sequence)`.
- `MarketTickV1` is the versioned serialization shape with the same fields.
- `IMarketDataFeed.ReadAsync(CancellationToken)` returns `IAsyncEnumerable<MarketTick>`.
- `IMarketTickPublisher.PublishAsync(MarketTickV1 tick, CancellationToken)` publishes one normalized event.

- [ ] Write unit tests for gold and silver IDs, invalid bid/ask values, non-USD currency rejection, UTC timestamps, and missing event identity.
- [ ] Run `dotnet test tests/MarketPulse.UnitTests --filter FullyQualifiedName~MarketData` and verify the new quote/tick tests fail for the intended validations.
- [ ] Implement the domain value objects and event DTO with explicit validation and no midpoint field or calculation.
- [ ] Re-run the focused tests and then all unit tests; expect them to pass.

### Task 4: Add local infrastructure and deterministic tick simulator

**Files:**
- Create: `compose.yaml`
- Create: `.env.example`
- Create: `src/MarketPulse.Infrastructure/Messaging/KafkaMarketTickPublisher.cs` (or the ADR-selected broker publisher)
- Create: `src/MarketPulse.Infrastructure/DependencyInjection.cs`
- Create: `src/MarketPulse.Worker/Simulation/SimulationOptions.cs`
- Create: `src/MarketPulse.Worker/Simulation/SimulatedMarketDataFeed.cs`
- Create: `src/MarketPulse.Worker/Simulation/MarketDataIngestionService.cs`
- Modify: `src/MarketPulse.Worker/Program.cs`
- Create: `tests/MarketPulse.UnitTests/Simulation/SimulatedMarketDataFeedTests.cs`
- Create: `tests/MarketPulse.IntegrationTests/Messaging/MarketTickBrokerTests.cs`

**Interfaces:**
- `SimulationOptions` contains a configurable tick interval, random seed, and starting bid/ask for gold and silver.
- `SimulatedMarketDataFeed` implements `IMarketDataFeed`; each tick carries a unique event ID, monotonic sequence per instrument, event UTC time, receive UTC time, USD, bid, and ask.
- `MarketDataIngestionService` reads `IMarketDataFeed` and publishes `MarketTickV1`; it receives cancellation and logs provider/simulator health without logging secrets.

- [ ] Add the selected broker and database containers to `compose.yaml` with local-only ports, named data volumes, health checks, and credentials read from environment variables.
- [ ] Implement simulator tests for deterministic output under a fixed seed, both instruments, positive prices, `bid <= ask`, sequence increments, and cancellation.
- [ ] Implement the broker publisher using the ADR-selected .NET client and an explicit versioned topic name such as `market.ticks.v1`.
- [ ] Register `IMarketDataFeed` to the simulator in the local worker configuration; keep provider replacement in dependency injection rather than branching inside consumers.
- [ ] Add a broker integration test that publishes and consumes a serialized tick and verifies all bid/ask, timestamp, currency, and identity fields survive round-trip.
- [ ] Run focused unit and broker integration tests; expect deterministic simulator behavior and a successful event round-trip.

### Task 5: Persist raw ticks and latest quotes

**Files:**
- Create: `src/MarketPulse.Infrastructure/TimeSeries/TimeSeriesDbContext.cs` (or ADR-selected client/repository)
- Create: `src/MarketPulse.Infrastructure/TimeSeries/MarketTickEntity.cs`
- Create: `src/MarketPulse.Infrastructure/TimeSeries/LatestQuoteEntity.cs`
- Create: `src/MarketPulse.Infrastructure/TimeSeries/MarketTickRepository.cs`
- Create: `src/MarketPulse.Infrastructure/Messaging/MarketTickPersistenceConsumer.cs`
- Create: time-series schema/migration files under `src/MarketPulse.Infrastructure/TimeSeries/Migrations/`
- Create: `tests/MarketPulse.IntegrationTests/TimeSeries/MarketTickPersistenceTests.cs`

**Interfaces:**
- `IMarketTickStore.AppendAsync(MarketTickV1 tick, CancellationToken)` stores a raw tick idempotently and updates the instrument's latest quote only if the incoming event is newer by provider sequence/time.
- Raw tick uniqueness is `(Source, EventId)`; query index starts with `(Instrument, EventTimeUtc, EventId)`.
- `LatestQuote` stores instrument, bid, ask, currency, event time, received time, source, and event ID; no midpoint.

- [ ] Write integration tests for append, retrieval ordering, duplicate event IDs, and an older tick not replacing a newer latest quote.
- [ ] Create the time-series schema using the selected database's time partitioning/index strategy; do not put user/alert relational tables in this store.
- [ ] Implement idempotent tick append and latest-quote update in one database transaction where supported.
- [ ] Implement the persistence consumer with retry handling and broker acknowledgement only after a successful durable write.
- [ ] Run the time-series integration tests against the container from `compose.yaml`; expect no duplicate raw rows and correct latest-quote state after replay.

### Task 6: Serve latest price and historical chart queries

**Files:**
- Create: `src/MarketPulse.Application/MarketData/IMarketTickStore.cs`
- Create: `src/MarketPulse.Application/MarketData/GetLatestQuotes.cs`
- Create: `src/MarketPulse.Application/MarketData/GetChartHistory.cs`
- Create: `src/MarketPulse.Api/Endpoints/MarketDataEndpoints.cs`
- Create: `src/MarketPulse.Infrastructure/TimeSeries/ChartAggregateRepository.cs`
- Create: `tests/MarketPulse.UnitTests/MarketData/ChartRangeTests.cs`
- Create: `tests/MarketPulse.IntegrationTests/Api/MarketDataEndpointTests.cs`

**Interfaces:**
- `GetLatestQuotes` returns the latest bid/ask quote for gold and silver with `eventTimeUtc`, `receivedAtUtc`, and `isStale`.
- `GetChartHistory` accepts instrument, UTC `from`/`to`, and a resolution; it returns timestamped bid and ask series plus whether points are raw ticks or aggregates.
- `GET /api/v1/prices` returns current gold and silver bid/ask values.
- `GET /api/v1/prices/{instrument}/ticks?from={utc}&to={utc}&cursor={opaque}` returns raw ticks in stable chronological pages.
- `GET /api/v1/prices/{instrument}/chart?from={utc}&to={utc}&resolution={resolution}` selects raw points for narrow windows and maintained aggregates for broad windows; reject invalid ranges and unsupported resolutions with validation responses.

- [ ] Add tests for 1-day, 1-week, 1-year, and custom ranges; verify all timestamps are UTC and `from`/`to` boundary semantics are consistent.
- [ ] Add tests that raw tick pages are stable, ordered, cursor-based, and do not silently truncate the retained tick history.
- [ ] Add tests that broad chart queries return bounded aggregate points while an equivalent raw tick query remains available for drill-down.
- [ ] Implement application queries and infrastructure readers; chart responses must preserve bid and ask separately.
- [ ] Add API integration tests for valid responses, invalid instrument IDs, invalid time ranges, and empty history.
- [ ] Run endpoint and time-series integration tests; expect stable page ordering and bounded chart payload size.

### Task 7: Stream live bid/ask ticks to clients

**Files:**
- Create: `src/MarketPulse.Application/MarketData/ILivePriceBroadcaster.cs`
- Create: `src/MarketPulse.Api/Realtime/PricesHub.cs`
- Create: `src/MarketPulse.Api/Realtime/SignalRLivePriceBroadcaster.cs`
- Create: `src/MarketPulse.Api/Realtime/MarketFeedHealthMonitor.cs`
- Create: `src/MarketPulse.Infrastructure/Messaging/MarketTickBroadcastConsumer.cs`
- Modify: `src/MarketPulse.Api/Program.cs`
- Create: `tests/MarketPulse.IntegrationTests/Realtime/LivePriceBroadcastTests.cs`

**Interfaces:**
- `ILivePriceBroadcaster.BroadcastAsync(MarketTickV1 tick, CancellationToken)` broadcasts `Gold` or `Silver` group events.
- `ILivePriceBroadcaster.BroadcastStalenessAsync(InstrumentId instrument, bool isStale, DateTimeOffset lastReceivedAtUtc, CancellationToken)` publishes feed health changes to that instrument's group.
- `MarketFeedHealthMonitor` checks latest receive timestamps on a configured interval and broadcasts a transition to stale when no new tick arrives before the threshold; recovery is broadcast when fresh ticks resume.
- SignalR hub path: `/hubs/prices`; anonymous clients may subscribe only to the public `Gold` and `Silver` groups.
- Every consumed tick pushes separate bid and ask fields immediately. The broad-range chart may update its current aggregate point while still receiving every live tick.

- [ ] Test that anonymous clients can join only supported public instrument groups and cannot create arbitrary group names.
- [ ] Test that each event contains both bid and ask, USD, instrument, event time, receive time, and event ID, with no midpoint field.
- [ ] Implement the SignalR hub, instrument groups, and broadcaster.
- [ ] Add the broadcast consumer so database persistence and live delivery are independent broker consumers.
- [ ] Add a stale-price state from the last receive time; return and broadcast stale status when a source stops advancing beyond a configured threshold.
- [ ] Run a SignalR integration test using a client connection; expect one delivered event for each published tick and correct stale status after simulator pause.

### Task 8: Exercise recovery and capacity boundaries

**Files:**
- Create: `tests/MarketPulse.IntegrationTests/Recovery/ConsumerReplayTests.cs`
- Create: `tests/MarketPulse.IntegrationTests/Recovery/FeedHealthTests.cs`
- Create: `tests/load/market-tick-fanout/` with a documented load scenario and runner configuration
- Create: `docs/operations/local-market-data.md`

**Interfaces:**
- Load scenario parameters: concurrent clients, instrument subscriptions, ticks per second, history-query rate, and alert evaluation excluded from this slice.
- Runtime metrics: ingestion tick rate, broker lag, persistence latency, SignalR send latency, active connections, and feed age.

- [ ] Test consumer restart and replay from broker offsets; verify persistence remains idempotent and latest quote does not move backward.
- [ ] Test simulator disconnect, reconnect, delayed ticks, duplicates, and bursts; verify stale state and recovery behavior.
- [ ] Add metrics and structured logs for the runtime measures listed above; never include secrets or user credentials.
- [ ] Run a local smoke scenario through simulator, broker, time-series persistence, latest API, chart API, and SignalR client.
- [ ] Define and run a baseline load test at a documented modest local target; record results without claiming production-scale capacity.
- [ ] Document how to start/stop the local infrastructure, run migrations, launch API/worker, and inspect a live tick and historical range.

## Follow-up plans (out of scope here)

1. User identity and PostgreSQL relational schema for accounts, watchlists, and alert definitions.
2. Alert processor: transactional outbox, in-memory bid/ask rule indexes, sharding, durable trigger state, notification queue, and recovery semantics.
3. Production provider selection/licensing and provider-specific feed adapter.
4. Production hosting, managed SignalR scale-out, regional routing, five-million-connection capacity planning, and full-scale load tests.

## Self-review

- **Spec coverage for this slice:** simulator feed path, bid/ask semantics, broker events, all-tick time-series persistence, latest quotes, chart ranges/aggregates/raw drill-down, live SignalR delivery, stale data, duplicate/replay safety, xUnit coverage, and capacity boundaries are assigned to Tasks 1–8.
- **Deferred requirements:** accounts, alert evaluation and notifications, real paid provider, production hosting, and verified five-million-user capacity are named follow-up plans rather than implied complete.
- **Placeholder scan:** no task uses TBD/TODO or unnamed implementation behavior; the only technology choices intentionally held behind Task 1 review are the broker and time-series product.
- **Type/interface consistency:** event identity and timestamps remain consistent from `MarketTick` through `MarketTickV1`, storage, API responses, and SignalR events; bid and ask remain separate throughout.
