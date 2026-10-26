using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Emergency112.Api.Data;

public sealed class PostgresApplicationDbContextFactory : IDesignTimeDbContextFactory<PostgresApplicationDbContext>
{
    public PostgresApplicationDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder().AddEnvironmentVariables().Build();
        var configuredConnection = configuration["DATABASE_URL"]
            ?? configuration.GetConnectionString("Postgres");
        var connectionString = string.IsNullOrWhiteSpace(configuredConnection)
            ? "Host=design-time.invalid;Database=Emergency112_design_only;Username=migration-design-only"
            : DatabaseProviderConfiguration.ParseEncryptedPostgresConnectionString(configuredConnection);
        var options = new DbContextOptionsBuilder<PostgresApplicationDbContext>()
            .UseNpgsql(connectionString, postgres =>
                postgres.MigrationsAssembly(typeof(PostgresApplicationDbContext).Assembly.FullName))
            .Options;
        return new PostgresApplicationDbContext(options);
    }
}
