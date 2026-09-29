# Google + Local Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ASP.NET Core Identity to MarketPulse.Api with cookie-based sessions, local email/password accounts, and Google external login, backed by PostgreSQL via EF Core.

**Architecture:** Identity stays infrastructure-only (`ApplicationUser`/`ApplicationDbContext`/EF Core live in `MarketPulse.Infrastructure`); `MarketPulse.Application` exposes only a minimal `ICurrentUser` port. `MarketPulse.Api` is the composition root: wires Identity, cookie + Google authentication, and exposes `/api/v1/auth/*` minimal-API endpoints built directly on `UserManager`/`SignInManager`.

**Tech Stack:** .NET 10, ASP.NET Core Identity, EF Core + Npgsql (PostgreSQL), `Microsoft.AspNetCore.Authentication.Google`, xUnit, Testcontainers.PostgreSql for integration tests.

**Spec:** [2026-09-29-google-auth-design.md](../specs/2026-09-29-google-auth-design.md)

## Global Constraints

- Independent of `implementation-plan.md` (the gold/silver price pipeline) — no dependency either direction.
- Identity types (`ApplicationUser`, `ApplicationDbContext`, `IdentityDbContext`, etc.) must not leak into `MarketPulse.Domain` or `MarketPulse.Application`; `Application` only sees `ICurrentUser`.
- Same PostgreSQL database/instance that is the app's relational source of truth — no separate database for Identity.
- Cookie auth: `HttpOnly`, `SameSite=Lax`, `Secure` outside local development.
- Google `ClientId`/`ClientSecret` come from configuration (`Authentication:Google:ClientId` / `Authentication:Google:ClientSecret`); local dev sets them via `dotnet user-secrets` on `MarketPulse.Api` — never committed to source.
- Redirect URLs after Google sign-in must be validated against an allow-list (`Auth:AllowedReturnUrls`) — no open redirect.
- Out of scope: roles/authorization policies beyond authenticated-vs-anonymous, email confirmation, password reset, account lockout tuning, 2FA, production cookie-domain/hosting topology, and any watchlist/alert feature.
- Google's real OAuth handshake is not exercised in tests; only the provisioning logic (create-or-link a local user from an external identity) is integration-tested.

---

### Task 1: Add auth packages and configuration scaffolding

**Files:**
- Modify: `Directory.Packages.props`
- Modify: `src/MarketPulse.Infrastructure/MarketPulse.Infrastructure.csproj`
- Modify: `src/MarketPulse.Api/MarketPulse.Api.csproj`
- Modify: `tests/MarketPulse.IntegrationTests/MarketPulse.IntegrationTests.csproj`
- Modify: `tests/MarketPulse.UnitTests/MarketPulse.UnitTests.csproj`
- Modify: `src/MarketPulse.Api/appsettings.Development.json`
- Create: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Produces: package references and configuration keys (`ConnectionStrings:Postgres`, `Auth:AllowedReturnUrls`, `Auth:DefaultReturnUrl`) that every later task in this plan depends on.

- [ ] **Step 1: Add package versions to `Directory.Packages.props`**

```xml
<Project>
    <PropertyGroup>
        <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
    </PropertyGroup>

    <ItemGroup>
        <PackageVersion Include="Microsoft.AspNetCore.OpenApi" Version="10.0.12"/>
        <PackageVersion Include="Microsoft.EntityFrameworkCore" Version="10.0.12" />
        <PackageVersion Include="Microsoft.EntityFrameworkCore.Design" Version="10.0.12" />
        <PackageVersion Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="10.0.3" />
        <PackageVersion Include="Microsoft.Extensions.Hosting" Version="10.0.12" />
        <PackageVersion Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" Version="10.0.12" />
        <PackageVersion Include="Microsoft.AspNetCore.Authentication.Google" Version="10.0.12" />
        <PackageVersion Include="Microsoft.AspNetCore.Mvc.Testing" Version="10.0.12" />

        <PackageVersion Include="coverlet.collector" Version="10.1.0"/>
        <PackageVersion Include="Microsoft.NET.Test.Sdk" Version="18.10.1"/>
        <PackageVersion Include="xunit" Version="2.9.3" />
        <PackageVersion Include="xunit.runner.visualstudio" Version="4.0.0"/>
        <PackageVersion Include="Testcontainers.PostgreSql" Version="4.1.0" />
    </ItemGroup>
</Project>
```

Note: if `dotnet restore` (Step 8) reports any of these versions unresolvable, bump to the closest available compatible version and record the change here before continuing — don't silently guess further.

- [ ] **Step 2: Add packages and a shared-framework reference to `src/MarketPulse.Infrastructure/MarketPulse.Infrastructure.csproj`**

```xml
<Project Sdk="Microsoft.NET.Sdk">

    <PropertyGroup>
        <TargetFramework>net10.0</TargetFramework>
        <ImplicitUsings>enable</ImplicitUsings>
        <Nullable>enable</Nullable>
    </PropertyGroup>

    <ItemGroup>
        <FrameworkReference Include="Microsoft.AspNetCore.App" />
    </ItemGroup>

    <ItemGroup>
        <PackageReference Include="Microsoft.EntityFrameworkCore" />
        <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" />
        <PackageReference Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" />
    </ItemGroup>

    <ItemGroup>
      <ProjectReference Include="..\MarketPulse.Application\MarketPulse.Application.csproj" />
      <ProjectReference Include="..\MarketPulse.Domain\MarketPulse.Domain.csproj" />
    </ItemGroup>

</Project>
```

- [ ] **Step 3: Add packages to `src/MarketPulse.Api/MarketPulse.Api.csproj`**

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

    <PropertyGroup>
        <TargetFramework>net10.0</TargetFramework>
        <Nullable>enable</Nullable>
        <ImplicitUsings>enable</ImplicitUsings>
    </PropertyGroup>

    <ItemGroup>
        <PackageReference Include="Microsoft.AspNetCore.OpenApi" />
        <PackageReference Include="Microsoft.AspNetCore.Authentication.Google" />
        <PackageReference Include="Microsoft.EntityFrameworkCore.Design">
            <PrivateAssets>all</PrivateAssets>
            <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
        </PackageReference>
    </ItemGroup>

    <ItemGroup>
      <ProjectReference Include="..\MarketPulse.Application\MarketPulse.Application.csproj" />
      <ProjectReference Include="..\MarketPulse.Infrastructure\MarketPulse.Infrastructure.csproj" />
    </ItemGroup>

</Project>
```

- [ ] **Step 4: Add packages and an Infrastructure project reference to `tests/MarketPulse.IntegrationTests/MarketPulse.IntegrationTests.csproj`**

```xml
<Project Sdk="Microsoft.NET.Sdk">

    <PropertyGroup>
        <TargetFramework>net10.0</TargetFramework>
        <ImplicitUsings>enable</ImplicitUsings>
        <Nullable>enable</Nullable>
        <IsPackable>false</IsPackable>
    </PropertyGroup>

    <ItemGroup>
        <PackageReference Include="coverlet.collector"/>
        <PackageReference Include="Microsoft.NET.Test.Sdk"/>
        <PackageReference Include="xunit"/>
        <PackageReference Include="xunit.runner.visualstudio"/>
        <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" />
        <PackageReference Include="Testcontainers.PostgreSql" />
    </ItemGroup>

    <ItemGroup>
        <Using Include="Xunit"/>
    </ItemGroup>

    <ItemGroup>
      <ProjectReference Include="..\..\src\MarketPulse.Api\MarketPulse.Api.csproj" />
      <ProjectReference Include="..\..\src\MarketPulse.Infrastructure\MarketPulse.Infrastructure.csproj" />
    </ItemGroup>

</Project>
```

- [ ] **Step 5: Add an Infrastructure project reference to `tests/MarketPulse.UnitTests/MarketPulse.UnitTests.csproj`**

```xml
<Project Sdk="Microsoft.NET.Sdk">

    <PropertyGroup>
        <TargetFramework>net10.0</TargetFramework>
        <ImplicitUsings>enable</ImplicitUsings>
        <Nullable>enable</Nullable>
        <IsPackable>false</IsPackable>
    </PropertyGroup>

    <ItemGroup>
        <PackageReference Include="coverlet.collector"/>
        <PackageReference Include="Microsoft.NET.Test.Sdk"/>
        <PackageReference Include="xunit"/>
        <PackageReference Include="xunit.runner.visualstudio"/>
    </ItemGroup>

    <ItemGroup>
        <Using Include="Xunit"/>
    </ItemGroup>

    <ItemGroup>
      <ProjectReference Include="..\..\src\MarketPulse.Application\MarketPulse.Application.csproj" />
      <ProjectReference Include="..\..\src\MarketPulse.Domain\MarketPulse.Domain.csproj" />
      <ProjectReference Include="..\..\src\MarketPulse.Infrastructure\MarketPulse.Infrastructure.csproj" />
    </ItemGroup>

</Project>
```

- [ ] **Step 6: Add local-dev configuration keys to `src/MarketPulse.Api/appsettings.Development.json`**

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5432;Database=marketpulse;Username=marketpulse;Password=marketpulse"
  },
  "Auth": {
    "AllowedReturnUrls": [ "http://localhost:4200" ],
    "DefaultReturnUrl": "http://localhost:4200"
  }
}
```

- [ ] **Step 7: Create `.env.example` documenting required secrets**

```bash
# Copy to .env for local docker/tooling use, or set these via `dotnet user-secrets`
# on MarketPulse.Api instead (recommended — see README.md).

# PostgreSQL used by MarketPulse.Api (see ConnectionStrings:Postgres in appsettings.Development.json)
POSTGRES_DB=marketpulse
POSTGRES_USER=marketpulse
POSTGRES_PASSWORD=marketpulse

# Google OAuth client, created in Google Cloud Console.
# Authorized redirect URI must be: http://localhost:5000/api/v1/auth/google/callback (adjust host/port per environment)
AUTHENTICATION__GOOGLE__CLIENTID=
AUTHENTICATION__GOOGLE__CLIENTSECRET=
```

- [ ] **Step 8: Add an "Authentication (local dev)" section to `README.md`**

Append after the "Repository structure" section:

```markdown

## Authentication (local dev)

MarketPulse.Api uses ASP.NET Core Identity with cookie sessions, backed by PostgreSQL. Local email/password accounts and Google sign-in are both supported.

1. Have a local PostgreSQL instance reachable at the connection string in `src/MarketPulse.Api/appsettings.Development.json` (`ConnectionStrings:Postgres`), or point it at your own instance.
2. Create a Google OAuth client in Google Cloud Console. Set its authorized redirect URI to `<api-base-url>/api/v1/auth/google/callback`.
3. Set the Google client credentials as user secrets (never commit them):

   ```bash
   cd src/MarketPulse.Api
   dotnet user-secrets init
   dotnet user-secrets set "Authentication:Google:ClientId" "<client-id>"
   dotnet user-secrets set "Authentication:Google:ClientSecret" "<client-secret>"
   ```

4. `Auth:AllowedReturnUrls` in `appsettings.Development.json` lists the origins the Google sign-in flow is allowed to redirect back to after login (defaults to the Angular dev server at `http://localhost:4200`).
```

- [ ] **Step 9: Verify the solution restores and builds**

Run: `dotnet restore MarketPulse.slnx && dotnet build MarketPulse.slnx`
Expected: restore and build succeed with no errors (warnings about unused packages are fine at this stage — later tasks consume them).

- [ ] **Step 10: Commit**

```bash
git add Directory.Packages.props src/MarketPulse.Infrastructure/MarketPulse.Infrastructure.csproj src/MarketPulse.Api/MarketPulse.Api.csproj tests/MarketPulse.IntegrationTests/MarketPulse.IntegrationTests.csproj tests/MarketPulse.UnitTests/MarketPulse.UnitTests.csproj src/MarketPulse.Api/appsettings.Development.json .env.example README.md
git commit -m "Add auth-related packages and configuration scaffolding"
```

---

### Task 2: Add `ICurrentUser` port and Identity data model

**Files:**
- Create: `src/MarketPulse.Application/Auth/ICurrentUser.cs`
- Create: `src/MarketPulse.Infrastructure/Identity/ApplicationUser.cs`
- Create: `src/MarketPulse.Infrastructure/Identity/ApplicationDbContext.cs`
- Create: `src/MarketPulse.Infrastructure/Identity/CurrentUser.cs`
- Create: `src/MarketPulse.Infrastructure/DependencyInjection.cs`
- Create: `tests/MarketPulse.UnitTests/Identity/CurrentUserTests.cs`

**Interfaces:**
- Consumes: nothing from earlier tasks (Task 1 only added packages/config).
- Produces: `ICurrentUser` (`Guid? UserId`, `string? Email`, `bool IsAuthenticated`) in `MarketPulse.Application.Auth`, consumed by future application-layer features. `ApplicationUser : IdentityUser<Guid>` and `ApplicationDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>` in `MarketPulse.Infrastructure.Identity`, consumed by Task 3 and Task 4. `AddInfrastructure(IServiceCollection, IConfiguration)` extension method in `MarketPulse.Infrastructure.DependencyInjection`, consumed by Task 3's `Program.cs`.

- [ ] **Step 1: Write the failing test for `CurrentUser`**

Create `tests/MarketPulse.UnitTests/Identity/CurrentUserTests.cs`:

```csharp
using System.Security.Claims;
using MarketPulse.Infrastructure.Identity;
using Microsoft.AspNetCore.Http;

namespace MarketPulse.UnitTests.Identity;

public class CurrentUserTests
{
    [Fact]
    public void Authenticated_user_exposes_id_and_email()
    {
        var userId = Guid.NewGuid();
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, "user@example.com"),
        };
        var identity = new ClaimsIdentity(claims, authenticationType: "TestAuth");
        var accessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };

        var currentUser = new CurrentUser(accessor);

        Assert.True(currentUser.IsAuthenticated);
        Assert.Equal(userId, currentUser.UserId);
        Assert.Equal("user@example.com", currentUser.Email);
    }

    [Fact]
    public void Anonymous_request_exposes_no_identity()
    {
        var accessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext()
        };

        var currentUser = new CurrentUser(accessor);

        Assert.False(currentUser.IsAuthenticated);
        Assert.Null(currentUser.UserId);
        Assert.Null(currentUser.Email);
    }

    [Fact]
    public void No_http_context_exposes_no_identity()
    {
        var accessor = new HttpContextAccessor();

        var currentUser = new CurrentUser(accessor);

        Assert.False(currentUser.IsAuthenticated);
        Assert.Null(currentUser.UserId);
        Assert.Null(currentUser.Email);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails to compile (types don't exist yet)**

Run: `dotnet test tests/MarketPulse.UnitTests --filter FullyQualifiedName~CurrentUserTests`
Expected: FAIL — build error, `MarketPulse.Infrastructure.Identity.CurrentUser` does not exist.

- [ ] **Step 3: Create `ICurrentUser`**

Create `src/MarketPulse.Application/Auth/ICurrentUser.cs`:

```csharp
namespace MarketPulse.Application.Auth;

public interface ICurrentUser
{
    Guid? UserId { get; }

    string? Email { get; }

    bool IsAuthenticated { get; }
}
```

- [ ] **Step 4: Create `ApplicationUser`**

Create `src/MarketPulse.Infrastructure/Identity/ApplicationUser.cs`:

```csharp
using Microsoft.AspNetCore.Identity;

namespace MarketPulse.Infrastructure.Identity;

public sealed class ApplicationUser : IdentityUser<Guid>;
```

- [ ] **Step 5: Create `ApplicationDbContext`**

Create `src/MarketPulse.Infrastructure/Identity/ApplicationDbContext.cs`:

```csharp
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace MarketPulse.Infrastructure.Identity;

public sealed class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options);
```

- [ ] **Step 6: Implement `CurrentUser`**

Create `src/MarketPulse.Infrastructure/Identity/CurrentUser.cs`:

```csharp
using System.Security.Claims;
using MarketPulse.Application.Auth;
using Microsoft.AspNetCore.Http;

namespace MarketPulse.Infrastructure.Identity;

public sealed class CurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    public Guid? UserId
    {
        get
        {
            var value = httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public string? Email => httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Email);

    public bool IsAuthenticated => httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;
}
```

- [ ] **Step 7: Add Infrastructure dependency injection wiring**

Create `src/MarketPulse.Infrastructure/DependencyInjection.cs`:

```csharp
using MarketPulse.Application.Auth;
using MarketPulse.Infrastructure.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MarketPulse.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("Postgres")));

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, CurrentUser>();

        return services;
    }
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `dotnet test tests/MarketPulse.UnitTests --filter FullyQualifiedName~CurrentUserTests`
Expected: PASS (3 tests).

- [ ] **Step 9: Run the full unit test suite**

Run: `dotnet test tests/MarketPulse.UnitTests`
Expected: PASS, no regressions.

- [ ] **Step 10: Commit**

```bash
git add src/MarketPulse.Application/Auth/ICurrentUser.cs src/MarketPulse.Infrastructure/Identity/ApplicationUser.cs src/MarketPulse.Infrastructure/Identity/ApplicationDbContext.cs src/MarketPulse.Infrastructure/Identity/CurrentUser.cs src/MarketPulse.Infrastructure/DependencyInjection.cs tests/MarketPulse.UnitTests/Identity/CurrentUserTests.cs
git commit -m "Add ICurrentUser port and Identity data model"
```

---

### Task 3: Wire cookie authentication and add register/login/logout/me endpoints

**Files:**
- Modify: `src/MarketPulse.Api/Program.cs`
- Create: `src/MarketPulse.Api/Auth/AuthContracts.cs`
- Create: `src/MarketPulse.Api/Endpoints/AuthEndpoints.cs`
- Create: `src/MarketPulse.Infrastructure/Identity/Migrations/` (generated by `dotnet ef migrations add`)
- Create: `tests/MarketPulse.IntegrationTests/TestInfrastructure/PostgresApiFactory.cs`
- Create: `tests/MarketPulse.IntegrationTests/Auth/AuthEndpointsTests.cs`
- Delete: `tests/MarketPulse.IntegrationTests/UnitTest1.cs` (placeholder, no longer needed)

**Interfaces:**
- Consumes: `ApplicationUser`, `ApplicationDbContext`, `AddInfrastructure` from Task 2.
- Produces: `RegisterRequest(string Email, string Password)`, `LoginRequest(string Email, string Password)`, `MeResponse(Guid Id, string Email, bool HasPassword, IReadOnlyCollection<string> ExternalLogins)` in `MarketPulse.Api.Auth`. `AuthEndpoints.MapAuthEndpoints(this IEndpointRouteBuilder)` in `MarketPulse.Api.Endpoints`, extended by Task 4. `PostgresApiFactory` (a `WebApplicationFactory<Program>` backed by a Testcontainers PostgreSQL instance, with `ConnectionStrings:Postgres` and dummy `Authentication:Google:*` values pre-configured) in `MarketPulse.IntegrationTests.TestInfrastructure`, reused by Task 4's integration tests.

- [ ] **Step 1: Write the failing integration test for register/login/logout/me**

Create `tests/MarketPulse.IntegrationTests/TestInfrastructure/PostgresApiFactory.cs`:

```csharp
using MarketPulse.Infrastructure.Identity;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;

namespace MarketPulse.IntegrationTests.TestInfrastructure;

public sealed class PostgresApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("marketpulse_test")
        .WithUsername("marketpulse")
        .WithPassword("marketpulse")
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Postgres"] = _postgres.GetConnectionString(),
                ["Authentication:Google:ClientId"] = "test-client-id",
                ["Authentication:Google:ClientSecret"] = "test-client-secret",
            });
        });
    }

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync();
    }

    public new async Task DisposeAsync()
    {
        await _postgres.DisposeAsync();
        await base.DisposeAsync();
    }
}
```

Create `tests/MarketPulse.IntegrationTests/Auth/AuthEndpointsTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using MarketPulse.Api.Auth;
using MarketPulse.IntegrationTests.TestInfrastructure;

namespace MarketPulse.IntegrationTests.Auth;

public class AuthEndpointsTests(PostgresApiFactory factory) : IClassFixture<PostgresApiFactory>
{
    [Fact]
    public async Task Register_then_me_returns_authenticated_user()
    {
        using var client = factory.CreateClient();
        var email = $"user-{Guid.NewGuid():N}@example.com";

        var registerResponse = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest(email, "P@ssword123!"));
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        var meResponse = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);

        var me = await meResponse.Content.ReadFromJsonAsync<MeResponse>();
        Assert.NotNull(me);
        Assert.Equal(email, me!.Email);
        Assert.True(me.HasPassword);
    }

    [Fact]
    public async Task Me_returns_unauthorized_when_anonymous()
    {
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/v1/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Duplicate_email_registration_is_rejected()
    {
        using var client = factory.CreateClient();
        var email = $"dup-{Guid.NewGuid():N}@example.com";

        var first = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest(email, "P@ssword123!"));
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);

        var second = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest(email, "AnotherP@ss123!"));
        Assert.Equal(HttpStatusCode.BadRequest, second.StatusCode);
    }

    [Fact]
    public async Task Login_then_logout_clears_session()
    {
        using var client = factory.CreateClient();
        var email = $"login-{Guid.NewGuid():N}@example.com";
        const string password = "P@ssword123!";

        var registerResponse = await client.PostAsJsonAsync("/api/v1/auth/register", new RegisterRequest(email, password));
        Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

        var logoutResponse = await client.PostAsync("/api/v1/auth/logout", content: null);
        Assert.Equal(HttpStatusCode.OK, logoutResponse.StatusCode);

        var meAfterLogout = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, meAfterLogout.StatusCode);

        var loginResponse = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, password));
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var meAfterLogin = await client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.OK, meAfterLogin.StatusCode);
    }
}
```

Delete the placeholder `tests/MarketPulse.IntegrationTests/UnitTest1.cs`.

- [ ] **Step 2: Run the tests to verify they fail to compile**

Run: `dotnet test tests/MarketPulse.IntegrationTests --filter FullyQualifiedName~AuthEndpointsTests`
Expected: FAIL — build errors (`MarketPulse.Api.Auth.RegisterRequest` etc. don't exist yet, `/api/v1/auth/*` routes don't exist).

- [ ] **Step 3: Create the auth request/response contracts**

Create `src/MarketPulse.Api/Auth/AuthContracts.cs`:

```csharp
namespace MarketPulse.Api.Auth;

public sealed record RegisterRequest(string Email, string Password);

public sealed record LoginRequest(string Email, string Password);

public sealed record MeResponse(Guid Id, string Email, bool HasPassword, IReadOnlyCollection<string> ExternalLogins);
```

- [ ] **Step 4: Implement the register/login/logout/me endpoints**

Create `src/MarketPulse.Api/Endpoints/AuthEndpoints.cs`:

```csharp
using System.Security.Claims;
using MarketPulse.Api.Auth;
using MarketPulse.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace MarketPulse.Api.Endpoints;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth");

        group.MapPost("/register", async (
            RegisterRequest request,
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager) =>
        {
            var user = new ApplicationUser { UserName = request.Email, Email = request.Email };
            var result = await userManager.CreateAsync(user, request.Password);
            if (!result.Succeeded)
            {
                return Results.ValidationProblem(
                    result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description }));
            }

            await signInManager.SignInAsync(user, isPersistent: false);
            return Results.Ok();
        });

        group.MapPost("/login", async (
            LoginRequest request,
            SignInManager<ApplicationUser> signInManager) =>
        {
            var result = await signInManager.PasswordSignInAsync(
                request.Email, request.Password, isPersistent: false, lockoutOnFailure: false);
            return result.Succeeded ? Results.Ok() : Results.Unauthorized();
        });

        group.MapPost("/logout", async (SignInManager<ApplicationUser> signInManager) =>
        {
            await signInManager.SignOutAsync();
            return Results.Ok();
        }).RequireAuthorization();

        group.MapGet("/me", async (
            ClaimsPrincipal principal,
            UserManager<ApplicationUser> userManager) =>
        {
            var user = await userManager.GetUserAsync(principal);
            if (user is null)
            {
                return Results.Unauthorized();
            }

            var logins = await userManager.GetLoginsAsync(user);
            var hasPassword = await userManager.HasPasswordAsync(user);

            return Results.Ok(new MeResponse(
                user.Id,
                user.Email!,
                hasPassword,
                logins.Select(l => l.LoginProvider).ToArray()));
        }).RequireAuthorization();

        return group;
    }
}
```

- [ ] **Step 5: Wire Identity, cookie authentication, and the endpoints into `Program.cs`**

Replace `src/MarketPulse.Api/Program.cs` with:

```csharp
using MarketPulse.Api.Endpoints;
using MarketPulse.Infrastructure;
using MarketPulse.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddInfrastructure(builder.Configuration);

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.SignIn.RequireConfirmedAccount = false;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<ApplicationDbContext>()
    .AddSignInManager()
    .AddDefaultTokenProviders();

builder.Services
    .AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddIdentityCookies();

builder.Services.AddAuthorization();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();

app.Run();

public partial class Program;
```

(`public partial class Program;` makes the top-level-statement `Program` class accessible to `WebApplicationFactory<Program>` in the test project. The `WeatherForecast` sample record from the template is removed as unused.)

- [ ] **Step 6: Generate the initial EF Core migration**

Run (install the tool first if needed: `dotnet tool install --global dotnet-ef`):

```bash
dotnet ef migrations add InitialIdentity \
  --project src/MarketPulse.Infrastructure \
  --startup-project src/MarketPulse.Api \
  --output-dir Identity/Migrations
```

Expected: migration files are created under `src/MarketPulse.Infrastructure/Identity/Migrations/`, containing the standard ASP.NET Core Identity schema (AspNetUsers, AspNetRoles, AspNetUserLogins, etc.).

- [ ] **Step 7: Run the integration tests to verify they pass**

Run: `dotnet test tests/MarketPulse.IntegrationTests --filter FullyQualifiedName~AuthEndpointsTests`
Expected: PASS (4 tests). Requires Docker running locally (Testcontainers starts a real PostgreSQL container).

- [ ] **Step 8: Run the full test suite and full build**

Run: `dotnet build MarketPulse.slnx && dotnet test MarketPulse.slnx`
Expected: PASS, no regressions.

- [ ] **Step 9: Commit**

```bash
git add src/MarketPulse.Api/Program.cs src/MarketPulse.Api/Auth/AuthContracts.cs src/MarketPulse.Api/Endpoints/AuthEndpoints.cs src/MarketPulse.Infrastructure/Identity/Migrations tests/MarketPulse.IntegrationTests/TestInfrastructure/PostgresApiFactory.cs tests/MarketPulse.IntegrationTests/Auth/AuthEndpointsTests.cs
git rm tests/MarketPulse.IntegrationTests/UnitTest1.cs
git commit -m "Wire cookie authentication and add register/login/logout/me endpoints"
```

---

### Task 4: Add Google external login with auto-provisioning

**Files:**
- Create: `src/MarketPulse.Application/Auth/RedirectUrlValidator.cs`
- Create: `tests/MarketPulse.UnitTests/Auth/RedirectUrlValidatorTests.cs`
- Create: `src/MarketPulse.Infrastructure/Identity/GoogleExternalLoginProvisioner.cs`
- Create: `tests/MarketPulse.IntegrationTests/Auth/GoogleExternalLoginProvisionerTests.cs`
- Modify: `src/MarketPulse.Api/Endpoints/AuthEndpoints.cs`
- Modify: `src/MarketPulse.Api/Program.cs`
- Modify: `src/MarketPulse.Infrastructure/DependencyInjection.cs`

**Interfaces:**
- Consumes: `ApplicationUser`, `AddInfrastructure` from Task 2; `AuthEndpoints.MapAuthEndpoints`, `PostgresApiFactory` from Task 3.
- Produces: `RedirectUrlValidator.SafeOrDefault(string? returnUrl, IReadOnlyCollection<string> allowedOrigins, string defaultUrl) : string` in `MarketPulse.Application.Auth`. `ExternalLoginDetails(string Provider, string ProviderKey, string Email, string DisplayName)` and `GoogleExternalLoginProvisioner.ProvisionOrSignInAsync(ExternalLoginDetails, CancellationToken) : Task<ApplicationUser>` in `MarketPulse.Infrastructure.Identity`.

- [ ] **Step 1: Write the failing unit tests for `RedirectUrlValidator`**

Create `tests/MarketPulse.UnitTests/Auth/RedirectUrlValidatorTests.cs`:

```csharp
using MarketPulse.Application.Auth;

namespace MarketPulse.UnitTests.Auth;

public class RedirectUrlValidatorTests
{
    private static readonly string[] AllowedOrigins = ["http://localhost:4200"];
    private const string DefaultUrl = "http://localhost:4200";

    [Fact]
    public void Allowed_origin_is_returned_unchanged()
    {
        var result = RedirectUrlValidator.SafeOrDefault("http://localhost:4200/dashboard", AllowedOrigins, DefaultUrl);
        Assert.Equal("http://localhost:4200/dashboard", result);
    }

    [Fact]
    public void Disallowed_origin_falls_back_to_default()
    {
        var result = RedirectUrlValidator.SafeOrDefault("https://evil.example.com/steal", AllowedOrigins, DefaultUrl);
        Assert.Equal(DefaultUrl, result);
    }

    [Fact]
    public void Null_or_whitespace_returns_default()
    {
        Assert.Equal(DefaultUrl, RedirectUrlValidator.SafeOrDefault(null, AllowedOrigins, DefaultUrl));
        Assert.Equal(DefaultUrl, RedirectUrlValidator.SafeOrDefault("   ", AllowedOrigins, DefaultUrl));
    }

    [Fact]
    public void Malformed_url_returns_default()
    {
        var result = RedirectUrlValidator.SafeOrDefault("not a url", AllowedOrigins, DefaultUrl);
        Assert.Equal(DefaultUrl, result);
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail to compile**

Run: `dotnet test tests/MarketPulse.UnitTests --filter FullyQualifiedName~RedirectUrlValidatorTests`
Expected: FAIL — `MarketPulse.Application.Auth.RedirectUrlValidator` does not exist.

- [ ] **Step 3: Implement `RedirectUrlValidator`**

Create `src/MarketPulse.Application/Auth/RedirectUrlValidator.cs`:

```csharp
namespace MarketPulse.Application.Auth;

public static class RedirectUrlValidator
{
    public static string SafeOrDefault(string? returnUrl, IReadOnlyCollection<string> allowedOrigins, string defaultUrl)
    {
        if (string.IsNullOrWhiteSpace(returnUrl))
        {
            return defaultUrl;
        }

        if (!Uri.TryCreate(returnUrl, UriKind.Absolute, out var uri))
        {
            return defaultUrl;
        }

        var origin = uri.GetLeftPart(UriPartial.Authority);
        return allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase)
            ? returnUrl
            : defaultUrl;
    }
}
```

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `dotnet test tests/MarketPulse.UnitTests --filter FullyQualifiedName~RedirectUrlValidatorTests`
Expected: PASS (4 tests).

- [ ] **Step 5: Write the failing integration tests for the Google provisioning logic**

Create `tests/MarketPulse.IntegrationTests/Auth/GoogleExternalLoginProvisionerTests.cs`:

```csharp
using MarketPulse.IntegrationTests.TestInfrastructure;
using MarketPulse.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace MarketPulse.IntegrationTests.Auth;

public class GoogleExternalLoginProvisionerTests(PostgresApiFactory factory) : IClassFixture<PostgresApiFactory>
{
    [Fact]
    public async Task First_sign_in_provisions_new_user_and_links_login()
    {
        using var scope = factory.Services.CreateScope();
        var provisioner = scope.ServiceProvider.GetRequiredService<GoogleExternalLoginProvisioner>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

        var email = $"google-{Guid.NewGuid():N}@example.com";
        var details = new ExternalLoginDetails("Google", $"google-key-{Guid.NewGuid():N}", email, "Test User");

        var user = await provisioner.ProvisionOrSignInAsync(details);

        Assert.Equal(email, user.Email);
        var logins = await userManager.GetLoginsAsync(user);
        Assert.Contains(logins, l => l.LoginProvider == "Google" && l.ProviderKey == details.ProviderKey);
    }

    [Fact]
    public async Task Second_sign_in_with_same_external_identity_reuses_user()
    {
        using var scope = factory.Services.CreateScope();
        var provisioner = scope.ServiceProvider.GetRequiredService<GoogleExternalLoginProvisioner>();

        var email = $"google-{Guid.NewGuid():N}@example.com";
        var providerKey = $"google-key-{Guid.NewGuid():N}";
        var details = new ExternalLoginDetails("Google", providerKey, email, "Test User");

        var firstUser = await provisioner.ProvisionOrSignInAsync(details);
        var secondUser = await provisioner.ProvisionOrSignInAsync(details);

        Assert.Equal(firstUser.Id, secondUser.Id);
    }
}
```

- [ ] **Step 6: Run the tests to verify they fail to compile**

Run: `dotnet test tests/MarketPulse.IntegrationTests --filter FullyQualifiedName~GoogleExternalLoginProvisionerTests`
Expected: FAIL — `MarketPulse.Infrastructure.Identity.GoogleExternalLoginProvisioner` and `ExternalLoginDetails` don't exist yet.

- [ ] **Step 7: Implement `GoogleExternalLoginProvisioner`**

Create `src/MarketPulse.Infrastructure/Identity/GoogleExternalLoginProvisioner.cs`:

```csharp
using Microsoft.AspNetCore.Identity;

namespace MarketPulse.Infrastructure.Identity;

public sealed record ExternalLoginDetails(string Provider, string ProviderKey, string Email, string DisplayName);

public sealed class GoogleExternalLoginProvisioner(UserManager<ApplicationUser> userManager)
{
    public async Task<ApplicationUser> ProvisionOrSignInAsync(
        ExternalLoginDetails details, CancellationToken cancellationToken = default)
    {
        var existingUser = await userManager.FindByLoginAsync(details.Provider, details.ProviderKey);
        if (existingUser is not null)
        {
            return existingUser;
        }

        var user = await userManager.FindByEmailAsync(details.Email);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = details.Email,
                Email = details.Email,
                EmailConfirmed = true,
            };

            var createResult = await userManager.CreateAsync(user);
            if (!createResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Failed to provision user for {details.Email}: {string.Join(", ", createResult.Errors.Select(e => e.Description))}");
            }
        }

        var addLoginResult = await userManager.AddLoginAsync(
            user, new UserLoginInfo(details.Provider, details.ProviderKey, details.DisplayName));
        if (!addLoginResult.Succeeded)
        {
            throw new InvalidOperationException(
                $"Failed to link external login for {details.Email}: {string.Join(", ", addLoginResult.Errors.Select(e => e.Description))}");
        }

        return user;
    }
}
```

- [ ] **Step 8: Register `GoogleExternalLoginProvisioner` in `DependencyInjection.cs`**

Modify `src/MarketPulse.Infrastructure/DependencyInjection.cs` — add one line inside `AddInfrastructure`, right after `services.AddScoped<ICurrentUser, CurrentUser>();`:

```csharp
        services.AddScoped<GoogleExternalLoginProvisioner>();
```

Full resulting method body:

```csharp
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("Postgres")));

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUser, CurrentUser>();
        services.AddScoped<GoogleExternalLoginProvisioner>();

        return services;
    }
```

- [ ] **Step 9: Add the Google challenge/callback endpoints**

Modify `src/MarketPulse.Api/Endpoints/AuthEndpoints.cs` — add `using MarketPulse.Application.Auth;` and `using Microsoft.AspNetCore.Authentication.Google;` at the top, and insert the following two routes inside `MapAuthEndpoints`, right before the final `return group;`:

```csharp
        group.MapGet("/google/login", (
            SignInManager<ApplicationUser> signInManager,
            IConfiguration configuration,
            LinkGenerator linkGenerator,
            HttpContext httpContext,
            string? returnUrl) =>
        {
            var allowedOrigins = configuration.GetSection("Auth:AllowedReturnUrls").Get<string[]>() ?? [];
            var defaultReturnUrl = configuration["Auth:DefaultReturnUrl"] ?? allowedOrigins.FirstOrDefault() ?? "/";
            var safeReturnUrl = RedirectUrlValidator.SafeOrDefault(returnUrl, allowedOrigins, defaultReturnUrl);

            var callbackUrl = linkGenerator.GetUriByName(httpContext, "google-callback")
                ?? throw new InvalidOperationException("google-callback route is not registered.");

            var properties = signInManager.ConfigureExternalAuthenticationProperties(
                GoogleDefaults.AuthenticationScheme, callbackUrl);
            properties.Items["returnUrl"] = safeReturnUrl;

            return Results.Challenge(properties, [GoogleDefaults.AuthenticationScheme]);
        });

        group.MapGet("/google/callback", async (
            SignInManager<ApplicationUser> signInManager,
            GoogleExternalLoginProvisioner provisioner,
            IConfiguration configuration) =>
        {
            var allowedOrigins = configuration.GetSection("Auth:AllowedReturnUrls").Get<string[]>() ?? [];
            var defaultReturnUrl = configuration["Auth:DefaultReturnUrl"] ?? allowedOrigins.FirstOrDefault() ?? "/";

            var info = await signInManager.GetExternalLoginInfoAsync();
            if (info is null)
            {
                return Results.Redirect($"{defaultReturnUrl}?error=external_login_failed");
            }

            var returnUrl = info.AuthenticationProperties?.Items.GetValueOrDefault("returnUrl") ?? defaultReturnUrl;
            var email = info.Principal.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrEmpty(email))
            {
                return Results.Redirect($"{returnUrl}?error=missing_email");
            }

            var details = new ExternalLoginDetails(
                info.LoginProvider, info.ProviderKey, email, info.ProviderDisplayName ?? email);
            var user = await provisioner.ProvisionOrSignInAsync(details);

            await signInManager.SignInAsync(user, isPersistent: false);
            return Results.Redirect(returnUrl);
        }).WithName("google-callback");
```

- [ ] **Step 10: Register the Google authentication handler in `Program.cs`**

Modify `src/MarketPulse.Api/Program.cs` — add `using Microsoft.AspNetCore.Authentication.Google;` at the top, and change the authentication registration block from:

```csharp
builder.Services
    .AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddIdentityCookies();
```

to:

```csharp
builder.Services
    .AddAuthentication(IdentityConstants.ApplicationScheme)
    .AddIdentityCookies()
    .AddGoogle(GoogleDefaults.AuthenticationScheme, options =>
    {
        options.ClientId = builder.Configuration["Authentication:Google:ClientId"]
            ?? throw new InvalidOperationException("Authentication:Google:ClientId is not configured.");
        options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"]
            ?? throw new InvalidOperationException("Authentication:Google:ClientSecret is not configured.");
        options.SignInScheme = IdentityConstants.ExternalScheme;
    });
```

- [ ] **Step 11: Run the Google provisioning integration tests to verify they pass**

Run: `dotnet test tests/MarketPulse.IntegrationTests --filter FullyQualifiedName~GoogleExternalLoginProvisionerTests`
Expected: PASS (2 tests).

- [ ] **Step 12: Run the full test suite and full build**

Run: `dotnet build MarketPulse.slnx && dotnet test MarketPulse.slnx`
Expected: PASS, no regressions. (Running `MarketPulse.Api` itself now requires `Authentication:Google:ClientId`/`ClientSecret` to be set via user secrets or environment — see the README section added in Task 1. `dotnet ef` design-time commands need the same two values available in the environment to build the host.)

- [ ] **Step 13: Commit**

```bash
git add src/MarketPulse.Application/Auth/RedirectUrlValidator.cs tests/MarketPulse.UnitTests/Auth/RedirectUrlValidatorTests.cs src/MarketPulse.Infrastructure/Identity/GoogleExternalLoginProvisioner.cs tests/MarketPulse.IntegrationTests/Auth/GoogleExternalLoginProvisionerTests.cs src/MarketPulse.Api/Endpoints/AuthEndpoints.cs src/MarketPulse.Api/Program.cs src/MarketPulse.Infrastructure/DependencyInjection.cs
git commit -m "Add Google external login with auto-provisioning"
```

## Self-review

- **Spec coverage:** local register/login/logout (Task 3), `GET /me` (Task 3), Google sign-in with auto-provisioning (Task 4), `ICurrentUser` Application-layer port (Task 2), Identity-stays-infrastructure-only layering (Task 2), EF Core + PostgreSQL storage and initial migration (Task 3), redirect allow-listing (Task 4), user-secrets-based Google config (Task 1), unit + integration test coverage per the spec's testing strategy (Tasks 2–4) are all assigned to a task.
- **Deferred requirements:** roles/authorization policies, email confirmation, password reset, lockout tuning, 2FA, and production cookie-domain/hosting topology are named out of scope in Global Constraints, matching the spec — no task implies they're covered.
- **Placeholder scan:** no TBD/TODO; every step has literal file content or an exact command.
- **Type/interface consistency:** `RegisterRequest`/`LoginRequest`/`MeResponse` (Task 3) match the endpoint bodies that use them; `ExternalLoginDetails` and `GoogleExternalLoginProvisioner.ProvisionOrSignInAsync` (Task 4) match both the endpoint call site and the integration tests; `RedirectUrlValidator.SafeOrDefault`'s signature is identical between its Task 4 implementation, its unit tests, and its use in `AuthEndpoints`.
