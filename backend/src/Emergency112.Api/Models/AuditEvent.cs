namespace Emergency112.Api.Models;

public sealed class AuditEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ActorUserId { get; set; } = string.Empty;
    public string ActorDisplayName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;
    public string Details { get; set; } = string.Empty;
}
