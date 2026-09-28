# MarketPulse

MarketPulse is a market-tracking application for viewing stock and precious-metal prices in one place. Visitors can browse market data without an account. Registered users will be able to create watchlists and set price alerts.

## Planned features

- Dashboard sections for stocks and precious metals
- Current and historical price views
- Watchlists for registered users
- User-configured price alerts
- Real-time price updates, depending on the market-data provider

## Planned technology

- **Frontend:** Angular
- **API:** ASP.NET Core on .NET 10
- **Database:** PostgreSQL
- **Background processing:** .NET Worker Service
- **Testing:** xUnit for .NET tests; Playwright for browser end-to-end tests

The technology list describes the intended architecture and may change as the project develops.

## Repository structure

```text
.
├── src/
│   ├── MarketPulse.Api/
│   ├── MarketPulse.Application/
│   ├── MarketPulse.Domain/
│   ├── MarketPulse.Infrastructure/
│   ├── MarketPulse.Worker/
│   └── MarketPulse.Web/             # Angular application
├── tests/
│   ├── MarketPulse.UnitTests/
│   └── MarketPulse.IntegrationTests/
└── MarketPulse.slnx
