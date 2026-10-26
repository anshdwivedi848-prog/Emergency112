using Emergency112.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Emergency112.Api.Data;

public static class DatabaseSeeder
{
    public static async Task SeedAsync(IServiceProvider services, IConfiguration configuration, bool isDevelopment)
    {
        var roles = services.GetRequiredService<RoleManager<IdentityRole>>();
        foreach (var role in new[] { "Citizen", "Admin" })
        {
            if (await roles.RoleExistsAsync(role)) continue;
            var roleResult = await roles.CreateAsync(new IdentityRole(role));
            if (!roleResult.Succeeded)
                throw new InvalidOperationException("Required application roles could not be initialized.");
        }

        var db = services.GetRequiredService<ApplicationDbContext>();
        var responseUnits = new[]
        {
            new ResponseUnit { Code = "SIM-POL-01", Name = "Demo patrol unit", Category = "Police" },
            new ResponseUnit { Code = "SIM-FIR-02", Name = "Demo fire unit", Category = "Fire" },
            new ResponseUnit { Code = "SIM-MED-03", Name = "Demo medical unit", Category = "Medical" },
            new ResponseUnit { Code = "SIM-GEN-04", Name = "Demo general unit", Category = "Other" },
        };
        foreach (var unit in responseUnits)
            if (!await db.ResponseUnits.AnyAsync(existing => existing.Code == unit.Code))
                db.ResponseUnits.Add(unit);
        if (db.ChangeTracker.HasChanges())
            await db.SaveChangesAsync();

        var email = configuration["Seed:AdminEmail"];
        var password = configuration["Seed:AdminPassword"];
        var adminSeedEnabled = isDevelopment
            ? !string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(password)
            : configuration.GetValue<bool>("Seed:AdminEnabled");
        if (!adminSeedEnabled) return;
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException(
                "Administrator provisioning is enabled but Seed:AdminEmail or Seed:AdminPassword is missing.");

        {
            var users = services.GetRequiredService<UserManager<ApplicationUser>>();
            var admin = await users.FindByEmailAsync(email);
            if (admin is null)
            {
                admin = new ApplicationUser { UserName = email, Email = email, EmailConfirmed = true, DisplayName = "Emergency112 Administrator" };
                var result = await users.CreateAsync(admin, password);
                if (!result.Succeeded)
                    throw new InvalidOperationException("The configured administrator account could not be provisioned.");
            }
            if (!await users.IsInRoleAsync(admin, "Admin"))
            {
                var roleResult = await users.AddToRoleAsync(admin, "Admin");
                if (!roleResult.Succeeded)
                    throw new InvalidOperationException("The configured administrator role could not be assigned.");
            }
        }
    }
}
