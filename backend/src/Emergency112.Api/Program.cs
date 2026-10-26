using System.Text.Json.Serialization;
using Emergency112.Api.Data;
using Emergency112.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var allowedOrigins = builder.Configuration.GetSection("Frontend:AllowedOrigins").Get<string[]>() ?? [];

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
    {
        options.Password.RequiredLength = builder.Configuration.GetValue("Identity:Password:RequiredLength", 12);
        options.Password.RequireDigit = builder.Configuration.GetValue("Identity:Password:RequireDigit", true);
        options.Password.RequireLowercase = builder.Configuration.GetValue("Identity:Password:RequireLowercase", true);
        options.Password.RequireUppercase = builder.Configuration.GetValue("Identity:Password:RequireUppercase", true);
        options.Password.RequireNonAlphanumeric = builder.Configuration.GetValue("Identity:Password:RequireNonAlphanumeric", true);
        options.User.RequireUniqueEmail = true;
    })
    .AddEntityFrameworkStores<ApplicationDbContext>();
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "Emergency112.Auth";
    options.Cookie.HttpOnly = true;
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

await using (var scope = app.Services.CreateAsyncScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    if (app.Environment.IsDevelopment()) await db.Database.MigrateAsync();
    await DatabaseSeeder.SeedAsync(scope.ServiceProvider, app.Configuration, app.Environment.IsDevelopment());
}

app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", mode = "simulated" }))
    .WithTags("Health");
app.MapControllers();
app.Run();

public partial class Program;
