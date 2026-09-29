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
│   └── MarketPulse.Ui/             # Angular application
├── tests/
│   ├── MarketPulse.UnitTests/
│   └── MarketPulse.IntegrationTests/
└── MarketPulse.slnx
```

## Authentication (local dev)

MarketPulse.Api uses ASP.NET Core Identity with cookie sessions, backed by PostgreSQL. Local email/password accounts and Google sign-in are both supported.

1. Have a local PostgreSQL instance reachable at the connection string in `src/MarketPulse.Api/appsettings.Development.json` (`ConnectionStrings:Postgres`), or point it at your own instance.
2. Apply the EF Core migrations:

   ```bash
   dotnet ef database update --project src/MarketPulse.Infrastructure --startup-project src/MarketPulse.Api
   ```

3. Create a Google OAuth client in Google Cloud Console. Set its authorized redirect URI to `<api-base-url>/signin-google`.
4. Copy `.env.example` to `.env` at the repo root and fill in the Google client credentials (never commit `.env` — it's already gitignored):

   ```bash
   cp .env.example .env
   ```

   `MarketPulse.Api` loads `.env` automatically on startup (searching upward from the current directory) and sets it as process environment variables, which ASP.NET Core's configuration system reads the same way it reads real environment variables (`AUTHENTICATION__GOOGLE__CLIENTID` → `Authentication:Google:ClientId`). Real environment variables always take precedence over `.env`.

5. `Auth:AllowedReturnUrls` in `appsettings.Development.json` lists the origins the Google sign-in flow is allowed to redirect back to after login (defaults to the Angular dev server at `http://localhost:4200`).
