using Emergency112.Api.Contracts;
using Emergency112.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Emergency112.Api.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize(Roles = "Citizen")]
public sealed class ProfileController(UserManager<ApplicationUser> users) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<CitizenProfileDto>> Get()
    {
        var user = await users.GetUserAsync(User);
        return user is null ? Unauthorized() : Ok(ToDto(user));
    }

    [HttpPut]
    public async Task<ActionResult<CitizenProfileDto>> Update(UpdateCitizenProfileRequest request)
    {
        var user = await users.GetUserAsync(User);
        if (user is null) return Unauthorized();

        user.DisplayName = request.FullName.Trim();
        user.PhoneNumber = NormalizeOptional(request.PhoneNumber);
        user.TrustedContactName = NormalizeOptional(request.TrustedContactName);
        user.TrustedContactPhoneNumber = NormalizeOptional(request.TrustedContactPhoneNumber);

        var result = await users.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(x => new { code = x.Code, description = x.Description }) });

        return Ok(ToDto(user));
    }

    private static CitizenProfileDto ToDto(ApplicationUser user) => new(
        user.Id,
        user.Email ?? string.Empty,
        user.DisplayName,
        user.PhoneNumber,
        user.TrustedContactName,
        user.TrustedContactPhoneNumber);

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
