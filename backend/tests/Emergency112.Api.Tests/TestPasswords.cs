using System.Security.Cryptography;

namespace Emergency112.Api.Tests;

internal static class TestPasswords
{
    public static string Citizen { get; } = Create();

    public static string Create() => $"Aa1!{Convert.ToHexString(RandomNumberGenerator.GetBytes(24))}";
}
