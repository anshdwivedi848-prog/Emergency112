# Emergency112

Emergency112 is a college demonstration project for a simulated emergency reporting workflow. It is not an official government service and is not connected to emergency operators. The optional Android SOS Call feature can place a real call only to a contact configured by the project owner; it does not call emergency services, send SMS, or dispatch responders.

> **DEMO ONLY — NOT CONNECTED TO REAL EMERGENCY SERVICES.**

## Architecture

- **Citizen and admin website:** React, TypeScript, Vite, React Router.
- **API:** ASP.NET Core Web API on .NET 10, with development-only Swagger UI.
- **Authentication:** ASP.NET Core Identity with hashed passwords and HttpOnly, SameSite cookies. Admin authorization is enforced by API role policies.
- **Database:** SQLite accessed through Entity Framework Core migrations.
- **Android citizen app:** React Native on Expo SDK 57; it uses the same API and Identity-backed citizen records as the website.
- **Local development:** Vite forwards `/api` requests to the API at `http://127.0.0.1:5081`, so browser requests use the same origin as the website.

See [docs/architecture.md](docs/architecture.md) and [docs/database-relationships.md](docs/database-relationships.md) for diagrams.

## Folder structure

```text
src/                              React citizen and admin website
  components/                     Shared layout, icons, route guards
  lib/                            API client, auth context, form validation
  pages/                          Citizen, authentication, and admin pages
backend/
  Emergency112.slnx                .NET solution
  src/Emergency112.Api/
    Contracts/                     Validated API request and response types
    Controllers/                   Auth, citizen incident, admin endpoints
    Data/                           EF Core context, seed logic, migrations
    Domain/                         Incident category, severity, and status enums
    Models/                         Identity and incident entities
    Services/                       API-to-domain response mapping
  tests/Emergency112.Api.Tests/     xUnit API integration tests
docs/                              Architecture and data relationship diagrams
mobile/                            Expo Android citizen app and EAS APK profile
```

## Prerequisites

- .NET 10 SDK.
- Node.js 22 or later and pnpm 10 or later (or a compatible recent pnpm release).
- A modern browser.
- Android Studio/Android SDK is optional for the cloud EAS APK build; an Expo account is required to submit that build.

No hosted service, paid API, Android app, or external emergency integration is required.

## Start the local demonstration

Open two PowerShell terminals from the project root.

### 1. Start the API

Set an administrator email and a private Development-only password in the API process environment. The credentials are not committed to the project; use a unique demo password and do not reuse a personal password.

```powershell
$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:Seed__AdminEmail = 'admin@example.test'
$env:Seed__AdminPassword = 'Replace-With-A-Private-12-Character-Password!'
dotnet run --project backend/src/Emergency112.Api/Emergency112.Api.csproj --launch-profile Emergency112.Api
```

The API listens at `http://127.0.0.1:5081`. Development startup applies pending EF migrations, seeds Citizen and Admin roles and clearly fictional response units, and creates the configured administrator account if one does not already exist. No sample incidents or default credentials are seeded. Swagger is at `http://127.0.0.1:5081/swagger`.

If you are using the project-local SDK downloaded during this setup, replace `dotnet` in the commands with `./.tools/dotnet/dotnet.exe` (or `\.tools\dotnet\dotnet.exe` in PowerShell).

### 2. Start the website

```powershell
pnpm install
pnpm dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The Vite development proxy sends `/api` calls to the API above. The configured emergency contact is a non-routable placeholder in `src/config.ts`; it is kept separate from the incident API and only appears in a user-selected `tel:` link.

### Accounts and dashboard

- Create a citizen account at `/register`. The account can create simulated incidents and view or delete its own unreviewed records.
- Sign in at `/sign-in` with the Development administrator email and password to open `/admin`.
- Self-registration always assigns the Citizen role. It cannot create administrators.
- Administrator tools list/filter records, change status, assign fictional response units, and review the audit activity log. Every status change follows the server's transition rules and is stored in the database.
- Never use real personal, contact, or incident information in this demo.

## Android APK demonstration

The React Native app in `mobile/` signs citizens into the same API and supports profile updates, trusted-contact storage, simulated incident submission, history, detail timelines, and status refresh. Its optional SOS Call feature can place a phone call to the configured demo contact after a cancellable countdown; it does not notify or dispatch emergency responders. For setup, profile migrations, physical-phone networking, EAS source-upload exclusions, APK installation, and troubleshooting, see [mobile/README.md](mobile/README.md).

For a physical Android phone, set `EXPO_PUBLIC_API_BASE_URL` in the ignored `mobile/.env.local` file to `http://<laptop-private-Wi-Fi-IPv4>:5081/api`. The API must be started with the `Emergency112 LAN` launch profile and the phone must be on the same private Wi-Fi network. Never use `localhost` or `127.0.0.1` as the phone's API address. Keep local API and SOS destination values out of Git; see [mobile/README.md](mobile/README.md) for cloud build configuration. This local HTTP setup is intended only for a trusted demonstration network; use HTTPS before using any non-demo or public network.

## API overview

All endpoints are under `/api`. Authentication uses an HttpOnly cookie; browser fetch calls include credentials. A 401 from a protected endpoint means the session is missing or expired; a 401 from sign-in means the supplied credentials were not accepted. A 403 means the signed-in user lacks the required role.

| Method | Route | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | Health and simulated-mode check |
| `POST` | `/api/auth/register` | Public | Create Citizen account and sign in |
| `POST` | `/api/auth/login` | Public | Sign in |
| `POST` | `/api/auth/logout` | Signed in | End session |
| `GET` | `/api/auth/me` | Signed in | Current account and roles |
| `GET` | `/api/profile` | Citizen | Retrieve profile and optional trusted-contact details |
| `PUT` | `/api/profile` | Citizen | Update full name, phone number, and trusted contact |
| `POST` | `/api/incidents` | Citizen | Create a simulated incident |
| `GET` | `/api/incidents` | Citizen | List the current citizen's incidents |
| `GET` | `/api/incidents/{id}` | Citizen owner | View incident and status timeline |
| `DELETE` | `/api/incidents/{id}` | Citizen owner | Delete only an unreviewed incident |
| `GET` | `/api/admin/dashboard` | Admin | Summary statistics |
| `GET` | `/api/admin/incidents` | Admin | Search and filter the incident queue (`search`, `category`, `severity`, `status`, `from`, `to`) |
| `GET` | `/api/admin/incidents/{id}` | Admin | Incident details, timeline, and assignments |
| `PUT` | `/api/admin/incidents/{id}/status` | Admin | Apply a valid status transition |
| `GET` | `/api/admin/units` | Admin | Fictional response units |
| `POST` | `/api/admin/incidents/{id}/assignments` | Admin | Assign a matching simulated unit |
| `GET` | `/api/admin/activity` | Admin | Recent audit events |

Status progression is `Received → UnderReview → Assigned → Resolved`, with `UnderReview → Resolved` and `Assigned → UnderReview` also permitted. `Resolved` is terminal. Invalid transitions return HTTP 409. Invalid request fields return HTTP 400 with validation details. Citizen access to another account's records returns 404 to avoid disclosing their existence.

## Database and migrations

The default SQLite file is `backend/src/Emergency112.Api/emergency112.db` when launched with the project profile. Its path is configured using `ConnectionStrings__DefaultConnection` (for example `Data Source=emergency112.db`).

For migration authoring, install the matching EF CLI once (choose either local tool manifest or global installation):

```powershell
dotnet tool install --global dotnet-ef --version 10.0.12
```

From the repository root, create or apply migrations:

```powershell
dotnet ef migrations add DescribeChange `
  --project backend/src/Emergency112.Api/Emergency112.Api.csproj `
  --startup-project backend/src/Emergency112.Api/Emergency112.Api.csproj `
  --output-dir Data/Migrations

dotnet ef database update `
  --project backend/src/Emergency112.Api/Emergency112.Api.csproj `
  --startup-project backend/src/Emergency112.Api/Emergency112.Api.csproj
```

Development mode applies migrations automatically on API startup. Outside Development, apply migrations before starting the API; production startup seeds roles and fictional unit reference data but does not run schema changes or create an admin account.

## Configuration

Configuration uses standard ASP.NET Core configuration providers. For environment variables, replace `:` with `__`.

| Setting | Default / purpose |
|---|---|
| `ConnectionStrings__DefaultConnection` | `Data Source=emergency112.db` |
| `Frontend__AllowedOrigins__0` | `http://127.0.0.1:5173` |
| `Frontend__AllowedOrigins__1` | `http://localhost:5173` |
| `Seed__AdminEmail` | Required to create a Development admin account |
| `Seed__AdminPassword` | Required to create a Development admin account; keep it outside source control |
| `VITE_API_BASE_URL` | Defaults to `/api`; set only when the API is hosted elsewhere |

Identity requires a 12-character password with uppercase, lowercase, digit, and non-alphanumeric characters. Cookies use ASP.NET Core's data-protection key ring. Production cookies require HTTPS; configure a persistent protected key store for multi-instance hosting. Keep the allowed CORS origins narrow and HTTPS-only for a deployed environment.

## Tests and builds

```powershell
dotnet test backend/Emergency112.slnx
pnpm test
pnpm build
```

The xUnit suite uses an in-memory SQLite database and covers migrations, registration/login, incident persistence and validation, citizen ownership boundaries, admin authorization, status transitions, status history, unit assignment, audit events, and deletion. Vitest covers API request credentials/errors, form validation, and denied geolocation fallback.

## Troubleshooting

- **Website shows an API connection message:** start the API first and confirm `/api/health` returns `200` at `http://127.0.0.1:5081/api/health`.
- **Port 5081 is already in use:** stop the other local API process or change `applicationUrl` in `backend/src/Emergency112.Api/Properties/launchSettings.json` and the Vite proxy target in `vite.config.ts` together.
- **Port 5173 is already in use:** Vite is configured with `strictPort`; stop the other dev server or change the Vite port and the `Frontend:AllowedOrigins` entries.
- **Admin sign-in does not work:** set `Seed__AdminEmail` and `Seed__AdminPassword` before starting in Development. Seed credentials are created once and are not reset if the environment variable is later changed; update the account through an Identity maintenance workflow or use a fresh local demo database.
- **Database migration errors:** verify the configured SQLite file directory is writable, then run `dotnet ef database update` from the repository root.
- **Location denied:** the report form allows manual location text and does not request permission until the user selects the location button.
- **Contact button behavior:** it only opens the device's configured phone application after a user click. No automatic call, message, or incident dispatch exists.
