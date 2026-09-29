# MarketPulse

MarketPulse is a planned market-prices application for viewing stocks and precious metals (such as gold and silver) in one dashboard. Public visitors should be able to view prices without creating an account. Users who register can create watchlists and configure price alerts for selected instruments.

> **Project status:** Early planning / development. The architecture and features below capture current decisions and proposals; they do not imply that those features or projects already exist.

## Product scope

- One dashboard with separate **Stocks** and **Metals** sections.
- Current and historical price views, including charts and analysis.
- Public price browsing without authentication.
- Optional authentication for user features.
- Authenticated users can create watchlists and alerts for a selected instrument and threshold.
- Real-time or near-real-time updates depend on the selected market-data provider, its feed, licensing, coverage, and rate limits.

This is a market-prices application, not only a stock app. The name **MarketPulse** is the current working name; confirm name, domain, and trademark availability before public launch.

## Current technology choices

- **Frontend:** Angular, in `src/MarketPulse.Web/`.
- **API:** ASP.NET Core Web API on .NET 10.
- **Database:** PostgreSQL as the initial database and source of truth.
- **Background processing:** .NET Worker Service for provider ingestion and alert evaluation where appropriate.
- **.NET tests:** xUnit for unit and integration test projects.
- **Browser end-to-end tests:** Playwright, maintained with the frontend tooling.
- **Solution format:** Rider currently creates `.sln`. This is a supported format; `.slnx` is newer but switching is optional and should be done only after confirming tool compatibility.
- **Package versions:** Use a root `Directory.Packages.props` if central NuGet package version management is adopted.

## Suggested architecture

Start with a **modular monolith**, not a set of microservices. Keep one API deployment and organize code by business area (for example, Prices, Instruments, Watchlists, and Alerts). Keep provider ingestion/background work in a Worker Service so it can be deployed and scaled separately if actual workload requires it.

Suggested flow:

```text
Market-data provider
        │
        ▼
MarketPulse.Worker ──► PostgreSQL (current snapshot / history as appropriate)
        │                             │
        └── evaluates alert rules     └── read queries
                                              │
Angular app ◄── HTTP API / real-time delivery ◄── MarketPulse.Api
```

The exact real-time transport (for example, WebSockets/SignalR or server-sent events) and event pipeline should be selected after choosing a market-data provider and estimating update rates and subscriptions. Kafka/CDC were discussed as possible future tools, not as current requirements. Avoid introducing them until there is a concrete throughput, decoupling, or replay requirement.

## Proposed .NET solution layout

```text
.
├── src/
│   ├── MarketPulse.Api/              # ASP.NET Core HTTP and real-time endpoints
│   ├── MarketPulse.Application/      # Use cases and ports/interfaces
│   ├── MarketPulse.Domain/            # Core business concepts and rules
│   ├── MarketPulse.Infrastructure/   # PostgreSQL and external provider implementations
│   ├── MarketPulse.Worker/            # Background price ingestion and alert processing
│   └── MarketPulse.Web/               # Angular workspace/application
├── tests/
│   ├── MarketPulse.UnitTests/
│   └── MarketPulse.IntegrationTests/
├── Directory.Packages.props           # Optional central NuGet versions
├── MarketPulse.sln                    # Rider-created solution (or .slnx if intentionally migrated)
└── README.md
```

The Angular workspace is under `src` for repository organization, but it is not a .NET project and is not added to the .NET solution as a C# project.

### Project references

```text
Api            ──► Application, Infrastructure (composition root)
Worker         ──► Application, Infrastructure (composition root)
Infrastructure ──► Application, Domain
Application    ──► Domain
Domain         ──► no other solution project
```

`Domain` and `Application` should not depend on web framework, database, or provider implementation details. `Application` defines the interfaces/ports it needs; `Infrastructure` implements them. Keep each project focused and avoid adding layers that do not yet provide a clear boundary.

### Project types

| Project | Type |
|---|---|
| `MarketPulse.Api` | ASP.NET Core Web API |
| `MarketPulse.Application` | .NET class library |
| `MarketPulse.Domain` | .NET class library |
| `MarketPulse.Infrastructure` | .NET class library |
| `MarketPulse.Worker` | .NET Worker Service |
| `MarketPulse.UnitTests` | xUnit test project |
| `MarketPulse.IntegrationTests` | xUnit test project |
| `MarketPulse.Ui` | Angular application/workspace |

Use unit tests for isolated domain and application behavior. Use integration tests for API and persistence boundaries. Use Playwright for end-to-end browser flows across Angular and the API.

## Data and scaling decisions

- Begin with PostgreSQL for application data and, initially, historical prices if its measured performance and retention needs are suitable.
- PostgreSQL is the initial source of truth. Writes go to the primary. A read replica may be introduced later for eligible read-heavy queries; account for replication lag and do not send consistency-sensitive reads to a lagging replica.
- A separate time-series database is not an initial requirement. Consider one only when measured history volume, retention, ingestion, or analytical-query needs justify the extra operational complexity.
- The market-data provider/feed is the source of incoming market prices. CDC is for propagating committed database changes; it is not a replacement for market-data ingestion.
- A target of **5 million simultaneous users** was discussed. This is an ambition, not a demonstrated capacity. No language, framework, replica, or broker alone guarantees that scale. Validate the full system with realistic capacity estimates and load tests, including concurrent connections, subscriptions per user, update frequency, fan-out, regions, provider limits, and cost.
- Avoid sharding and Kafka initially unless measurements or required delivery guarantees justify them. Design boundaries so ingestion and delivery can be scaled independently later.

## Worker Service responsibilities

The Worker Service is a long-running background process rather than an API endpoint. Candidate responsibilities are:

1. Connect to or poll the selected market-data provider.
2. Normalize and validate incoming instrument/price updates.
3. Persist snapshots or historical points according to retention and query requirements.
4. Evaluate active alert rules and hand notifications to a delivery mechanism.
5. Publish updates to a real-time delivery layer if that design is selected.

Provider retries, backpressure, idempotency, rate limits, stale data, market hours, and alert duplicate prevention need explicit design before production.

## Repository setup notes

If the solution has not yet been created, an example CLI setup from the repository root is:

```bash
mkdir -p src
dotnet new sln -n MarketPulse
dotnet new worker -n MarketPulse.Worker -o src/MarketPulse.Worker
dotnet sln add src/MarketPulse.Worker/MarketPulse.Worker.csproj
```

If Rider already created `MarketPulse.sln`, keep using it and add projects to that file. Do not create a second solution file accidentally. With a .NET 10 SDK, `dotnet new sln` may create `.slnx` by default; choose the format deliberately and verify Rider and other tools before migrating.

For central NuGet versions, place `Directory.Packages.props` at the repository root, set `ManagePackageVersionsCentrally` to `true`, and declare package versions there using `PackageVersion`. Individual project files then use `PackageReference` without a version. Select package versions compatible with the target framework; do not copy placeholder versions without checking compatibility.

## Open decisions

Resolve these before implementing production data flows:

- Which market-data provider(s) supply stocks and metals? What are the licensing and redistribution terms?
- What does “real time” mean for this product: provider tick rate, acceptable display delay, and per-user subscription behavior?
- Which instruments, exchanges, currencies, time zones, and trading sessions are in scope?
- Which real-time delivery approach and hosting platform will be used?
- Which alert channels are needed (in-app, email, push), and what delivery guarantees are expected?
- What are history retention and analytics requirements?
- Which authentication/identity provider and account model will be used?
- What are the initial deployment, observability, backup, and recovery targets?

## Handoff guidance for Claude Code

Use this README as the current product and architecture context. First inspect the repository and existing `AGENTS.md`/project instructions; preserve work already present. Treat the listed structure as proposed unless the files exist. Implement incrementally, keep the first version as a modular monolith, and ask before adding costly external services or changing the agreed stack. Do not assume live provider data or five-million-user capacity is already available or verified.
