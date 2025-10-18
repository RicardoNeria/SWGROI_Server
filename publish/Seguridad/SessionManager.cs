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
            public string FullName { get; set; } // <-- AÑADIDO
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
                var part = p.Trim();
                if (string.IsNullOrEmpty(part)) continue;
                var idx = part.IndexOf('=');
                if (idx <= 0) continue;
                var key = part.Substring(0, idx).Trim();
                var val = part.Substring(idx + 1);
                if (string.Equals(key, name, StringComparison.OrdinalIgnoreCase))
                {
                    try { return Uri.UnescapeDataString(val); } catch { return val; }
                }
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
            // Añadir Expires para compatibilidad con clientes antiguos
            try {
                var exp = DateTime.UtcNow.AddSeconds(maxAgeSeconds).ToString("R");
                sb.Append("; Expires=").Append(exp);
            } catch { }
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
            else
            {
                // Si la sesión encontrada está expirada, reemplazarla por una nueva
                if (IsExpired(s))
                {
                    _sessions.TryRemove(s.Id, out _);
                    s = new Session { Id = RandomToken(18), Csrf = RandomToken(18), CreatedAt = DateTime.UtcNow, LastSeen = DateTime.UtcNow };
                    _sessions[s.Id] = s;
                }
                else
                {
                    s.LastSeen = DateTime.UtcNow;
                }
            }

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

        public static void RotateOnLogin(HttpListenerContext ctx, string username, string role, string fullName)
        {
            var req = ctx.Request; var res = ctx.Response;
            var oldSid = GetCookie(req, "sessionid");
            if (!string.IsNullOrEmpty(oldSid)) _sessions.TryRemove(oldSid, out _);
            // Invalidar cualquier sesión anterior asociada al mismo usuario (cierre forzoso)
            try
            {
                var toRemove = new System.Collections.Generic.List<string>();
                foreach (var kv in _sessions)
                {
                    var sidKey = kv.Key;
                    var sess = kv.Value;
                    if (IsExpired(sess)) { toRemove.Add(sidKey); continue; }
                    if (!string.IsNullOrEmpty(sess.User) && string.Equals(sess.User, username, StringComparison.OrdinalIgnoreCase))
                    {
                        toRemove.Add(sidKey);
                    }
                }
                foreach (var k in toRemove) _sessions.TryRemove(k, out _);
            }
            catch { }

            var s = new Session { Id = RandomToken(18), Csrf = RandomToken(18), User = username, Role = role, FullName = fullName, CreatedAt = DateTime.UtcNow, LastSeen = DateTime.UtcNow };
            _sessions[s.Id] = s;
            var (secure, sameSite) = CookiePolicy(req);
            SetCookie(res, "sessionid", s.Id, httpOnly: true, secure: secure, sameSite: sameSite);
            SetCookie(res, "csrftoken", s.Csrf, httpOnly: false, secure: secure, sameSite: sameSite);
        }

        // Permite invalidar sesiones de un usuario desde el servidor (útil para administración o scripts)
        public static int InvalidateSessionsForUser(string username)
        {
            if (string.IsNullOrWhiteSpace(username)) return 0;
            var removed = 0;
            try
            {
                var toRemove = new System.Collections.Generic.List<string>();
                foreach (var kv in _sessions)
                {
                    var sidKey = kv.Key; var sess = kv.Value;
                    if (!string.IsNullOrEmpty(sess.User) && string.Equals(sess.User, username, StringComparison.OrdinalIgnoreCase))
                    {
                        toRemove.Add(sidKey);
                    }
                }
                foreach (var k in toRemove) { if (_sessions.TryRemove(k, out _)) removed++; }
            }
            catch { }
            return removed;
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

        public static (string user, string role, string fullName)? GetUser(HttpListenerRequest req)
        {
            var sid = GetCookie(req, "sessionid");
            if (string.IsNullOrEmpty(sid)) return null;
            if (_sessions.TryGetValue(sid, out var s))
            {
                if (IsExpired(s)) { _sessions.TryRemove(sid, out _); return null; }
                // Si la sesión no tiene usuario asignado, considérala anónima
                if (string.IsNullOrWhiteSpace(s.User)) return null;
                return (s.User, s.Role, s.FullName);
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
