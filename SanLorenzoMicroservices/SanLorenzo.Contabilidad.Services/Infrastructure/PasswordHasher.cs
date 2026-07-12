using System.Security.Cryptography;

namespace Contabilidad.Infrastructure
{
    /// <summary>PBKDF2 (SHA256, 100k iteraciones). Formato: {iter}.{saltB64}.{hashB64}.</summary>
    public static class PasswordHasher
    {
        private const int Iterations = 100_000;
        private const int SaltSize = 16;
        private const int HashSize = 32;

        public static string Hash(string password)
        {
            var salt = RandomNumberGenerator.GetBytes(SaltSize);
            using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, Iterations, HashAlgorithmName.SHA256);
            var hash = pbkdf2.GetBytes(HashSize);
            return $"{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
        }

        public static bool Verify(string password, string stored)
        {
            if (string.IsNullOrEmpty(stored) || stored == "PENDIENTE") return false;
            var parts = stored.Split('.');
            if (parts.Length != 3) return false;
            if (!int.TryParse(parts[0], out var iter)) return false;
            var salt = Convert.FromBase64String(parts[1]);
            var expected = Convert.FromBase64String(parts[2]);
            using var pbkdf2 = new Rfc2898DeriveBytes(password, salt, iter, HashAlgorithmName.SHA256);
            var actual = pbkdf2.GetBytes(expected.Length);
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
    }
}
