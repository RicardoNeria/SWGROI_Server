using System;
using System.Collections.Concurrent;
using System.Net;
using System.Security.Cryptography;
using System.Text;

namespace SWGROI_Server.Security
{
    // Manejo de sesión y CSRF en memoria. Mantiene compatibilidad con cookies existentes del front.
    public static class SessionManager
    {
        private class Session
        {
            public string Id { get; set; }
            public string Csrf { get; set; }
            public string User { get; set; }
            public string Role { get; set; }
            public DateTime CreatedAt { get; set; }
            public DateTime LastSeen { get; set; }
        }

        private static readonly ConcurrentDictionary<string, Session> _sessions = new ConcurrentDictionary<string, Session>();

        // Configurable por variables de entorno: tiempo inactividad y tiempo absoluto de vida
        private static readonly TimeSpan IdleTimeout = TimeSpan.FromMinutes(
            GetIntSetting("SESSION_IDLE_MINUTES", 30));
        private static readonly TimeSpan AbsoluteLifetime = TimeSpan.FromHours(
            GetIntSetting("SESSION_ABSOLUTE_HOURS", 8));

        private static string RandomToken(int bytes = 16)
        {
            var b = new byte[bytes];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(b);
            }
            return Convert.ToBase64String(b).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        }

        public static string GetCookie(HttpListenerRequest req, string name)
        {
            var raw = req.Headers["Cookie"] ?? string.Empty;
            var parts = raw.Split(';');
            foreach (var p in parts)
            {
                var kv = p.Trim().Split('=');
                if (kv.Length == 2 && kv[0] == name) return Uri.UnescapeDataString(kv[1]);
            }
            return null;
        }

        private static bool IsHttps(HttpListenerRequest req)
        {
            var xf = req.Headers["X-Forwarded-Proto"]; // detrás de proxy
            if (!string.IsNullOrEmpty(xf) && xf.Equals("https", StringComparison.OrdinalIgnoreCase)) return true;
            var url = req.Url; return url != null && url.Scheme == "https";
        }

        private static void SetCookie(HttpListenerResponse res, string name, string value, bool httpOnly, bool secure, string sameSite = "Lax", int maxAgeSeconds = 60 * 60 * 8)
        {
            var sb = new StringBuilder();
            sb.Append(name).Append("=").Append(Uri.EscapeDataString(value ?? string.Empty)).Append("; Path=/; Max-Age=").Append(maxAgeSeconds);
            if (httpOnly) sb.Append("; HttpOnly");
            if (secure) sb.Append("; Secure");
            if (!string.IsNullOrEmpty(sameSite)) sb.Append("; SameSite=").Append(sameSite);
            res.Headers.Add("Set-Cookie", sb.ToString());
        }

        public static void EnsureSession(HttpListenerContext ctx)
        {
            var req = ctx.Request; var res = ctx.Response;
            var sid = GetCookie(req, "sessionid");
            Session s = null;
            if (!string.IsNullOrEmpty(sid)) _sessions.TryGetValue(sid, out s);
            if (s == null)
            {
                s = new Session { Id = RandomToken(18), Csrf = RandomToken(18), CreatedAt = DateTime.UtcNow, LastSeen = DateTime.UtcNow };
                _sessions[s.Id] = s;
            }
            else { s.LastSeen = DateTime.UtcNow; }

            var (secure, sameSite) = CookiePolicy(req);
            SetCookie(res, "sessionid", s.Id, httpOnly: true, secure: secure, sameSite: sameSite);
            SetCookie(res, "csrftoken", s.Csrf, httpOnly: false, secure: secure, sameSite: sameSite);
        }

        public static bool ValidateCsrf(HttpListenerContext ctx)
        {
            var req = ctx.Request;
            var method = (req.HttpMethod ?? "GET").ToUpperInvariant();
            if (method == "GET" || method == "HEAD" || method == "OPTIONS") return true;

            var sid = GetCookie(req, "sessionid");
            if (string.IsNullOrEmpty(sid) || !_sessions.TryGetValue(sid, out var s)) return false;
            if (IsExpired(s)) { _sessions.TryRemove(sid, out _); return false; }

            var headerToken = req.Headers["X-CSRF-Token"];
            var cookieToken = GetCookie(req, "csrftoken");
            var token = headerToken ?? cookieToken;
            if (string.IsNullOrEmpty(token)) return false;
            return string.Equals(token, s.Csrf, StringComparison.Ordinal);
        }

        public static void RotateOnLogin(HttpListenerContext ctx, string username, string role)
        {
            var req = ctx.Request; var res = ctx.Response;
            var oldSid = GetCookie(req, "sessionid");
            if (!string.IsNullOrEmpty(oldSid)) _sessions.TryRemove(oldSid, out _);
            var s = new Session { Id = RandomToken(18), Csrf = RandomToken(18), User = username, Role = role, CreatedAt = DateTime.UtcNow, LastSeen = DateTime.UtcNow };
            _sessions[s.Id] = s;
            var (secure, sameSite) = CookiePolicy(req);
            SetCookie(res, "sessionid", s.Id, httpOnly: true, secure: secure, sameSite: sameSite);
            SetCookie(res, "csrftoken", s.Csrf, httpOnly: false, secure: secure, sameSite: sameSite);
        }

        public static void Destroy(HttpListenerContext ctx)
        {
            var req = ctx.Request; var res = ctx.Response;
            var sid = GetCookie(req, "sessionid");
            if (!string.IsNullOrEmpty(sid)) _sessions.TryRemove(sid, out _);
            // Expira cookies respetando atributos según canal
            var (secure, sameSite) = CookiePolicy(req);
            res.Headers.Add("Set-Cookie", $"sessionid=; Path=/; Max-Age=0; HttpOnly; SameSite={sameSite}{(secure?"; Secure":"")}");
            res.Headers.Add("Set-Cookie", $"csrftoken=; Path=/; Max-Age=0; SameSite={sameSite}{(secure?"; Secure":"")}");
        }

        public static (string user, string role)? GetUser(HttpListenerRequest req)
        {
            var sid = GetCookie(req, "sessionid");
            if (string.IsNullOrEmpty(sid)) return null;
            if (_sessions.TryGetValue(sid, out var s))
            {
                if (IsExpired(s)) { _sessions.TryRemove(sid, out _); return null; }
                // Si la sesión no tiene usuario asignado, considérala anónima
                if (string.IsNullOrWhiteSpace(s.User)) return null;
                return (s.User, s.Role);
            }
            return null;
        }

        private static bool IsLocalHost(HttpListenerRequest req)
        {
            var host = req.UserHostName ?? req.Headers["Host"] ?? string.Empty;
            return host.Contains("localhost") || host.Contains("127.0.0.1");
        }

        private static bool IsExpired(Session s)
        {
            var now = DateTime.UtcNow;
            if (now - s.LastSeen > IdleTimeout) return true;
            if (now - s.CreatedAt > AbsoluteLifetime) return true;
            return false;
        }

        private static (bool secure, string sameSite) CookiePolicy(HttpListenerRequest req)
        {
            // Política endurecida: SameSite=Strict y Secure en HTTPS (detrás de proxy usar X-Forwarded-Proto)
            var https = IsHttps(req);
            return https ? (true, "Strict") : (false, "Strict");
        }

        private static int GetIntSetting(string key, int def)
        {
            try
            {
                // 1) appSettings (app.config)
                var v1 = System.Configuration.ConfigurationManager.AppSettings[key];
                if (!string.IsNullOrEmpty(v1) && int.TryParse(v1, out var n1) && n1 > 0) return n1;
            }
            catch { }
            try
            {
                // 2) environment
                var v2 = Environment.GetEnvironmentVariable(key);
                if (!string.IsNullOrEmpty(v2) && int.TryParse(v2, out var n2) && n2 > 0) return n2;
            }
            catch { }
            return def;
        }
    }
}
