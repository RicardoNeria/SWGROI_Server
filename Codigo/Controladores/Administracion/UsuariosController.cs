using System;
using System.IO;
using System.Net;
using System.Text;
using MySql.Data.MySqlClient;
using SWGROI_Server.DB;
using SWGROI_Server.Security;

namespace SWGROI_Server.Controllers.Administracion
{
    public static class UsuariosController
    {
        public static void Manejar(HttpListenerContext ctx)
        {
            var path = (ctx.Request.Url?.AbsolutePath ?? "/").ToLowerInvariant();
            if (path == "/usuarios/agregar" && ctx.Request.HttpMethod == "POST")
            { Agregar(ctx); return; }
            if (path == "/usuarios/roles" && ctx.Request.HttpMethod == "GET")
            { Roles(ctx); return; }

            ctx.Response.StatusCode = 404;
            ctx.Response.Close();
        }

        private static void Agregar(HttpListenerContext ctx)
        {
            try
            {
                using var reader = new StreamReader(ctx.Request.InputStream, Encoding.UTF8);
                var body = reader.ReadToEnd();
                string nombre = null, usuario = null, contrasena = null, rol = null;
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(body);
                    var root = doc.RootElement;
                    nombre = root.GetProperty("NombreCompleto").GetString();
                    usuario = root.GetProperty("Usuario").GetString();
                    contrasena = root.GetProperty("Contrasena").GetString();
                    rol = root.GetProperty("Rol").GetString();
                }
                catch { }

                if (string.IsNullOrWhiteSpace(nombre) || string.IsNullOrWhiteSpace(usuario) || string.IsNullOrWhiteSpace(contrasena) || string.IsNullOrWhiteSpace(rol))
                { Json(ctx, 400, "{\"success\":false,\"message\":\"Campos obligatorios\"}"); return; }
                if (contrasena.Length < 8) { Json(ctx, 400, "{\"success\":false,\"message\":\"Contraseña mínima de 8 caracteres\"}"); return; }

                using var cn = new MySqlConnection(ConexionBD.CadenaConexion); cn.Open();
                using (var chk = new MySqlCommand("SELECT COUNT(*) FROM usuarios WHERE Usuario=@u", cn))
                { chk.Parameters.AddWithValue("@u", usuario); var n = Convert.ToInt32(chk.ExecuteScalar()); if (n > 0) { Json(ctx, 409, "{\"success\":false,\"message\":\"El usuario ya existe\"}"); return; } }

                string hash = PasswordHasher.Hash(contrasena);
                using (var ins = new MySqlCommand("INSERT INTO usuarios (NombreCompleto, Usuario, Contrasena, Rol) VALUES (@n,@u,@c,@r)", cn))
                {
                    ins.Parameters.AddWithValue("@n", nombre.Trim());
                    ins.Parameters.AddWithValue("@u", usuario.Trim());
                    ins.Parameters.AddWithValue("@c", hash);
                    ins.Parameters.AddWithValue("@r", rol.Trim());
                    ins.ExecuteNonQuery();
                }

                Json(ctx, 200, "{\"success\":true,\"message\":\"Usuario agregado correctamente\"}");
            }
            catch (Exception ex)
            {
                Json(ctx, 500, "{\"success\":false,\"message\":\"Error interno\",\"detail\":\"" + Esc(ex.Message) + "\"}");
            }
        }

        private static void Json(HttpListenerContext ctx, int status, string json)
        { ctx.Response.StatusCode = status; ctx.Response.ContentType = "application/json; charset=utf-8"; var b = Encoding.UTF8.GetBytes(json); ctx.Response.ContentLength64 = b.Length; ctx.Response.OutputStream.Write(b,0,b.Length); ctx.Response.OutputStream.Close(); }
        private static string Esc(string s) => (s ?? string.Empty).Replace("\\","\\\\").Replace("\"","\\\"");

        private static void Roles(HttpListenerContext ctx)
        {
            try
            {
                // Intentar leer de una tabla ROLES; si no existe, devolver lista estática
                try
                {
                    using var cn = new MySqlConnection(ConexionBD.CadenaConexion); cn.Open();
                    using var cmd = new MySqlCommand("SELECT Id, Nombre FROM roles ORDER BY Id", cn);
                    using var rd = cmd.ExecuteReader();
                    var sb = new StringBuilder(); sb.Append("["); bool first = true;
                    while (rd.Read())
                    {
                        if (!first) sb.Append(','); first = false;
                        sb.Append("{\"id\":").Append(rd[0]).Append(",\"nombre\":\"").Append(Esc(Convert.ToString(rd[1]) ?? string.Empty)).Append("\"}");
                    }
                    sb.Append("]");
                    if (!first) { Json(ctx, 200, sb.ToString()); return; }
                }
                catch { /* fallback a estáticos */ }

                string estaticos = "[" +
                    "{\"id\":1,\"nombre\":\"Administrador\"}," +
                    "{\"id\":2,\"nombre\":\"Supervisor\"}," +
                    "{\"id\":3,\"nombre\":\"Técnico\"}," +
                    "{\"id\":4,\"nombre\":\"CCC\"}," +
                    "{\"id\":5,\"nombre\":\"Mesa de Control\"}" + "]";
                Json(ctx, 200, estaticos);
            }
            catch (Exception ex)
            { Json(ctx, 500, "{\"success\":false,\"message\":\"Error roles\",\"detail\":\"" + Esc(ex.Message) + "\"}"); }
        }
    }
}
