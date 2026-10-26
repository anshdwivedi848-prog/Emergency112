using Emergency112.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace Emergency112.Api.Tests;

public sealed class DatabaseProviderConfigurationTests
{
    [Fact]
    public void Development_defaults_to_existing_sqlite_connection()
    {
        var configuration = Configuration();
        var settings = DatabaseProviderConfiguration.Resolve(configuration, Environment("Development"));

        Assert.Equal(DatabaseProvider.Sqlite, settings.Provider);
        Assert.Equal("Data Source=emergency112.db", settings.ConnectionString);
    }

    [Fact]
    public void Hosted_environment_requires_explicit_provider()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            DatabaseProviderConfiguration.Resolve(Configuration(), Environment("Production")));

        Assert.Contains("Database:Provider", exception.Message);
    }

    [Fact]
    public void PostgreSql_can_be_selected_with_the_hosted_connection_uri()
    {
        var configuration = Configuration(new Dictionary<string, string?>
        {
            ["Database:Provider"] = "PostgreSql",
            ["DATABASE_URL"] = "postgresql://demo-user:demo-password@db.example.test:5432/emergency112?sslmode=require&channel_binding=require",
        });

        var settings = DatabaseProviderConfiguration.Resolve(configuration, Environment("Production"));

        Assert.Equal(DatabaseProvider.PostgreSql, settings.Provider);
        var parsed = new Npgsql.NpgsqlConnectionStringBuilder(settings.ConnectionString);
        Assert.Equal(Npgsql.SslMode.VerifyFull, parsed.SslMode);
        Assert.Equal(Npgsql.ChannelBinding.Require, parsed.ChannelBinding);
        Assert.Equal(5432, parsed.Port);
        Assert.DoesNotContain("demo-password", settings.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public void PostgreSql_uri_is_parsed_and_tls_is_required()
    {
        var connectionString = DatabaseProviderConfiguration.ParseEncryptedPostgresConnectionString(
            "postgresql://demo-user:demo%40password@db.example.test:5432/demo-db?sslmode=disable&channel_binding=prefer");
        var parsed = new Npgsql.NpgsqlConnectionStringBuilder(connectionString);

        Assert.Equal("db.example.test", parsed.Host);
        Assert.Equal("demo-db", parsed.Database);
        Assert.Equal("demo-user", parsed.Username);
        Assert.Equal("demo@password", parsed.Password);
        Assert.Equal(Npgsql.SslMode.VerifyFull, parsed.SslMode);
        Assert.Equal(Npgsql.ChannelBinding.Prefer, parsed.ChannelBinding);
    }

    [Fact]
    public void PostgreSql_keyword_string_is_upgraded_to_verified_tls()
    {
        var connectionString = DatabaseProviderConfiguration.ParseEncryptedPostgresConnectionString(
            "Host=db.example.test;Database=demo;Username=demo;Password=not-a-real-secret;SSL Mode=Disable");
        var parsed = new Npgsql.NpgsqlConnectionStringBuilder(connectionString);

        Assert.Equal(Npgsql.SslMode.VerifyFull, parsed.SslMode);
    }

    [Fact]
    public void Invalid_database_configuration_error_does_not_echo_credentials()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            DatabaseProviderConfiguration.ParseEncryptedPostgresConnectionString(
                "Host=db.example.test;Database=demo;Username=private-user;Password=private-password;SSL Mode=invalid"));

        Assert.DoesNotContain("private-user", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("private-password", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void PostgreSql_context_maps_application_entities_and_only_its_own_migrations()
    {
        var options = new DbContextOptionsBuilder<PostgresApplicationDbContext>()
            .UseNpgsql("Host=localhost;Database=emergency112_test;Username=test;Password=test",
                postgres => postgres.MigrationsAssembly(typeof(PostgresApplicationDbContext).Assembly.FullName))
            .Options;
        using var db = new PostgresApplicationDbContext(options);

        Assert.Equal("Npgsql.EntityFrameworkCore.PostgreSQL", db.Database.ProviderName);
        var tables = db.Model.GetEntityTypes().Select(entity => entity.GetTableName()).ToHashSet();
        Assert.Contains("AspNetUsers", tables);
        Assert.Contains("AspNetRoles", tables);
        Assert.Contains("AspNetUserClaims", tables);
        Assert.Contains("AspNetUserLogins", tables);
        Assert.Contains("AspNetUserRoles", tables);
        Assert.Contains("AspNetUserTokens", tables);
        Assert.Contains("AspNetRoleClaims", tables);
        Assert.Contains("Incidents", tables);
        Assert.Contains("IncidentStatusHistory", tables);
        Assert.Contains("ResponseUnits", tables);
        Assert.Contains("IncidentAssignments", tables);
        Assert.Contains("AuditEvents", tables);
        Assert.Contains(db.Model.FindEntityType(typeof(Emergency112.Api.Models.ApplicationUser))!
            .GetProperties(), property => property.Name == "TrustedContactPhoneNumber");
        var incident = db.Model.FindEntityType(typeof(Emergency112.Api.Models.Incident))!;
        Assert.Contains(incident.GetIndexes(), index => index.IsUnique && index.Properties.Single().Name == "Reference");
        Assert.Contains(incident.GetIndexes(), index => index.Properties.Select(property => property.Name)
            .SequenceEqual(["ReporterUserId", "CreatedAtUtc"]));
        Assert.Contains(incident.GetForeignKeys(), foreignKey =>
            foreignKey.PrincipalEntityType.ClrType == typeof(Emergency112.Api.Models.ApplicationUser));

        var assignment = db.Model.FindEntityType(typeof(Emergency112.Api.Models.IncidentAssignment))!;
        Assert.Contains(assignment.GetForeignKeys(), foreignKey =>
            foreignKey.PrincipalEntityType.ClrType == typeof(Emergency112.Api.Models.Incident));
        Assert.Contains(assignment.GetForeignKeys(), foreignKey =>
            foreignKey.PrincipalEntityType.ClrType == typeof(Emergency112.Api.Models.ResponseUnit));
        Assert.Contains(assignment.GetForeignKeys(), foreignKey =>
            foreignKey.PrincipalEntityType.ClrType == typeof(Emergency112.Api.Models.ApplicationUser));

        var statusHistory = db.Model.FindEntityType(typeof(Emergency112.Api.Models.IncidentStatusHistory))!;
        Assert.Contains(statusHistory.GetForeignKeys(), foreignKey =>
            foreignKey.PrincipalEntityType.ClrType == typeof(Emergency112.Api.Models.Incident));
        Assert.Contains(statusHistory.GetForeignKeys(), foreignKey =>
            foreignKey.PrincipalEntityType.ClrType == typeof(Emergency112.Api.Models.ApplicationUser));

        Assert.Contains(db.Model.FindEntityType(typeof(Emergency112.Api.Models.ResponseUnit))!.GetIndexes(),
            index => index.IsUnique && index.Properties.Single().Name == "Code");

        var migrationIds = db.Database.GetMigrations().ToArray();
        Assert.NotEmpty(migrationIds);
        Assert.Contains(migrationIds, migration => migration.EndsWith("_PostgresInitial", StringComparison.Ordinal));
        Assert.DoesNotContain("20261013114223_InitialCreate", migrationIds);
    }

    [Fact]
    public void Sqlite_context_keeps_its_original_migration_chain()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite("Data Source=:memory:")
            .Options;
        using var db = new ApplicationDbContext(options);

        var migrationIds = db.Database.GetMigrations().ToArray();
        Assert.Contains("20261013114223_InitialCreate", migrationIds);
        Assert.Contains("20261026153000_AddTrustedContactFields", migrationIds);
        Assert.DoesNotContain(migrationIds, migration => migration.EndsWith("_PostgresInitial", StringComparison.Ordinal));
    }

    private static IConfiguration Configuration(IReadOnlyDictionary<string, string?>? values = null) =>
        new ConfigurationBuilder().AddInMemoryCollection(values ?? new Dictionary<string, string?>()).Build();

    private static TestHostEnvironment Environment(string name) => new() { EnvironmentName = name };

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Development";
        public string ApplicationName { get; set; } = "Emergency112.Tests";
        public string ContentRootPath { get; set; } = System.Environment.CurrentDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
