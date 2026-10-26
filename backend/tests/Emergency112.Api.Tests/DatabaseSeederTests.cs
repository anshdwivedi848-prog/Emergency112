using Emergency112.Api.Data;
using Emergency112.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Emergency112.Api.Tests;

public sealed class DatabaseSeederTests
{
    [Fact]
    public async Task Hosted_seed_without_admin_configuration_creates_roles_and_demo_units_only_once()
    {
        using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        using var services = CreateServices(connection);
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync();

        var configuration = new ConfigurationBuilder().AddInMemoryCollection().Build();
        await DatabaseSeeder.SeedAsync(scope.ServiceProvider, configuration, isDevelopment: false);
        await DatabaseSeeder.SeedAsync(scope.ServiceProvider, configuration, isDevelopment: false);

        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
        Assert.Null(await users.FindByEmailAsync("admin@example.test"));
        Assert.True(await roles.RoleExistsAsync("Citizen"));
        Assert.True(await roles.RoleExistsAsync("Admin"));
        Assert.Equal(4, await db.ResponseUnits.CountAsync());
    }

    [Fact]
    public async Task Hosted_admin_is_created_only_when_explicitly_enabled_with_credentials()
    {
        using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        using var services = CreateServices(connection);
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync();

        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Seed:AdminEnabled"] = "true",
            ["Seed:AdminEmail"] = "hosted-admin@example.test",
            ["Seed:AdminPassword"] = TestPasswords.Citizen,
        }).Build();
        await DatabaseSeeder.SeedAsync(scope.ServiceProvider, configuration, isDevelopment: false);

        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var admin = await users.FindByEmailAsync("hosted-admin@example.test");
        Assert.NotNull(admin);
        Assert.True(await users.IsInRoleAsync(admin, "Admin"));
    }

    private static ServiceProvider CreateServices(SqliteConnection connection)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connection));
        services.AddIdentity<ApplicationUser, IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>();
        return services.BuildServiceProvider();
    }
}
