using Emergency112.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Emergency112.Api.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole, string>(options)
{
    public DbSet<Incident> Incidents => Set<Incident>();
    public DbSet<IncidentStatusHistory> IncidentStatusHistory => Set<IncidentStatusHistory>();
    public DbSet<ResponseUnit> ResponseUnits => Set<ResponseUnit>();
    public DbSet<IncidentAssignment> IncidentAssignments => Set<IncidentAssignment>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<ApplicationUser>().Property(x => x.TrustedContactName).HasMaxLength(80);
        builder.Entity<ApplicationUser>().Property(x => x.TrustedContactPhoneNumber).HasMaxLength(24);
        builder.Entity<Incident>().HasIndex(x => x.Reference).IsUnique();
        builder.Entity<Incident>().HasIndex(x => new { x.ReporterUserId, x.CreatedAtUtc });
        builder.Entity<ResponseUnit>().HasIndex(x => x.Code).IsUnique();
        builder.Entity<Incident>().Property(x => x.Category).HasConversion<string>();
        builder.Entity<Incident>().Property(x => x.Severity).HasConversion<string>();
        builder.Entity<Incident>().Property(x => x.CurrentStatus).HasConversion<string>();
        builder.Entity<IncidentStatusHistory>().Property(x => x.FromStatus).HasConversion<string>();
        builder.Entity<IncidentStatusHistory>().Property(x => x.ToStatus).HasConversion<string>();
        builder.Entity<IncidentStatusHistory>().HasOne(x => x.Incident).WithMany(x => x.StatusHistory)
            .HasForeignKey(x => x.IncidentId).OnDelete(DeleteBehavior.Cascade);
        builder.Entity<IncidentAssignment>().HasOne(x => x.Incident).WithMany(x => x.Assignments)
            .HasForeignKey(x => x.IncidentId).OnDelete(DeleteBehavior.Cascade);
        builder.Entity<IncidentAssignment>().HasOne(x => x.ResponseUnit).WithMany(x => x.Assignments)
            .HasForeignKey(x => x.ResponseUnitId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<Incident>().HasOne(x => x.Reporter).WithMany().HasForeignKey(x => x.ReporterUserId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.Entity<IncidentStatusHistory>().HasOne(x => x.ChangedByUser).WithMany()
            .HasForeignKey(x => x.ChangedByUserId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<IncidentAssignment>().HasOne(x => x.AssignedByUser).WithMany()
            .HasForeignKey(x => x.AssignedByUserId).OnDelete(DeleteBehavior.Restrict);
    }
}
