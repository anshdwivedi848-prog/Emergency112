using System.Security.Claims;
using Emergency112.Api.Contracts;
using Emergency112.Api.Data;
using Emergency112.Api.Domain;
using Emergency112.Api.Models;
using Emergency112.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Emergency112.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public sealed class AdminController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<ActionResult<DashboardStatsDto>> Dashboard()
    {
        var all = db.Incidents.AsNoTracking();
        var total = await all.CountAsync();
        var resolved = await all.CountAsync(x => x.CurrentStatus == IncidentStatus.Resolved);
        var assigned = await all.CountAsync(x => x.CurrentStatus == IncidentStatus.Assigned);
        var recent = await all.CountAsync(x => x.CreatedAtUtc >= DateTime.UtcNow.AddHours(-24));
        return Ok(new DashboardStatsDto(total, total - resolved, assigned, resolved, recent));
    }

    [HttpGet("incidents")]
    public async Task<ActionResult<IReadOnlyList<IncidentSummaryDto>>> List(
        [FromQuery] string? search, [FromQuery] IncidentCategory? category,
        [FromQuery] IncidentSeverity? severity, [FromQuery] IncidentStatus? status,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var query = db.Incidents.AsNoTracking().Include(x => x.Reporter).AsQueryable();
        if (category.HasValue) query = query.Where(x => x.Category == category.Value);
        if (severity.HasValue) query = query.Where(x => x.Severity == severity.Value);
        if (status.HasValue) query = query.Where(x => x.CurrentStatus == status.Value);
        if (from.HasValue)
        {
            var fromUtc = DateTime.SpecifyKind(from.Value.Date, DateTimeKind.Utc);
            query = query.Where(x => x.CreatedAtUtc >= fromUtc);
        }
        if (to.HasValue)
        {
            var toExclusiveUtc = DateTime.SpecifyKind(to.Value.Date.AddDays(1), DateTimeKind.Utc);
            query = query.Where(x => x.CreatedAtUtc < toExclusiveUtc);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(x => x.Reference.Contains(term) || x.Description.Contains(term) ||
                (x.Location != null && x.Location.Contains(term)) || x.Reporter.DisplayName.Contains(term));
        }
        var results = await query.OrderByDescending(x => x.CreatedAtUtc).Take(250).ToListAsync();
        return Ok(results.Select(x => x.ToSummary()).ToArray());
    }

    [HttpGet("incidents/{id:guid}")]
    public async Task<ActionResult<IncidentDto>> Get(Guid id)
    {
        var incident = await LoadIncident(id);
        return incident is null ? NotFound() : Ok(incident.ToDto());
    }

    [HttpPut("incidents/{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateStatusRequest request)
    {
        var incident = await db.Incidents.Include(x => x.StatusHistory).SingleOrDefaultAsync(x => x.Id == id);
        if (incident is null) return NotFound();
        var nextStatus = request.Status!.Value;
        if (!IsAllowed(incident.CurrentStatus, nextStatus))
            return Conflict(new { message = $"Status cannot transition from {incident.CurrentStatus} to {nextStatus}." });
        var from = incident.CurrentStatus;
        incident.CurrentStatus = nextStatus;
        var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        db.IncidentStatusHistory.Add(new IncidentStatusHistory
        {
            IncidentId = incident.Id, FromStatus = from, ToStatus = nextStatus, ChangedByUserId = actorId,
            Note = string.IsNullOrWhiteSpace(request.Note) ? "Status updated by administrator" : request.Note.Trim(),
        });
        AddAudit("IncidentStatusChanged", incident.Id, $"{from} → {nextStatus}");
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("units")]
    public async Task<ActionResult<IReadOnlyList<ResponseUnitDto>>> Units() =>
        Ok(await db.ResponseUnits.AsNoTracking().OrderBy(x => x.Code)
            .Select(x => new ResponseUnitDto(x.Id, x.Code, x.Name, x.Category, x.IsActive)).ToListAsync());

    [HttpPost("incidents/{id:guid}/assignments")]
    public async Task<IActionResult> Assign(Guid id, AssignUnitRequest request)
    {
        var incident = await db.Incidents.Include(x => x.StatusHistory).Include(x => x.Assignments)
            .SingleOrDefaultAsync(x => x.Id == id);
        if (incident is null) return NotFound();
        var unit = await db.ResponseUnits.SingleOrDefaultAsync(x => x.Id == request.ResponseUnitId!.Value && x.IsActive);
        if (unit is null) return BadRequest(new { message = "Choose an active simulated response unit." });
        if (unit.Category != "General" && !string.Equals(unit.Category, incident.Category.ToString(), StringComparison.OrdinalIgnoreCase))
            return Conflict(new { message = "This simulated unit does not match the incident category." });
        if (incident.CurrentStatus == IncidentStatus.Resolved)
            return Conflict(new { message = "Resolved incidents cannot be assigned." });

        var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var now = DateTime.UtcNow;
        foreach (var active in incident.Assignments.Where(x => x.ReleasedAtUtc == null)) active.ReleasedAtUtc = now;
        db.IncidentAssignments.Add(new IncidentAssignment
        {
            IncidentId = incident.Id, ResponseUnitId = unit.Id, AssignedByUserId = actorId, AssignedAtUtc = now,
            Notes = request.Notes?.Trim() ?? string.Empty,
        });
        if (incident.CurrentStatus != IncidentStatus.Assigned)
        {
            var previous = incident.CurrentStatus;
            incident.CurrentStatus = IncidentStatus.Assigned;
            db.IncidentStatusHistory.Add(new IncidentStatusHistory
            {
                IncidentId = incident.Id, FromStatus = previous, ToStatus = IncidentStatus.Assigned, ChangedByUserId = actorId,
                ChangedAtUtc = now, Note = $"Assigned simulated unit {unit.Code}",
            });
        }
        AddAudit("ResponseUnitAssigned", incident.Id, $"Unit {unit.Code} assigned");
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("activity")]
    public async Task<ActionResult<IReadOnlyList<AuditEventDto>>> Activity() =>
        Ok(await db.AuditEvents.AsNoTracking().OrderByDescending(x => x.OccurredAtUtc).Take(25)
            .Select(x => new AuditEventDto(x.Id, x.ActorDisplayName, x.Action, x.EntityType, x.EntityId, x.OccurredAtUtc, x.Details))
            .ToListAsync());

    private Task<Incident?> LoadIncident(Guid id) => db.Incidents.AsNoTracking()
        .Include(x => x.Reporter).Include(x => x.StatusHistory).ThenInclude(x => x.ChangedByUser)
        .Include(x => x.Assignments).ThenInclude(x => x.ResponseUnit).SingleOrDefaultAsync(x => x.Id == id);

    private void AddAudit(string action, Guid incidentId, string details) => db.AuditEvents.Add(new AuditEvent
    {
        ActorUserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "",
        ActorDisplayName = User.Identity?.Name ?? "Administrator", Action = action,
        EntityType = "Incident", EntityId = incidentId.ToString(), Details = details,
    });

    private static bool IsAllowed(IncidentStatus current, IncidentStatus next) => current switch
    {
        IncidentStatus.Received => next is IncidentStatus.UnderReview or IncidentStatus.Assigned,
        IncidentStatus.UnderReview => next is IncidentStatus.Assigned or IncidentStatus.Resolved,
        IncidentStatus.Assigned => next is IncidentStatus.UnderReview or IncidentStatus.Resolved,
        _ => false,
    };
}
