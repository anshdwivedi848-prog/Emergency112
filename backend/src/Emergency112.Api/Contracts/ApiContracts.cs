using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using Emergency112.Api.Domain;

namespace Emergency112.Api.Contracts;

public sealed record UserDto(string Id, string Email, string DisplayName, IReadOnlyList<string> Roles);
public sealed record CitizenProfileDto(string Id, string Email, string FullName, string? PhoneNumber,
    string? TrustedContactName, string? TrustedContactPhoneNumber);
public sealed record UpdateCitizenProfileRequest(
    [Required, StringLength(80, MinimumLength = 2)] string FullName,
    [StringLength(24)] string? PhoneNumber,
    [StringLength(80)] string? TrustedContactName,
    [StringLength(24)] string? TrustedContactPhoneNumber) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(FullName) || FullName.Trim().Length < 2)
            yield return new ValidationResult("Enter a name with at least two non-space characters.", [nameof(FullName)]);

        if (!IsValidOptionalPhone(PhoneNumber))
            yield return new ValidationResult("Enter a valid phone number or leave the field empty.", [nameof(PhoneNumber)]);

        var hasContactName = !string.IsNullOrWhiteSpace(TrustedContactName);
        var hasContactPhone = !string.IsNullOrWhiteSpace(TrustedContactPhoneNumber);
        if (hasContactName != hasContactPhone)
            yield return new ValidationResult("Enter both trusted-contact fields, or leave both empty.",
                [hasContactName ? nameof(TrustedContactPhoneNumber) : nameof(TrustedContactName)]);

        if (hasContactName && TrustedContactName!.Trim().Length < 2)
            yield return new ValidationResult("Enter a trusted-contact name with at least two characters.", [nameof(TrustedContactName)]);

        if (!IsValidOptionalPhone(TrustedContactPhoneNumber))
            yield return new ValidationResult("Enter a valid trusted-contact phone number.", [nameof(TrustedContactPhoneNumber)]);
    }

    private static bool IsValidOptionalPhone(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return true;
        var trimmed = value.Trim();
        if (trimmed.Length > 24 || !Regex.IsMatch(trimmed, @"^\+?[0-9][0-9 .()\-]*$")) return false;
        var digits = trimmed.Count(char.IsDigit);
        return digits is >= 7 and <= 15;
    }
}
public sealed record RegisterRequest([Required, EmailAddress, MaxLength(254)] string Email,
    [Required, MinLength(2), MaxLength(80)] string DisplayName,
    [Required, MinLength(12), MaxLength(128)] string Password);
public sealed record LoginRequest([Required, EmailAddress] string Email, [Required] string Password);
public sealed record CreateIncidentRequest(
    [Required, EnumDataType(typeof(IncidentCategory))] IncidentCategory? Category,
    [Required, MaxLength(500)] string Description,
    [Required, EnumDataType(typeof(IncidentSeverity))] IncidentSeverity? Severity,
    [MaxLength(160)] string? Location) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(Description) || Description.Trim().Length < 5)
            yield return new ValidationResult("Add at least five non-space characters describing the incident.", [nameof(Description)]);
    }
}
public sealed record UpdateStatusRequest([Required, EnumDataType(typeof(IncidentStatus))] IncidentStatus? Status, [MaxLength(240)] string? Note);
public sealed record AssignUnitRequest([Required] Guid? ResponseUnitId, [MaxLength(240)] string? Notes);
public sealed record IncidentDto(Guid Id, string Reference, IncidentCategory Category, string Description,
    IncidentSeverity Severity, string? Location, DateTime CreatedAtUtc, IncidentStatus CurrentStatus,
    string? Reporter, IReadOnlyList<StatusHistoryDto> StatusHistory, IReadOnlyList<AssignmentDto> Assignments);
public sealed record StatusHistoryDto(Guid Id, IncidentStatus? FromStatus, IncidentStatus ToStatus,
    DateTime ChangedAtUtc, string ChangedBy, string Note);
public sealed record AssignmentDto(Guid Id, string UnitCode, string UnitName, string Category,
    DateTime AssignedAtUtc, DateTime? ReleasedAtUtc, string Notes);
public sealed record ResponseUnitDto(Guid Id, string Code, string Name, string Category, bool IsActive);
public sealed record IncidentSummaryDto(Guid Id, string Reference, IncidentCategory Category,
    string Description, IncidentSeverity Severity, DateTime CreatedAtUtc, IncidentStatus CurrentStatus, string? Location, string? Reporter);
public sealed record DashboardStatsDto(int Total, int Open, int Assigned, int Resolved, int Recent24Hours);
public sealed record AuditEventDto(Guid Id, string ActorDisplayName, string Action, string EntityType,
    string EntityId, DateTime OccurredAtUtc, string Details);
