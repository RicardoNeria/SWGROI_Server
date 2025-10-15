using MySql.Data.MySqlClient;

namespace SWGROI_Server.DB
{
    public static class SchemaInitializer
    {
        // Crea la tabla 'auditoria' si no existe. Idempotente y seguro de llamar múltiples veces.
        public static void EnsureAuditoriaTable(MySqlConnection conn)
        {
            using (var cmd = new MySqlCommand(@"CREATE TABLE IF NOT EXISTS auditoria (
  IdAudit BIGINT AUTO_INCREMENT PRIMARY KEY,
  IdUsuario INT NULL,
  Metodo VARCHAR(10) NOT NULL,
  Endpoint VARCHAR(200) NOT NULL,
  Entidad VARCHAR(100) NULL,
  Accion VARCHAR(50) NOT NULL,
  ClaveEntidad VARCHAR(100) NULL,
  IpCliente VARCHAR(45) NULL,
  UserAgent VARCHAR(255) NULL,
  Resultado VARCHAR(20) NOT NULL,
  Mensaje TEXT NULL,
  Fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (Endpoint), INDEX (Entidad), INDEX (Accion), INDEX (Fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;", conn))
            {
                cmd.ExecuteNonQuery();
            }
        }
    }
}
