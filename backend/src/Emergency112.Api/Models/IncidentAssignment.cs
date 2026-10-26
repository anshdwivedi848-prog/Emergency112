namespace Emergency112.Api.Models;

public sealed class IncidentAssignment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IncidentId { get; set; }
    public Incident Incident { get; set; } = null!;
    public Guid ResponseUnitId { get; set; }
    public ResponseUnit ResponseUnit { get; set; } = null!;
    public string AssignedByUserId { get; set; } = string.Empty;
    public ApplicationUser AssignedByUser { get; set; } = null!;
    public DateTime AssignedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ReleasedAtUtc { get; set; }
    public string Notes { get; set; } = string.Empty;
}
