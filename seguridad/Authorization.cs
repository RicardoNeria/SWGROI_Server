using System;
using System.IO;
using System.Net;
using System.Text;

namespace SWGROI_Server.Security
{
    public static class Authorization
    {
        public static bool RequireLogin(HttpListenerContext ctx)
        {
            var user = SessionManager.GetUser(ctx.Request);
            if (!user.HasValue)
            {
                ctx.Response.StatusCode = 401;
                ctx.Response.ContentType = "application/json; charset=utf-8";
                using var w = new StreamWriter(ctx.Response.OutputStream, Encoding.UTF8);
                w.Write("{\"code\":\"unauthenticated\",\"message\":\"Inicie sesión para continuar\"}");
                return false;
            }
            return true;
        }

        public static bool RequireRoles(HttpListenerContext ctx, params string[] roles)
        {
            var user = SessionManager.GetUser(ctx.Request);
            if (!user.HasValue)
            {
                ctx.Response.StatusCode = 401;
                ctx.Response.ContentType = "application/json; charset=utf-8";
                using var w = new StreamWriter(ctx.Response.OutputStream, Encoding.UTF8);
                w.Write("{\"code\":\"unauthenticated\",\"message\":\"Inicie sesión para continuar\"}");
                return false;
            }
            var role = user.Value.role ?? string.Empty;
            foreach (var r in roles)
            {
                if (string.Equals(role, r, StringComparison.OrdinalIgnoreCase)) return true;
            }
            ctx.Response.StatusCode = 403;
            ctx.Response.ContentType = "application/json; charset=utf-8";
            using var wr = new StreamWriter(ctx.Response.OutputStream, Encoding.UTF8);
            wr.Write("{\"code\":\"forbidden\",\"message\":\"No tiene permisos suficientes\"}");
            return false;
        }
    }
}

