# Emergency112 architecture

```mermaid
flowchart LR
  Citizen[Citizen browser]
  Admin[Administrator browser]
  Web[React + TypeScript + Vite website]
  Proxy[Vite /api development proxy]
  Api[ASP.NET Core Web API]
  Identity[ASP.NET Core Identity\nHttpOnly SameSite cookie]
  Authz[Citizen/Admin role authorization]
  EF[Entity Framework Core]
  SQLite[(SQLite local database)]
  Swagger[Swagger UI\nDevelopment only]

  Citizen --> Web
  Admin --> Web
  Web -->|Cookie-authenticated /api requests| Proxy
  Proxy --> Api
  Api --> Identity
  Identity --> Authz
  Api --> Authz
  Api --> EF
  EF --> SQLite
  Swagger -. development only .-> Api
```

Incident writes and reads are server-owned. The browser does not keep an authoritative copy in localStorage. Citizen incident queries are scoped to the authenticated user in the API. Admin controllers require the Admin role regardless of frontend navigation guards.

Response units and status updates exist only as local simulation records. No API integration to phone networks, SMS providers, dispatch systems, government systems, or real responder organizations is present. The separate `tel:` link in the assistance page opens only after an explicit click and uses the placeholder configured in `src/config.ts`.
