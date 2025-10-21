using System;
using System.IO;
using System.Threading;
using System.Text;

namespace SWGROI_Server.Utils
{
    // Logger sencillo y thread-safe para trazabilidad y soporte.
    public static class Logger
    {
        private static readonly object _lock = new object();
        private static readonly string _logDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logs");
        private static DateTime _lastCleanup = DateTime.MinValue;

        public static string NewRequestId() => Guid.NewGuid().ToString("N");

        public static void Info(string msg, string requestId = null)
            => Write("INFO", msg, requestId);

        public static void Warn(string msg, string requestId = null)
            => Write("WARN", msg, requestId);

        public static void Error(string msg, string requestId = null)
            => Write("ERROR", msg, requestId);

        private static void Write(string level, string msg, string requestId)
        {
            // No exponer datos sensibles si aparecen accidentalmente.
            msg = Redact(msg);
            var line = $"[{DateTime.UtcNow:O}] {level} {(requestId ?? "-")} {msg}";
            lock (_lock)
            {
                Console.WriteLine(line);
                try
                {
                    if (!Directory.Exists(_logDir)) Directory.CreateDirectory(_logDir);
                    var file = Path.Combine(_logDir, $"swgroi-{DateTime.UtcNow:yyyy-MM-dd}.log");
                    File.AppendAllText(file, line + Environment.NewLine, Encoding.UTF8);
                    // Limpieza de archivos >14 días una vez al día
                    if (_lastCleanup.Date != DateTime.UtcNow.Date)
                    {
                        _lastCleanup = DateTime.UtcNow.Date;
                        foreach (var f in Directory.GetFiles(_logDir, "swgroi-*.log"))
                        {
                            try
                            {
                                var info = new FileInfo(f);
                                if (info.LastWriteTimeUtc < DateTime.UtcNow.AddDays(-14)) info.Delete();
                            }
                            catch { }
                        }
                    }
                }
                catch { /* no bloquear app si el disco falla */ }
            }
        }

        private static string Redact(string s)
        {
            if (string.IsNullOrEmpty(s)) return s;
            s = s.Replace("Contrasena=", "Contrasena=[REDACTED]");
            s = s.Replace("password=", "password=[REDACTED]");
            s = s.Replace("Authorization:", "Authorization:[REDACTED]");
            return s;
        }
    }
}

