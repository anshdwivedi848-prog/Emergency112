using Microsoft.Extensions.Hosting;
using Npgsql;
using System.Web;

namespace Emergency112.Api.Data;

public enum DatabaseProvider
{
    Sqlite,
    PostgreSql,
}

public sealed record DatabaseSettings(DatabaseProvider Provider, string ConnectionString)
{
    public override string ToString() => $"DatabaseSettings {{ Provider = {Provider} }}";
}

public static class DatabaseProviderConfiguration
{
    public static DatabaseSettings Resolve(IConfiguration configuration, IHostEnvironment environment)
    {
        var configuredProvider = configuration["Database:Provider"];
        var provider = string.IsNullOrWhiteSpace(configuredProvider)
            ? environment.IsDevelopment()
                ? DatabaseProvider.Sqlite
                : throw new InvalidOperationException(
                    "Database:Provider must be explicitly set outside Development (Sqlite or PostgreSql).")
            : configuredProvider.Trim().ToLowerInvariant() switch
            {
                "sqlite" => DatabaseProvider.Sqlite,
                "postgresql" or "postgres" => DatabaseProvider.PostgreSql,
                _ => throw new InvalidOperationException(
                    "Database:Provider must be either Sqlite or PostgreSql."),
            };

        if (provider == DatabaseProvider.Sqlite)
        {
            var sqliteConnection = configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(sqliteConnection))
                sqliteConnection = "Data Source=emergency112.db";

            return new DatabaseSettings(provider, sqliteConnection);
        }

        var postgresConnection = configuration["DATABASE_URL"]
            ?? configuration.GetConnectionString("Postgres");
        if (string.IsNullOrWhiteSpace(postgresConnection))
            throw new InvalidOperationException(
                "PostgreSQL is selected but DATABASE_URL or ConnectionStrings:Postgres is not configured.");

        return new DatabaseSettings(provider, ParseEncryptedPostgresConnectionString(postgresConnection));
    }

    public static string ParseEncryptedPostgresConnectionString(string value)
    {
        try
        {
            if (Uri.TryCreate(value, UriKind.Absolute, out var uri)
                && (uri.Scheme.Equals("postgres", StringComparison.OrdinalIgnoreCase)
                    || uri.Scheme.Equals("postgresql", StringComparison.OrdinalIgnoreCase)))
            {
                var userInfo = uri.UserInfo.Split(':', 2);
                var database = Uri.UnescapeDataString(uri.AbsolutePath.Trim('/'));
                if (userInfo.Length != 2 || string.IsNullOrWhiteSpace(database) || string.IsNullOrWhiteSpace(uri.Host))
                    throw new FormatException();

                var builder = new NpgsqlConnectionStringBuilder
                {
                    Host = uri.Host,
                    Port = uri.IsDefaultPort ? 5432 : uri.Port,
                    Database = database,
                    Username = Uri.UnescapeDataString(userInfo[0]),
                    Password = Uri.UnescapeDataString(userInfo[1]),
                };
                builder.SslMode = SslMode.VerifyFull;
                var query = HttpUtility.ParseQueryString(uri.Query);
                if (!string.IsNullOrWhiteSpace(query["channel_binding"]))
                {
                    if (!Enum.TryParse<ChannelBinding>(query["channel_binding"], ignoreCase: true, out var channelBinding))
                        throw new FormatException();
                    builder.ChannelBinding = channelBinding;
                }
                if (!string.IsNullOrWhiteSpace(query["application_name"]))
                    builder.ApplicationName = query["application_name"];
                return builder.ConnectionString;
            }

            var keywordBuilder = new NpgsqlConnectionStringBuilder(value)
            {
                SslMode = SslMode.VerifyFull,
            };
            if (string.IsNullOrWhiteSpace(keywordBuilder.Host)
                || string.IsNullOrWhiteSpace(keywordBuilder.Database)
                || string.IsNullOrWhiteSpace(keywordBuilder.Username))
                throw new FormatException();

            return keywordBuilder.ConnectionString;
        }
        catch (Exception exception) when (exception is ArgumentException or FormatException or NpgsqlException)
        {
            // Do not include the supplied value in errors; it contains database credentials.
            throw new InvalidOperationException(
                "The PostgreSQL connection configuration is invalid. Configure DATABASE_URL as a PostgreSQL URI or provide a valid Npgsql connection string. The value is not logged.");
        }
    }
}
