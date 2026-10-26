using Emergency112.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Emergency112.Api.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(IServiceProvider services, IConfiguration configuration, bool allowDevelopmentAdminSeed)
    {
        var roles = services.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in new[] { "Citizen", "Admin" })
            if (!await roles.RoleExistsAsync(role)) await roles.CreateAsync(new IdentityRole(role));

        var db = services.GetRequiredService<ApplicationDbContext>();
        if (!await db.ResponseUnits.AnyAsync())
        {
            db.ResponseUnits.AddRange(
                new ResponseUnit { Code = "SIM-POL-01", Name = "Demo patrol unit", Category = "Police" },
                new ResponseUnit { Code = "SIM-FIR-02", Name = "Demo fire unit", Category = "Fire" },
                new ResponseUnit { Code = "SIM-MED-03", Name = "Demo medical unit", Category = "Medical" },
                new ResponseUnit { Code = "SIM-GEN-04", Name = "Demo general unit", Category = "Other" });
            await db.SaveChangesAsync();
        }

        var email = configuration["Seed:AdminEmail"];
        var password = configuration["Seed:AdminPassword"];
        if (allowDevelopmentAdminSeed && !string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(password))
        {
            var users = services.GetRequiredService<UserManager<ApplicationUser>>();
            var admin = await users.FindByEmailAsync(email);
            if (admin is null)
            {
                admin = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true, DisplayName = "Demo Administrator" };
                var result = await users.CreateAsync(admin, password);
                if (!result.Succeeded) throw new InvalidOperationException(string.Join("; ", result.Errors.Select(x => x.Description)));
            }
            if (!await users.IsInRoleAsync(admin, "Admin")) await users.AddToRoleAsync(admin, "Admin");
        }
    }
}
