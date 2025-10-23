using System.Text.RegularExpressions;

namespace SWGROI_Server.Utils
{
    // Validaciones comunes para entradas; ayudar a evitar inyección y datos inválidos.
    public static class Validate
    {
        public static bool NotNullOrEmpty(string value, int minLen = 1) => !string.IsNullOrWhiteSpace(value) && value.Trim().Length >= minLen;
        public static bool MaxLen(string value, int max) => (value ?? string.Empty).Length <= max;
        public static bool Regex(string value, string pattern) => value != null && System.Text.RegularExpressions.Regex.IsMatch(value, pattern);

        public static bool Email(string value) => Regex(value ?? string.Empty, @"^[^\s@]+@[^\s@]+\.[^\s@]+$");
        public static bool Folio(string value) => Regex((value ?? string.Empty).Trim().ToUpperInvariant(), @"^[A-Z0-9\-]{6,20}$");
        public static bool OVSR3(string value) => Regex((value ?? string.Empty).Trim().ToUpperInvariant(), @"^[A-Z0-9]{3,20}$");
    }
}

