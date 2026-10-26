using Microsoft.AspNetCore.Identity;

namespace Emergency112.Api.Models;

public sealed class ApplicationUser : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public string? TrustedContactName { get; set; }
    public string? TrustedContactPhoneNumber { get; set; }
}
