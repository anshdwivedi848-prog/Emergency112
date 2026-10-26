using Emergency112.Api.Contracts;
using Emergency112.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Emergency112.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(UserManager<ApplicationUser> users, SignInManager<ApplicationUser> signIn) : ControllerBase
{
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me()
    {
        var user = await users.GetUserAsync(User);
        return user is null ? Unauthorized() : Ok(await ToDto(user));
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<UserDto>> Register(RegisterRequest request)
    {
        var user = new ApplicationUser { UserName = request.Email.Trim(), Email = request.Email.Trim(), DisplayName = request.DisplayName.Trim() };
        var result = await users.CreateAsync(user, request.Password);
        if (!result.Succeeded) return BadRequest(new { errors = result.Errors.Select(x => new { code = x.Code, description = x.Description }) });
        var roleResult = await users.AddToRoleAsync(user, "Citizen");
        if (!roleResult.Succeeded)
        {
            await users.DeleteAsync(user);
            return Problem("The citizen role is not configured on this server.", statusCode: StatusCodes.Status500InternalServerError);
        }
        await signIn.SignInAsync(user, isPersistent: false);
        return CreatedAtAction(nameof(Me), await ToDto(user));
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<UserDto>> Login(LoginRequest request)
    {
        var user = await users.FindByEmailAsync(request.Email);
        if (user is null) return Unauthorized(new { message = "Email or password was not recognized." });
        var result = await signIn.PasswordSignInAsync(user, request.Password, isPersistent: false, lockoutOnFailure: true);
        return !result.Succeeded ? Unauthorized(new { message = "Email or password was not recognized." }) : Ok(await ToDto(user));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await signIn.SignOutAsync();
        return NoContent();
    }

    private async Task<UserDto> ToDto(ApplicationUser user) => new(user.Id, user.Email ?? "", user.DisplayName, (await users.GetRolesAsync(user)).ToArray());
}
