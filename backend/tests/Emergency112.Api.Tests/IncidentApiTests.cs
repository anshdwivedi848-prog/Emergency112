using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Emergency112.Api.Contracts;
using Emergency112.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Emergency112.Api.Tests;

public sealed class IncidentApiTests
{
    private static readonly JsonSerializerOptions Json = CreateJsonOptions();

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new JsonStringEnumConverter());
        return options;
    }

    [Fact]
    public async Task Citizen_can_create_and_retrieve_persisted_simulated_incident()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        await Register(client, "citizen@example.test");
        var create = await client.PostAsJsonAsync("/api/incidents", new
        {
            category = "Medical", description = "Fictional first aid drill in room 14", severity = "Moderate", location = "Room 14"
        });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var body = await create.Content.ReadFromJsonAsync<JsonElement>();
        var id = body.GetProperty("id").GetGuid();
        Assert.StartsWith("E112-", body.GetProperty("reference").GetString());
        Assert.Equal("Received", body.GetProperty("currentStatus").GetString());
        Assert.Single(body.GetProperty("statusHistory").EnumerateArray());

        using var newBrowserSession = factory.CreateClient();
        await Login(newBrowserSession, "citizen@example.test", TestPasswords.Citizen);
        var details = await newBrowserSession.GetFromJsonAsync<JsonElement>($"/api/incidents/{id}");
        Assert.Equal("Fictional first aid drill in room 14", details.GetProperty("description").GetString());
        Assert.Equal("Room 14", details.GetProperty("location").GetString());
    }

    [Fact]
    public async Task Citizen_creation_requires_authentication_and_valid_fields()
    {
        using var factory = new ApiFactory();
        using var anonymous = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsJsonAsync("/api/incidents", new { })).StatusCode);
        await Register(anonymous, "valid@example.test");
        var invalid = await anonymous.PostAsJsonAsync("/api/incidents", new
        {
            category = "Police", description = "x", severity = "Critical", location = new string('x', 200)
        });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
        var missingRequiredFields = await anonymous.PostAsJsonAsync("/api/incidents", new { category = "Police", description = "     ", location = "Demo" });
        Assert.Equal(HttpStatusCode.BadRequest, missingRequiredFields.StatusCode);
    }

    [Fact]
    public async Task Citizens_cannot_read_or_delete_another_citizens_incident()
    {
        using var factory = new ApiFactory();
        using var first = factory.CreateClient();
        await Register(first, "first@example.test");
        var created = await first.PostAsJsonAsync("/api/incidents", new { category = "Fire", description = "Fictional practice smoke alarm", severity = "Low", location = "West lab" });
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        using var second = factory.CreateClient();
        await Register(second, "second@example.test");
        Assert.Equal(HttpStatusCode.NotFound, (await second.GetAsync($"/api/incidents/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await second.DeleteAsync($"/api/incidents/{id}")).StatusCode);
        Assert.Empty(await second.GetFromJsonAsync<JsonElement[]>("/api/incidents") ?? []);
    }

    [Fact]
    public async Task Citizen_can_delete_their_unreviewed_demo_incident()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        await Register(client, "delete@example.test");
        var created = await client.PostAsJsonAsync("/api/incidents", new { category = "Other", description = "Fictional practice record for deletion", severity = "Low", location = (string?)null });
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/incidents/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/incidents/{id}")).StatusCode);
    }

    [Fact]
    public async Task Citizen_is_denied_admin_api_and_admin_can_update_assign_and_audit()
    {
        using var factory = new ApiFactory();
        using var citizen = factory.CreateClient();
        await Register(citizen, "admin-test-citizen@example.test");
        var created = await citizen.PostAsJsonAsync("/api/incidents", new { category = "Police", description = "Fictional safety exercise", severity = "High", location = "Library" });
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.Forbidden, (await citizen.GetAsync("/api/admin/dashboard")).StatusCode);

        using var admin = factory.CreateClient();
        await Login(admin, "admin@example.test", factory.AdminPassword);
        var units = await admin.GetFromJsonAsync<ResponseUnitDto[]>("/api/admin/units", Json);
        Assert.NotNull(units);
        var unit = Assert.Single(units!, x => x.Category == "Police");

        var statusUpdate = await admin.PutAsJsonAsync($"/api/admin/incidents/{id}/status", new { status = "UnderReview", note = "Reviewed in demo" });
        Assert.True(statusUpdate.StatusCode == HttpStatusCode.NoContent, await statusUpdate.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PutAsJsonAsync($"/api/admin/incidents/{id}/status", new { status = "Received", note = "invalid rewind" })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsJsonAsync($"/api/admin/incidents/{id}/assignments", new { responseUnitId = unit.Id, notes = "Fictional unit" })).StatusCode);
        var detail = await admin.GetFromJsonAsync<IncidentDto>($"/api/admin/incidents/{id}", Json);
        Assert.NotNull(detail);
        Assert.Equal("Assigned", detail!.CurrentStatus.ToString());
        Assert.Equal(3, detail.StatusHistory.Count);
        Assert.Single(detail.Assignments);
        Assert.NotEmpty(await admin.GetFromJsonAsync<AuditEventDto[]>("/api/admin/activity", Json) ?? []);
    }

    [Fact]
    public async Task Login_uses_hashed_password_and_rejects_invalid_credentials()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        await Register(client, "login@example.test");
        using var wrongPassword = factory.CreateClient();
        var rejected = await wrongPassword.PostAsJsonAsync("/api/auth/login", new { email = "login@example.test", password = "wrong" });
        Assert.Equal(HttpStatusCode.Unauthorized, rejected.StatusCode);
        Assert.Contains("not recognized", await rejected.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
        using var correctPassword = factory.CreateClient();
        await Login(correctPassword, "login@example.test", TestPasswords.Citizen);
        Assert.Equal(HttpStatusCode.OK, (await correctPassword.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Citizen_can_report_sign_out_and_sign_in_again_with_a_valid_cookie_session()
    {
        using var factory = new ApiFactory();
        using var registrant = factory.CreateClient();
        var email = "repeat-login@example.test";
        var password = TestPasswords.Citizen;

        var registration = await registrant.PostAsJsonAsync("/api/auth/register", new
        {
            email, displayName = "Fictional Demo User", password
        });
        Assert.Equal(HttpStatusCode.Created, registration.StatusCode);
        AssertAuthenticationCookie(registration);

        using var browser = factory.CreateClient();
        var firstSignIn = await browser.PostAsJsonAsync("/api/auth/login", new { email, password });
        Assert.Equal(HttpStatusCode.OK, firstSignIn.StatusCode);
        AssertAuthenticationCookie(firstSignIn);
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/api/auth/me")).StatusCode);

        var created = await browser.PostAsJsonAsync("/api/incidents", new
        {
            category = "Medical", description = "Fictional first aid practice", severity = "Moderate", location = "Demo room 8"
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var incidentId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        Assert.Contains(await browser.GetFromJsonAsync<JsonElement[]>("/api/incidents") ?? [], x => x.GetProperty("id").GetGuid() == incidentId);
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/api/auth/me")).StatusCode);

        var signOut = await browser.PostAsync("/api/auth/logout", content: null);
        Assert.Equal(HttpStatusCode.NoContent, signOut.StatusCode);
        AssertAuthenticationCookieCleared(signOut);
        Assert.Equal(HttpStatusCode.Unauthorized, (await browser.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await browser.GetAsync("/api/incidents")).StatusCode);

        var signIn = await browser.PostAsJsonAsync("/api/auth/login", new { email, password });
        Assert.Equal(HttpStatusCode.OK, signIn.StatusCode);
        AssertAuthenticationCookie(signIn);
        var currentUser = await browser.GetFromJsonAsync<JsonElement>("/api/auth/me");
        Assert.Equal(email, currentUser.GetProperty("email").GetString());

        // These requests stand in for normal route changes and a page refresh: the browser's
        // HttpOnly cookie must continue authenticating each request after the login response.
        Assert.Contains(await browser.GetFromJsonAsync<JsonElement[]>("/api/incidents") ?? [], x => x.GetProperty("id").GetGuid() == incidentId);
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync($"/api/incidents/{incidentId}")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await browser.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Protected_citizen_endpoints_require_authentication()
    {
        using var factory = new ApiFactory();
        using var anonymous = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/incidents")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsJsonAsync("/api/incidents", new { })).StatusCode);
    }

    [Fact]
    public async Task Migration_and_incident_are_persisted_in_sqlite()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        await Register(client, "persist@example.test");
        await client.PostAsJsonAsync("/api/incidents", new { category = "Other", description = "Fictional database persistence check", severity = "Low", location = (string?)null });
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.True(await db.Database.CanConnectAsync());
        Assert.Equal(1, await db.Incidents.CountAsync());
        Assert.Equal(1, await db.IncidentStatusHistory.CountAsync());
    }

    private static async Task Register(HttpClient client, string email)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email, displayName = "Fictional Demo User", password = TestPasswords.Citizen
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private static async Task Login(HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static void AssertAuthenticationCookie(HttpResponseMessage response)
    {
        var cookie = Assert.Single(response.Headers.GetValues("Set-Cookie"));
        Assert.StartsWith("Emergency112.Auth=", cookie, StringComparison.Ordinal);
        Assert.Contains("path=/", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("domain=", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("; secure", cookie, StringComparison.OrdinalIgnoreCase);
    }

    private static void AssertAuthenticationCookieCleared(HttpResponseMessage response)
    {
        var cookie = Assert.Single(response.Headers.GetValues("Set-Cookie"), value => value.StartsWith("Emergency112.Auth=", StringComparison.Ordinal));
        Assert.True(cookie.Contains("expires=", StringComparison.OrdinalIgnoreCase) || cookie.Contains("max-age=0", StringComparison.OrdinalIgnoreCase));
    }
}
