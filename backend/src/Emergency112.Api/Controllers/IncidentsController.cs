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
[Route("api/incidents")]
[Authorize(Roles = "Citizen")]
public sealed class IncidentsController(ApplicationDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<IncidentDto>> Create(CreateIncidentRequest request)
    {
        var now = DateTime.UtcNow;
        var incident = new Incident
        {
            Reference = $"E112-{now:yyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}",
            Category = request.Category!.Value,
            Description = request.Description.Trim(),
            Severity = request.Severity!.Value,
            Location = string.IsNullOrWhiteSpace(request.Location) ? null : request.Location.Trim(),
            CreatedAtUtc = now,
            ReporterUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)!,
            CurrentStatus = IncidentStatus.Received,
        };
        incident.StatusHistory.Add(new IncidentStatusHistory
        {
            FromStatus = null, ToStatus = IncidentStatus.Received, ChangedAtUtc = now,
            ChangedByUserId = incident.ReporterUserId, Note = "Simulated report created",
        });
        db.Incidents.Add(incident);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = incident.Id }, incident.ToDto());
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<IncidentSummaryDto>>> List()
    {
        var owner = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var incidents = await db.Incidents.AsNoTracking().Where(x => x.ReporterUserId == owner)
            .OrderByDescending(x => x.CreatedAtUtc).ToListAsync();
        return Ok(incidents.Select(x => x.ToSummary()).ToArray());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<IncidentDto>> Get(Guid id)
    {
        var owner = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var incident = await Load(id, owner);
        return incident is null ? NotFound() : Ok(incident.ToDto());
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var owner = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var incident = await db.Incidents.SingleOrDefaultAsync(x => x.Id == id && x.ReporterUserId == owner);
        if (incident is null) return NotFound();
        if (incident.CurrentStatus != IncidentStatus.Received) return Conflict(new { message = "Only reports that have not been reviewed can be deleted." });
        db.Incidents.Remove(incident);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private Task<Incident?> Load(Guid id, string owner) => db.Incidents.AsNoTracking()
        .Include(x => x.Reporter).Include(x => x.StatusHistory).ThenInclude(x => x.ChangedByUser)
        .Include(x => x.Assignments).ThenInclude(x => x.ResponseUnit)
        .SingleOrDefaultAsync(x => x.Id == id && x.ReporterUserId == owner);
}
