# Database relationships

```mermaid
erDiagram
  ASPNET_USERS ||--o{ INCIDENTS : reports
  INCIDENTS ||--|{ INCIDENT_STATUS_HISTORY : records
  ASPNET_USERS ||--o{ INCIDENT_STATUS_HISTORY : changes
  INCIDENTS ||--o{ INCIDENT_ASSIGNMENTS : has
  RESPONSE_UNITS ||--o{ INCIDENT_ASSIGNMENTS : assigned
  ASPNET_USERS ||--o{ INCIDENT_ASSIGNMENTS : assigns
  ASPNET_ROLES ||--o{ ASPNET_USER_ROLES : contains
  ASPNET_USERS ||--o{ ASPNET_USER_ROLES : holds
  ASPNET_USERS ||--o{ ASPNET_USER_CLAIMS : claims
  ASPNET_ROLES ||--o{ ASPNET_ROLE_CLAIMS : claims
  ASPNET_USERS ||--o{ ASPNET_USER_LOGINS : logins
  ASPNET_USERS ||--o{ ASPNET_USER_TOKENS : tokens

  ASPNET_USERS {
    string Id PK
    string Email
    string DisplayName
    string PasswordHash
    datetime CreatedAtUtc
  }
  ASPNET_ROLES {
    string Id PK
    string Name
  }
  INCIDENTS {
    guid Id PK
    string Reference UK
    string Category
    string Description
    string Severity
    string Location
    datetime CreatedAtUtc
    string CurrentStatus
    string ReporterUserId FK
  }
  INCIDENT_STATUS_HISTORY {
    guid Id PK
    guid IncidentId FK
    string FromStatus
    string ToStatus
    datetime ChangedAtUtc
    string ChangedByUserId FK
    string Note
  }
  RESPONSE_UNITS {
    guid Id PK
    string Code UK
    string Name
    string Category
    boolean IsActive
  }
  INCIDENT_ASSIGNMENTS {
    guid Id PK
    guid IncidentId FK
    guid ResponseUnitId FK
    string AssignedByUserId FK
    datetime AssignedAtUtc
    datetime ReleasedAtUtc
    string Notes
  }
  AUDIT_EVENTS {
    guid Id PK
    string ActorUserId
    string ActorDisplayName
    string Action
    string EntityType
    string EntityId
    datetime OccurredAtUtc
    string Details
  }
```

An incident reference is unique. Deleting an unreviewed incident cascades its status/assignment records; response unit and user references are restricted from deletion while referenced. Audit events capture administrator changes without copying incident descriptions or location into the audit log. `ActorUserId` is retained as a historical text value so audit records remain readable if an account is later removed.
