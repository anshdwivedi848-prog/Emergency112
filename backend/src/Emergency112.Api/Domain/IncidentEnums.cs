namespace Emergency112.Api.Domain;

public enum IncidentCategory
{
    Police,
    Fire,
    Medical,
    Other,
}

public enum IncidentSeverity
{
    Low,
    Moderate,
    High,
    Critical,
}

public enum IncidentStatus
{
    Received,
    UnderReview,
    Assigned,
    Resolved,
}
