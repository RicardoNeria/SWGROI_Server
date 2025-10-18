using System;
using System.Security.Cryptography;
using System.Text;

namespace SWGROI_Server.Security
{
    // PBKDF2 con formato de almacenamiento auto-descriptivo: PBKDF2$<iter>$<saltB64>$<hashB64>
    public static class PasswordHasher
    {
        private const int DefaultIter = 100_000;
        private const int SaltSize = 16; // 128-bit
        private const int KeySize = 32;  // 256-bit

        public static string Hash(string password, int iterations = DefaultIter)
        {
            if (password == null) password = string.Empty;
            using var rng = RandomNumberGenerator.Create();
            var salt = new byte[SaltSize];
            rng.GetBytes(salt);
            var key = Pbkdf2(password, salt, iterations, KeySize);
            return $"PBKDF2${iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(key)}";
        }

        public static bool Verify(string password, string stored)
        {
            if (string.IsNullOrEmpty(stored)) return false;
            if (!stored.StartsWith("PBKDF2$", StringComparison.Ordinal))
            {
                // No migrado (texto plano u otro formato): comparar directo como fallback temporal.
                return string.Equals(password ?? string.Empty, stored, StringComparison.Ordinal);
            }
            var parts = stored.Split('$');
            if (parts.Length != 4) return false;
            if (!int.TryParse(parts[1], out int iter)) return false;
            var salt = Convert.FromBase64String(parts[2]);
            var key = Convert.FromBase64String(parts[3]);
            var test = Pbkdf2(password ?? string.Empty, salt, iter, key.Length);
            return FixedTimeEquals(test, key);
        }

        public static bool NeedsMigration(string stored)
            => string.IsNullOrEmpty(stored) || !stored.StartsWith("PBKDF2$", StringComparison.Ordinal);

        private static byte[] Pbkdf2(string password, byte[] salt, int iter, int size)
        {
            using var pbk = new Rfc2898DeriveBytes(password, salt, iter, HashAlgorithmName.SHA256);
            return pbk.GetBytes(size);
        }

        private static bool FixedTimeEquals(byte[] a, byte[] b)
        {
            if (ReferenceEquals(a, b)) return true;
            if (a == null || b == null || a.Length != b.Length) return false;
            int diff = 0;
            for (int i = 0; i < a.Length; i++) diff |= a[i] ^ b[i];
            return diff == 0;
        }
    }
}
