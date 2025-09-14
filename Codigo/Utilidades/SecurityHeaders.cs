using System.Net;

namespace SWGROI_Server.Utils
{
    // Aplica cabeceras de seguridad por defecto (CSP, no-sniff, etc.).
    public static class SecurityHeaders
    {
        public static void Apply(HttpListenerResponse res)
        {
            // CSP: permitimos 'unsafe-inline' en scripts para no romper scripts inline existentes (login, etc.).
            res.Headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
            res.Headers["X-Content-Type-Options"] = "nosniff";
            res.Headers["X-Frame-Options"] = "DENY";
            res.Headers["Referrer-Policy"] = "no-referrer";
            // HSTS: navegadores ignorarán este header si llega por HTTP, pero es deseable para HTTPS y reverse proxies
            res.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
        }
    }
}
