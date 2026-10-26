using System.Text.Json.Serialization;
using Emergency112.Api.Data;
using Emergency112.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var databaseSettings = DatabaseProviderConfiguration.Resolve(builder.Configuration, builder.Environment);
var allowedOrigins = builder.Configuration.GetSection("Frontend:AllowedOrigins").Get<string[]>() ?? [];
ValidateAllowedOrigins(allowedOrigins, builder.Environment.IsDevelopment());

if (databaseSettings.Provider == DatabaseProvider.Sqlite)
{
    builder.Services.AddDbContext<ApplicationDbContext>(options =>
        options.UseSqlite(databaseSettings.ConnectionString));
}
else
{
    builder.Services.AddDbContext<PostgresApplicationDbContext>(options => options
        .UseNpgsql(databaseSettings.ConnectionString, postgres => postgres
            .MigrationsAssembly(typeof(PostgresApplicationDbContext).Assembly.FullName)));
    builder.Services.AddScoped<ApplicationDbContext>(services =>
        services.GetRequiredService<PostgresApplicationDbContext>());
}

var identity = builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequiredLength = builder.Configuration.GetValue("Identity:Password:RequiredLength", 12);
        options.Password.RequireDigit = builder.Configuration.GetValue("Identity:Password:RequireDigit", true);
        options.Password.RequireLowercase = builder.Configuration.GetValue("Identity:Password:RequireLowercase", true);
        options.Password.RequireUppercase = builder.Configuration.GetValue("Identity:Password:RequireUppercase", true);
        options.Password.RequireNonAlphanumeric = builder.Configuration.GetValue("Identity:Password:RequireNonAlphanumeric", true);
        options.User.RequireUniqueEmail = true;
    });
if (databaseSettings.Provider == DatabaseProvider.Sqlite)
    identity.AddEntityFrameworkStores<ApplicationDbContext>();
else
    identity.AddEntityFrameworkStores<PostgresApplicationDbContext>();
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "Emergency112.Auth";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});
builder.Services.AddAuthorization();
builder.Services.AddCors(options => options.AddPolicy("frontend", policy => policy
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));
builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddProblemDetails();

var app = builder.Build();
app.UseExceptionHandler();
app.UseCors("frontend");
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

var migrateOnStartup = app.Configuration.GetValue<bool?>("Database:MigrateOnStartup")
    ?? (app.Environment.IsDevelopment() || databaseSettings.Provider == DatabaseProvider.PostgreSql);
await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (migrateOnStartup)
        await db.Database.MigrateAsync();
    else
        app.Logger.LogInformation("Database startup migrations are disabled; the selected schema must already be applied.");

    await DatabaseSeeder.SeedAsync(scope.ServiceProvider, app.Configuration, app.Environment.IsDevelopment());
}

app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", mode = "simulated" }))
    .WithTags("Health");
app.MapControllers();
app.Run();

static void ValidateAllowedOrigins(string[] origins, bool development)
{
    if (development) return;
    if (origins.Length == 0 || origins.Any(origin => origin == "*"
        || !Uri.TryCreate(origin, UriKind.Absolute, out var uri)
        || uri.Scheme != Uri.UriSchemeHttps
        || !string.Equals(origin.TrimEnd('/'), uri.GetLeftPart(UriPartial.Authority), StringComparison.OrdinalIgnoreCase)))
        throw new InvalidOperationException(
            "Production requires explicit HTTPS Frontend:AllowedOrigins entries. Wildcard and non-HTTPS origins are not allowed with cookie authentication.");
}

public partial class Program;
