-- SCRIPT UNIFICADO SWGROI
-- Migración inicial, auditoría y rollback

-- ========================
-- Migración Inicial
-- ========================

CREATE DATABASE IF NOT EXISTS swgroi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE swgroi_db;

-- Tablas principales

CREATE TABLE IF NOT EXISTS usuarios (
  IdUsuario INT NOT NULL AUTO_INCREMENT,
  NombreCompleto VARCHAR(100) NOT NULL,
  Usuario VARCHAR(50) NOT NULL,
  Contrasena VARCHAR(200) NOT NULL,
  Rol VARCHAR(50) NOT NULL,
  PRIMARY KEY (IdUsuario),
  UNIQUE KEY uq_usuarios_usuario (Usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS tickets (
  Id INT NOT NULL AUTO_INCREMENT,
  Folio VARCHAR(20) NOT NULL,
  Descripcion VARCHAR(500) NOT NULL,
  Estado VARCHAR(50) NOT NULL,
  Responsable VARCHAR(100) NOT NULL,
  Tecnico VARCHAR(100),
  Cuenta VARCHAR(100),
  RazonSocial VARCHAR(150),
  Regional VARCHAR(100),
  Domicilio VARCHAR(300),
  FechaAtencion DATE,
  AgenteResponsable VARCHAR(100),
  FechaRegistro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FechaAsignada DATE,
  HoraAsignada VARCHAR(10),
  FechaCierre DATETIME,
  Cotizacion VARCHAR(50),
  Comentario VARCHAR(1000),
  ComentariosTecnico VARCHAR(1000),
  PRIMARY KEY (Id),
  UNIQUE KEY uq_tickets_folio (Folio),
  KEY ix_tickets_estado (Estado),
  KEY ix_tickets_fecha (FechaRegistro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS tecnicos (
  IdTecnico INT NOT NULL AUTO_INCREMENT,
  Nombre VARCHAR(100) NOT NULL,
  PRIMARY KEY (IdTecnico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS asignaciones (
  AsignacionID INT NOT NULL AUTO_INCREMENT,
  TicketID INT NOT NULL,
  TecnicoID INT NOT NULL,
  FechaServicio DATE NOT NULL,
  HoraServicio TIME,
  PRIMARY KEY (AsignacionID),
  KEY (TicketID),
  KEY (TecnicoID),
  CONSTRAINT asignaciones_ibfk_1 FOREIGN KEY (TicketID) REFERENCES tickets (Id),
  CONSTRAINT asignaciones_ibfk_2 FOREIGN KEY (TecnicoID) REFERENCES tecnicos (IdTecnico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS estadoscotizacion (
  EstadoCotizacionID INT NOT NULL AUTO_INCREMENT,
  Nombre VARCHAR(50) NOT NULL,
  NombreNorm VARCHAR(50) GENERATED ALWAYS AS (UPPER(TRIM(Nombre))) STORED,
  PRIMARY KEY (EstadoCotizacionID),
  UNIQUE KEY uq_estadoscotizacion_n (NombreNorm)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS cotizaciones (
  CotizacionID INT NOT NULL AUTO_INCREMENT,
  TicketID INT NOT NULL,
  EstadoCotizacionID INT NOT NULL,
  FechaEnvio DATE,
  Monto DECIMAL(12,2) CHECK (Monto >= 0),
  Comentarios VARCHAR(1000),
  PRIMARY KEY (CotizacionID),
  KEY (TicketID),
  KEY (EstadoCotizacionID),
  CONSTRAINT cotizaciones_ibfk_1 FOREIGN KEY (TicketID) REFERENCES tickets (Id),
  CONSTRAINT cotizaciones_ibfk_2 FOREIGN KEY (EstadoCotizacionID) REFERENCES estadoscotizacion (EstadoCotizacionID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ordenesventa (
  OVSR3 VARCHAR(50) NOT NULL,
  CotizacionID INT,
  FechaVenta DATE,
  Comision DECIMAL(12,2) CHECK (Comision >= 0),
  PRIMARY KEY (OVSR3),
  KEY (CotizacionID),
  CONSTRAINT ordenesventa_ibfk_1 FOREIGN KEY (CotizacionID) REFERENCES cotizaciones (CotizacionID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ventasdetalle (
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
  Monto DECIMAL(12,2) CHECK (Monto >= 0),
  Iva DECIMAL(12,2) CHECK (Iva >= 0),
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
  KEY ix_ventasdetalle_statuspago (StatusPago),
  CONSTRAINT ventasdetalle_ibfk_1 FOREIGN KEY (CotizacionID) REFERENCES cotizaciones (CotizacionID),
  CONSTRAINT ventasdetalle_ibfk_2 FOREIGN KEY (OVSR3) REFERENCES ordenesventa (OVSR3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS documentos (
  DocumentoID INT NOT NULL AUTO_INCREMENT,
  NombreArchivo VARCHAR(100) NOT NULL,
  TipoMIME VARCHAR(50) NOT NULL,
  FechaSubida DATE,
  UsuarioID INT,
  PRIMARY KEY (DocumentoID),
  KEY (UsuarioID),
  CONSTRAINT documentos_ibfk_1 FOREIGN KEY (UsuarioID) REFERENCES usuarios (IdUsuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS avisos (
  Id INT NOT NULL AUTO_INCREMENT,
  Fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Asunto VARCHAR(100) NOT NULL,
  Mensaje VARCHAR(2000) NOT NULL,
  MetricasID INT,
  PRIMARY KEY (Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS metricas (
  Id INT NOT NULL AUTO_INCREMENT,
  TotalTickets INT NOT NULL DEFAULT 0,
  TicketsCerrados INT NOT NULL DEFAULT 0,
  PRIMARY KEY (Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS retroalimentacion (
  RetroID INT NOT NULL AUTO_INCREMENT,
  Cliente VARCHAR(100) NOT NULL,
  EnlaceUnico VARCHAR(255) NOT NULL,
  UsuarioID INT,
  PRIMARY KEY (RetroID),
  UNIQUE KEY uq_retro_enlace (EnlaceUnico),
  KEY (UsuarioID),
  CONSTRAINT retroalimentacion_ibfk_1 FOREIGN KEY (UsuarioID) REFERENCES usuarios (IdUsuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS serviciostecnicos (
  ServicioTecnicoID INT NOT NULL AUTO_INCREMENT,
  TicketID INT,
  Almacen VARCHAR(100),
  FechaCaptura DATE,
  FechaProgramacion DATE,
  FechaCierre DATE,
  Retroalimentacion VARCHAR(1000),
  PRIMARY KEY (ServicioTecnicoID),
  KEY (TicketID),
  CONSTRAINT serviciostecnicos_ibfk_1 FOREIGN KEY (TicketID) REFERENCES tickets (Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Vista de ventas
CREATE OR REPLACE VIEW vistareporteventas AS
SELECT 
  o.OVSR3,
  c.CotizacionID,
  c.Monto AS MontoCotizado,
  o.FechaVenta,
  o.Comision,
  vd.Fecha,
  COALESCE(ec.Nombre,'ENVIADO') AS Estado,
  vd.Cuenta,
  vd.RazonSocial,
  vd.Regional,
  vd.Domicilio,
  vd.Descripcion,
  vd.FechaAtencion,
  vd.AgenteResponsable,
  vd.Monto,
  vd.StatusPago,
  vd.ConstanciaDe
FROM ordenesventa o
JOIN cotizaciones c            ON c.CotizacionID = o.CotizacionID
LEFT JOIN estadoscotizacion ec ON c.EstadoCotizacionID = ec.EstadoCotizacionID
JOIN ventasdetalle vd          ON vd.OVSR3 = o.OVSR3;

-- Datos iniciales
INSERT IGNORE INTO estadoscotizacion (Nombre) VALUES
('ENVIADO'),('DECLINADA'),('ALMACEN'),
('OPERACIONES'),('COBRANZA'),('FACTURACION'),('FINALIZADO');

INSERT IGNORE INTO usuarios (NombreCompleto, Usuario, Contrasena, Rol)
VALUES ('Administrador General', 'admin', 'admin123', 'Administrador');

-- ========================
-- Auditoría
-- ========================

CREATE TABLE IF NOT EXISTS auditoria (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Agregar FK si no existe
SET @has_fk := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_aud_usuario'
);
SET @sql := IF(@has_fk=0,
  'ALTER TABLE auditoria ADD CONSTRAINT fk_aud_usuario FOREIGN KEY (IdUsuario) REFERENCES usuarios(IdUsuario) ON UPDATE CASCADE ON DELETE SET NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ========================
-- Rollback Auditoría
-- ========================

-- Para revertir auditoría:
-- START TRANSACTION;
-- DROP TABLE IF EXISTS auditoria;
-- COMMIT;
