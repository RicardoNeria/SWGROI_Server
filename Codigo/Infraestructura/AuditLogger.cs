// SWGROI:auditoria:2025-09-07
using System;
using System.Net;
using System.Threading.Tasks;
using MySql.Data.MySqlClient;
using SWGROI_Server.DB;
using SWGROI_Server.Security;

namespace SWGROI_Server.Infrastructure
{
    public static class AuditLogger
    {
        public static Task LogAsync(int? idUsuario, string metodo, string endpoint,
            string entidad, string accion, string claveEntidad, string resultado, string mensaje,
            string ip, string userAgent)
        {
            return Task.Run(() =>
            {
                try
                {
                    using (var cn = new MySqlConnection(ConexionBD.CadenaConexion))
                    {
                        cn.Open();
                        string sql = @"INSERT INTO auditoria
                            (IdUsuario, Metodo, Endpoint, Entidad, Accion, ClaveEntidad,
                             IpCliente, UserAgent, Resultado, Mensaje)
                             VALUES (@IdUsuario, @Metodo, @Endpoint, @Entidad, @Accion, @ClaveEntidad,
                                     @IpCliente, @UserAgent, @Resultado, @Mensaje)";
                        using (var cmd = new MySqlCommand(sql, cn))
                        {
                            cmd.Parameters.AddWithValue("@IdUsuario", (object)idUsuario ?? DBNull.Value);
                            cmd.Parameters.AddWithValue("@Metodo", (metodo ?? string.Empty).Substring(0, Math.Min(10, metodo?.Length ?? 0)));
                            cmd.Parameters.AddWithValue("@Endpoint", (endpoint ?? string.Empty).Substring(0, Math.Min(200, endpoint?.Length ?? 0)));
                            cmd.Parameters.AddWithValue("@Entidad", (object)entidad ?? DBNull.Value);
                            cmd.Parameters.AddWithValue("@Accion", (accion ?? string.Empty).Substring(0, Math.Min(50, accion?.Length ?? 0)));
                            cmd.Parameters.AddWithValue("@ClaveEntidad", (object)claveEntidad ?? DBNull.Value);
                            cmd.Parameters.AddWithValue("@IpCliente", (object)ip ?? DBNull.Value);
                            cmd.Parameters.AddWithValue("@UserAgent", (userAgent ?? string.Empty).Substring(0, Math.Min(255, userAgent?.Length ?? 0)));
                            cmd.Parameters.AddWithValue("@Resultado", (resultado ?? "OK").Substring(0, Math.Min(20, resultado?.Length ?? 0)));
                            cmd.Parameters.AddWithValue("@Mensaje", (object)mensaje ?? DBNull.Value);
                            cmd.ExecuteNonQuery();
                        }
                    }
                }
                catch
                {
                    // No bloquear la operación por fallas de auditoría
                }
            });
        }

        public static int? TryResolveUserId(string username)
        {
            if (string.IsNullOrWhiteSpace(username)) return null;
            try
            {
                using (var cn = new MySqlConnection(ConexionBD.CadenaConexion))
                {
                    cn.Open();
                    using (var cmd = new MySqlCommand("SELECT IdUsuario FROM usuarios WHERE Usuario=@u LIMIT 1", cn))
                    {
                        cmd.Parameters.AddWithValue("@u", username);
                        var obj = cmd.ExecuteScalar();
                        if (obj == null || obj == DBNull.Value) return null;
                        return Convert.ToInt32(obj);
                    }
                }
            }
            catch { return null; }
        }

        public static (string ip, string ua) Client(HttpListenerRequest req)
        {
            string ip = req?.RemoteEndPoint?.Address?.ToString() ?? "-";
            string ua = req?.UserAgent ?? "-";
            return (ip, ua);
        }
    }
}

