using System;
using System.Net;
using System.Threading.Tasks;
using MySql.Data.MySqlClient;
using SWGROI_Server.DB;

namespace SWGROI_Server.Infrastructure
{
    public static class AuditLogger
    {
        public static int? TryResolveUserId(string username)
        {
            if (string.IsNullOrWhiteSpace(username)) return null;
            try
            {
                using (var conexion = new MySqlConnection(ConexionBD.CadenaConexion))
                {
                    conexion.Open();
                    var cmd = new MySqlCommand("SELECT IdUsuario FROM usuarios WHERE Usuario = @u LIMIT 1", conexion);
                    cmd.Parameters.AddWithValue("@u", username);
                    var res = cmd.ExecuteScalar();
                    if (res == null || res == DBNull.Value) return null;
                    return Convert.ToInt32(res);
                }
            }
            catch (Exception ex)
            {
                try { Console.WriteLine("AuditLogger.TryResolveUserId error: " + ex.Message); } catch { }
                return null;
            }
        }

        public static (string ip, string ua) Client(HttpListenerRequest request)
        {
            string ip = request.RemoteEndPoint?.Address?.ToString() ?? "unknown";
            string ua = request.UserAgent ?? "unknown";
            return (ip, ua);
        }

        public static async Task LogAsync(int? userId, string method, string path, string table, string action, 
            string target, string status, string description, string ip, string userAgent)
        {
            // TODO: Implementar logging de auditoría
            await Task.CompletedTask;
            Console.WriteLine($"[AUDIT] {DateTime.Now:yyyy-MM-dd HH:mm:ss} User:{userId} {method} {path} {action} {target} {status}");
        }
    }
}