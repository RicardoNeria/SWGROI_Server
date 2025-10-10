using System;
using MySql.Data.MySqlClient;

namespace SWGROI_Server.DB
{
    // Inicializador mínimo para garantizar que las tablas base existen
    public static class DatabaseInitializer
    {
        public static void EnsureCoreTables()
        {
            try
            {
                using var cn = new MySqlConnection(ConexionBD.CadenaConexion);
                cn.Open();

                // Tabla avisos
                Exec(cn, @"CREATE TABLE IF NOT EXISTS avisos (
  Id INT NOT NULL AUTO_INCREMENT,
  Fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Asunto VARCHAR(255) NOT NULL,
  Mensaje TEXT NOT NULL,
  Activo BOOLEAN NOT NULL DEFAULT TRUE,
  FechaCreacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FechaActualizacion DATETIME,
  PRIMARY KEY (Id),
  KEY ix_avisos_fecha (Fecha),
  KEY ix_avisos_activo (Activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Tabla tickets (subset compatible con controladores)
                Exec(cn, @"CREATE TABLE IF NOT EXISTS tickets (
  Id INT NOT NULL AUTO_INCREMENT,
  Folio VARCHAR(20) NOT NULL,
  Descripcion VARCHAR(500) NOT NULL,
  Estado VARCHAR(50) NOT NULL,
  Responsable VARCHAR(100) NOT NULL,
  Comentario VARCHAR(1000),
  FechaRegistro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FechaActualizacion DATETIME NULL,
  PRIMARY KEY (Id),
  UNIQUE KEY uq_tickets_folio (Folio),
  KEY ix_tickets_estado (Estado),
  KEY ix_tickets_fecha (FechaRegistro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Estados de cotización
                Exec(cn, @"CREATE TABLE IF NOT EXISTS estadoscotizacion (
  EstadoCotizacionID INT NOT NULL AUTO_INCREMENT,
  Nombre VARCHAR(50) NOT NULL,
  PRIMARY KEY (EstadoCotizacionID),
  UNIQUE KEY uq_estadoscotizacion_nombre (Nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Cotizaciones
                Exec(cn, @"CREATE TABLE IF NOT EXISTS cotizaciones (
  CotizacionID INT NOT NULL AUTO_INCREMENT,
  TicketID INT NOT NULL,
  EstadoCotizacionID INT NOT NULL,
  FechaEnvio DATE,
  Monto DECIMAL(12,2),
  Comentarios VARCHAR(1000),
  PRIMARY KEY (CotizacionID),
  KEY (TicketID),
  KEY (EstadoCotizacionID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Ordenes de venta (para FK de ventasdetalle.OVSR3)
                Exec(cn, @"CREATE TABLE IF NOT EXISTS ordenesventa (
  OVSR3 VARCHAR(50) NOT NULL,
  CotizacionID INT,
  FechaVenta DATE,
  Comision DECIMAL(12,2),
  PRIMARY KEY (OVSR3),
  KEY (CotizacionID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                // Ventas detalle (consultado por VentasController)
                Exec(cn, @"CREATE TABLE IF NOT EXISTS ventasdetalle (
  DetalleID INT NOT NULL AUTO_INCREMENT,
  CotizacionID INT,
  OVSR3 VARCHAR(50),
  Fecha DATE,
  Cuenta VARCHAR(100),
  RazonSocial VARCHAR(150),
  Regional VARCHAR(100),
  Domicilio VARCHAR(300),
  Descripcion VARCHAR(1000),
  Comentarios VARCHAR(1000),
  FechaAtencion DATE,
  AgenteResponsable VARCHAR(100),
  Monto DECIMAL(12,2),
  Iva DECIMAL(12,2),
  TotalConComision DECIMAL(12,2),
  StatusPago VARCHAR(100),
  FechaCancelacion DATETIME,
  MotivoCancelacion VARCHAR(250),
  UsuarioCancelacion VARCHAR(100),
  ConstanciaDe VARCHAR(100),
  ComentariosCotizacion VARCHAR(1000),
  PRIMARY KEY (DetalleID),
  UNIQUE KEY uq_ventasdetalle_ovsr3 (OVSR3),
  KEY (CotizacionID),
  KEY ix_ventasdetalle_statuspago (StatusPago)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[DB INIT] Error asegurando tablas: {ex.Message}");
            }
        }

        private static void Exec(MySqlConnection cn, string sql)
        {
            using var cmd = new MySqlCommand(sql, cn);
            cmd.ExecuteNonQuery();
        }
    }
}
