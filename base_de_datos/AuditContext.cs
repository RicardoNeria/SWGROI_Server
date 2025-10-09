using System;
using MySql.Data.MySqlClient;
using SWGROI_Server.Security;

namespace SWGROI_Server.DB
{
    // SWGROI:auditoria:2025-09-07
    // Helper mínimo para setear variables de sesión en MySQL usadas por triggers.
    public static class AuditContext
    {
        public static void ApplyAuditContext(MySqlConnection conn, string username, string ip)
        {
            if (conn == null) return;
            try
            {
                using (var c1 = new MySqlCommand("SET @usuario_accion = @U", conn))
                {
                    c1.Parameters.AddWithValue("@U", username ?? string.Empty);
                    c1.ExecuteNonQuery();
                }
                using (var c2 = new MySqlCommand("SET @ip_address = @IP", conn))
                {
                    c2.Parameters.AddWithValue("@IP", ip ?? string.Empty);
                    c2.ExecuteNonQuery();
                }
            }
            catch
            {
                // No bloquear operación si fallan variables (los triggers podrían no estar instalados)
            }
        }
    }
}

