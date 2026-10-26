using Emergency112.Api.Contracts;
using Emergency112.Api.Models;

namespace Emergency112.Api.Services;

public static class IncidentMapping
{
    public static IncidentDto ToDto(this Incident incident) => new(
        incident.Id, incident.Reference, incident.Category, incident.Description, incident.Severity,
        incident.Location, incident.CreatedAtUtc, incident.CurrentStatus, incident.Reporter?.DisplayName,
        incident.StatusHistory.OrderBy(x => x.ChangedAtUtc).Select(x => new StatusHistoryDto(x.Id,
            x.FromStatus, x.ToStatus, x.ChangedAtUtc, x.ChangedByUser?.DisplayName ?? "System", x.Note)).ToArray(),
        incident.Assignments.OrderBy(x => x.AssignedAtUtc).Select(x => new AssignmentDto(x.Id,
            x.ResponseUnit.Code, x.ResponseUnit.Name, x.ResponseUnit.Category, x.AssignedAtUtc, x.ReleasedAtUtc, x.Notes)).ToArray());

    public static IncidentSummaryDto ToSummary(this Incident incident) => new(incident.Id, incident.Reference,
        incident.Category, incident.Description, incident.Severity, incident.CreatedAtUtc, incident.CurrentStatus, incident.Location,
        incident.Reporter?.DisplayName);
}
