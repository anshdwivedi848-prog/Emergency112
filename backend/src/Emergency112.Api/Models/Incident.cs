using Emergency112.Api.Domain;

namespace Emergency112.Api.Models;

public sealed class Incident
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Reference { get; set; } = string.Empty;
    public IncidentCategory Category { get; set; }
    public string Description { get; set; } = string.Empty;
    public IncidentSeverity Severity { get; set; }
    public string? Location { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public IncidentStatus CurrentStatus { get; set; } = IncidentStatus.Received;
    public string ReporterUserId { get; set; } = string.Empty;
    public ApplicationUser Reporter { get; set; } = null!;
    public ICollection<IncidentStatusHistory> StatusHistory { get; set; } = new List<IncidentStatusHistory>();
    public ICollection<IncidentAssignment> Assignments { get; set; } = new List<IncidentAssignment>();
}
