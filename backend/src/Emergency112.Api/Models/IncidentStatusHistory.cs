using Emergency112.Api.Domain;

namespace Emergency112.Api.Models;

public sealed class IncidentStatusHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IncidentId { get; set; }
    public Incident Incident { get; set; } = null!;
    public IncidentStatus? FromStatus { get; set; }
    public IncidentStatus ToStatus { get; set; }
    public DateTime ChangedAtUtc { get; set; } = DateTime.UtcNow;
    public string ChangedByUserId { get; set; } = string.Empty;
    public ApplicationUser ChangedByUser { get; set; } = null!;
    public string Note { get; set; } = string.Empty;
}
