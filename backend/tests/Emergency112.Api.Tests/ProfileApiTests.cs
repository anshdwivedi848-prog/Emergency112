using System.Net;
using System.Net.Http.Json;
using Emergency112.Api.Contracts;

namespace Emergency112.Api.Tests;

public sealed class ProfileApiTests
{
    private static readonly string CitizenPassword = TestPasswords.Citizen;

    [Fact]
    public async Task Citizen_profile_and_trusted_contact_are_saved_and_survive_a_new_session()
    {
        using var factory = new ApiFactory();
        using var registeringClient = factory.CreateClient();
        const string email = "profile-citizen@example.test";
        var registration = await registeringClient.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            displayName = "Original Citizen",
            password = CitizenPassword,
        });
        Assert.Equal(HttpStatusCode.Created, registration.StatusCode);

        using var client = factory.CreateClient();
        await SignIn(client, email, CitizenPassword);
        var initial = await client.GetFromJsonAsync<CitizenProfileDto>("/api/profile");
        Assert.NotNull(initial);
        Assert.Equal(email, initial.Email);
        Assert.Equal("Original Citizen", initial.FullName);
        Assert.Null(initial.PhoneNumber);
        Assert.Null(initial.TrustedContactName);
        Assert.Null(initial.TrustedContactPhoneNumber);

        var update = await client.PutAsJsonAsync("/api/profile", new
        {
            fullName = "  Updated Citizen  ",
            phoneNumber = "+44 20 7946 0958",
            trustedContactName = "Trusted Demo Contact",
            trustedContactPhoneNumber = "+44 7700 900123",
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var saved = await update.Content.ReadFromJsonAsync<CitizenProfileDto>();
        Assert.NotNull(saved);
        Assert.Equal(email, saved.Email);
        Assert.Equal("Updated Citizen", saved.FullName);
        Assert.Equal("+44 20 7946 0958", saved.PhoneNumber);
        Assert.Equal("Trusted Demo Contact", saved.TrustedContactName);

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsync("/api/auth/logout", content: null)).StatusCode);
        await SignIn(client, email, CitizenPassword);
        var persisted = await client.GetFromJsonAsync<CitizenProfileDto>("/api/profile");
        Assert.NotNull(persisted);
        Assert.Equal("Updated Citizen", persisted.FullName);
        Assert.Equal("+44 20 7946 0958", persisted.PhoneNumber);
        Assert.Equal("Trusted Demo Contact", persisted.TrustedContactName);
        Assert.Equal("+44 7700 900123", persisted.TrustedContactPhoneNumber);

        var clearedContact = await client.PutAsJsonAsync("/api/profile", new
        {
            fullName = persisted.FullName,
            phoneNumber = persisted.PhoneNumber,
            trustedContactName = "",
            trustedContactPhoneNumber = "",
        });
        Assert.Equal(HttpStatusCode.OK, clearedContact.StatusCode);
        var afterRemoval = await clearedContact.Content.ReadFromJsonAsync<CitizenProfileDto>();
        Assert.NotNull(afterRemoval);
        Assert.Null(afterRemoval.TrustedContactName);
        Assert.Null(afterRemoval.TrustedContactPhoneNumber);
    }

    [Fact]
    public async Task Profile_endpoints_require_a_signed_in_citizen()
    {
        using var factory = new ApiFactory();
        using var anonymous = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/profile")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PutAsJsonAsync("/api/profile", new { fullName = "Someone" })).StatusCode);

        using var admin = factory.CreateClient();
        await SignIn(admin, "admin@example.test", factory.AdminPassword);
        Assert.Equal(HttpStatusCode.Forbidden, (await admin.GetAsync("/api/profile")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await admin.PutAsJsonAsync("/api/profile", new { fullName = "Someone" })).StatusCode);
    }

    [Fact]
    public async Task Invalid_phone_or_partial_trusted_contact_is_rejected_without_saving()
    {
        using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        const string email = "invalid-profile@example.test";
        var registration = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email,
            displayName = "Original Citizen",
            password = CitizenPassword,
        });
        Assert.Equal(HttpStatusCode.Created, registration.StatusCode);

        var response = await client.PutAsJsonAsync("/api/profile", new
        {
            fullName = "A",
            phoneNumber = "not a phone number",
            trustedContactName = "Only a name",
            trustedContactPhoneNumber = "",
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var unchanged = await client.GetFromJsonAsync<CitizenProfileDto>("/api/profile");
        Assert.NotNull(unchanged);
        Assert.Equal("Original Citizen", unchanged.FullName);
        Assert.Null(unchanged.PhoneNumber);
        Assert.Null(unchanged.TrustedContactName);
    }

    private static async Task SignIn(HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
