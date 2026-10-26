namespace Emergency112.Api.Models;

public sealed class ResponseUnit
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public bool IsActive { get; set; } = true;
    public ICollection<IncidentAssignment> Assignments { get; set; } = new List<IncidentAssignment>();
}
