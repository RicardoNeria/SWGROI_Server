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

-- ========================
-- MÓDULO CCC - RETROALIMENTACIÓN
-- ========================

-- Tabla principal para gestión de enlaces de retroalimentación
CREATE TABLE IF NOT EXISTS retroalimentacion (
  RetroID INT NOT NULL AUTO_INCREMENT,
  Cliente VARCHAR(100) NOT NULL,
  EnlaceUnico VARCHAR(255) NOT NULL,
  UsuarioID INT,
  TicketID INT,
  FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  Estado ENUM('Pendiente', 'Contestada', 'Expirada') DEFAULT 'Pendiente',
  PRIMARY KEY (RetroID),
  UNIQUE KEY uq_retro_enlace (EnlaceUnico),
  UNIQUE KEY uq_retro_ticket (TicketID),
  KEY idx_retro_usuario (UsuarioID),
  KEY idx_retro_fecha (FechaCreacion),
  KEY idx_retro_estado (Estado),
  CONSTRAINT retroalimentacion_ibfk_1 FOREIGN KEY (UsuarioID) REFERENCES usuarios (IdUsuario),
  CONSTRAINT retroalimentacion_ibfk_2 FOREIGN KEY (TicketID) REFERENCES tickets (Id)
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
-- Retroalimentación CCC - Respuestas
-- ========================

-- Tabla para almacenar las respuestas de las 5 preguntas de satisfacción
CREATE TABLE IF NOT EXISTS respuestas_retroalimentacion (
  RetroID INT NOT NULL,
  -- 5 preguntas específicas para evaluar el servicio CCC
  Pregunta1_Atencion_Operador VARCHAR(1000) NOT NULL COMMENT 'Calificación atención del operador CCC (1-5)',
  Pregunta2_Tiempo_Respuesta VARCHAR(1000) NOT NULL COMMENT 'Evaluación tiempo de respuesta (1-5)', 
  Pregunta3_Solucion_Brindada VARCHAR(1000) NOT NULL COMMENT 'Si la solución resolvió la necesidad (1-5)',
  Pregunta4_Recomendacion VARCHAR(1000) NOT NULL COMMENT 'Si recomendaría el servicio (1-5)',
  Pregunta5_Comentarios VARCHAR(1000) COMMENT 'Comentarios adicionales del cliente',
  -- Metadatos de auditoría
  FechaRespuesta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  DireccionIP VARCHAR(45) COMMENT 'IP desde donde respondió',
  UserAgent VARCHAR(500) COMMENT 'Navegador usado',
  TiempoCompletado INT COMMENT 'Segundos que tardó en completar',
  PRIMARY KEY (RetroID),
  CONSTRAINT respuestas_retroalimentacion_ibfk_1 FOREIGN KEY (RetroID) REFERENCES retroalimentacion (RetroID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Tabla para análisis y métricas del módulo CCC
CREATE TABLE IF NOT EXISTS metricas_retroalimentacion (
  MetricaID INT NOT NULL AUTO_INCREMENT,
  Periodo DATE NOT NULL,
  TotalEncuestasGeneradas INT DEFAULT 0,
  TotalEncuestasContestadas INT DEFAULT 0,
  PromedioSatisfaccion DECIMAL(3,2) DEFAULT 0.00,
  PromedioAtencionOperador DECIMAL(3,2) DEFAULT 0.00,
  PromedioTiempoRespuesta DECIMAL(3,2) DEFAULT 0.00,
  PromedioSolucion DECIMAL(3,2) DEFAULT 0.00,
  PromedioRecomendacion DECIMAL(3,2) DEFAULT 0.00,
  TicketsConEncuesta INT DEFAULT 0,
  TicketsSinEncuesta INT DEFAULT 0,
  FechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (MetricaID),
  UNIQUE KEY uq_metrica_periodo (Periodo),
  KEY idx_metrica_fecha (FechaActualizacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Vista para reportes de satisfacción completos
CREATE OR REPLACE VIEW vista_satisfaccion_ccc AS
SELECT 
    r.RetroID,
    r.Cliente,
    t.Folio,
    t.Descripcion AS DescripcionTicket,
    t.Estado AS EstadoTicket,
    t.Responsable,
    r.FechaCreacion AS FechaGeneracionEncuesta,
    rr.FechaRespuesta,
    r.Estado AS EstadoEncuesta,
    CAST(rr.Pregunta1_Atencion_Operador AS SIGNED) AS CalificacionAtencion,
    CAST(rr.Pregunta2_Tiempo_Respuesta AS SIGNED) AS CalificacionTiempo,
    CAST(rr.Pregunta3_Solucion_Brindada AS SIGNED) AS CalificacionSolucion,
    CAST(rr.Pregunta4_Recomendacion AS SIGNED) AS CalificacionRecomendacion,
    rr.Pregunta5_Comentarios AS Comentarios,
    ROUND((
        CAST(rr.Pregunta1_Atencion_Operador AS SIGNED) + 
        CAST(rr.Pregunta2_Tiempo_Respuesta AS SIGNED) + 
        CAST(rr.Pregunta3_Solucion_Brindada AS SIGNED) + 
        CAST(rr.Pregunta4_Recomendacion AS SIGNED)
    ) / 4.0, 2) AS PromedioSatisfaccion,
    DATEDIFF(IFNULL(rr.FechaRespuesta, NOW()), r.FechaCreacion) AS DiasParaRespuesta,
    u.NombreCompleto AS OperadorGenerador
FROM retroalimentacion r
INNER JOIN tickets t ON r.TicketID = t.Id
LEFT JOIN respuestas_retroalimentacion rr ON r.RetroID = rr.RetroID
LEFT JOIN usuarios u ON r.UsuarioID = u.IdUsuario
ORDER BY r.FechaCreacion DESC;

-- Migración idempotente para instalaciones previas
ALTER TABLE retroalimentacion 
  ADD COLUMN IF NOT EXISTS TicketID INT NULL AFTER UsuarioID,
  ADD COLUMN IF NOT EXISTS FechaCreacion DATETIME NULL DEFAULT CURRENT_TIMESTAMP AFTER TicketID,
  ADD COLUMN IF NOT EXISTS Estado ENUM('Pendiente', 'Contestada', 'Expirada') DEFAULT 'Pendiente' AFTER FechaCreacion,
  ADD UNIQUE KEY IF NOT EXISTS uq_retro_ticket (TicketID),
  ADD KEY IF NOT EXISTS idx_retro_fecha (FechaCreacion),
  ADD KEY IF NOT EXISTS idx_retro_estado (Estado);

-- Agregar FK si no existe (TicketID)
SET @has_fk_retro_t := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'retroalimentacion_ibfk_2'
);
SET @sql_retro_t := IF(@has_fk_retro_t=0,
  'ALTER TABLE retroalimentacion ADD CONSTRAINT retroalimentacion_ibfk_2 FOREIGN KEY (TicketID) REFERENCES tickets (Id)',
  'SELECT 1');
PREPARE s2 FROM @sql_retro_t; EXECUTE s2; DEALLOCATE PREPARE s2;

-- Procedimiento para actualizar métricas diarias (ejecutar con CRON)
DELIMITER $$
CREATE OR REPLACE PROCEDURE ActualizarMetricasCCC(IN fecha_calculo DATE)
BEGIN
    DECLARE total_generadas INT DEFAULT 0;
    DECLARE total_contestadas INT DEFAULT 0;
    DECLARE promedio_satisfaccion DECIMAL(3,2) DEFAULT 0.00;
    DECLARE promedio_atencion DECIMAL(3,2) DEFAULT 0.00;
    DECLARE promedio_tiempo DECIMAL(3,2) DEFAULT 0.00;
    DECLARE promedio_solucion DECIMAL(3,2) DEFAULT 0.00;
    DECLARE promedio_recomendacion DECIMAL(3,2) DEFAULT 0.00;
    DECLARE tickets_con_encuesta INT DEFAULT 0;
    DECLARE tickets_sin_encuesta INT DEFAULT 0;
    
    -- Calcular métricas del día
    SELECT COUNT(*) INTO total_generadas
    FROM retroalimentacion 
    WHERE DATE(FechaCreacion) = fecha_calculo;
    
    SELECT COUNT(*) INTO total_contestadas
    FROM retroalimentacion r
    INNER JOIN respuestas_retroalimentacion rr ON r.RetroID = rr.RetroID
    WHERE DATE(rr.FechaRespuesta) = fecha_calculo;
    
    SELECT 
        AVG((CAST(Pregunta1_Atencion_Operador AS SIGNED) + 
             CAST(Pregunta2_Tiempo_Respuesta AS SIGNED) + 
             CAST(Pregunta3_Solucion_Brindada AS SIGNED) + 
             CAST(Pregunta4_Recomendacion AS SIGNED)) / 4.0),
        AVG(CAST(Pregunta1_Atencion_Operador AS SIGNED)),
        AVG(CAST(Pregunta2_Tiempo_Respuesta AS SIGNED)),
        AVG(CAST(Pregunta3_Solucion_Brindada AS SIGNED)),
        AVG(CAST(Pregunta4_Recomendacion AS SIGNED))
    INTO promedio_satisfaccion, promedio_atencion, promedio_tiempo, promedio_solucion, promedio_recomendacion
    FROM respuestas_retroalimentacion
    WHERE DATE(FechaRespuesta) = fecha_calculo;
    
    SELECT COUNT(DISTINCT r.TicketID) INTO tickets_con_encuesta
    FROM retroalimentacion r
    WHERE DATE(r.FechaCreacion) = fecha_calculo;
    
    SELECT COUNT(*) - tickets_con_encuesta INTO tickets_sin_encuesta
    FROM tickets 
    WHERE DATE(FechaRegistro) = fecha_calculo;
    
    -- Insertar o actualizar métricas
    INSERT INTO metricas_retroalimentacion 
    (Periodo, TotalEncuestasGeneradas, TotalEncuestasContestadas, 
     PromedioSatisfaccion, PromedioAtencionOperador, PromedioTiempoRespuesta,
     PromedioSolucion, PromedioRecomendacion, TicketsConEncuesta, TicketsSinEncuesta)
    VALUES 
    (fecha_calculo, total_generadas, total_contestadas, 
     IFNULL(promedio_satisfaccion, 0), IFNULL(promedio_atencion, 0), IFNULL(promedio_tiempo, 0),
     IFNULL(promedio_solucion, 0), IFNULL(promedio_recomendacion, 0), tickets_con_encuesta, tickets_sin_encuesta)
    ON DUPLICATE KEY UPDATE
        TotalEncuestasGeneradas = VALUES(TotalEncuestasGeneradas),
        TotalEncuestasContestadas = VALUES(TotalEncuestasContestadas),
        PromedioSatisfaccion = VALUES(PromedioSatisfaccion),
        PromedioAtencionOperador = VALUES(PromedioAtencionOperador),
        PromedioTiempoRespuesta = VALUES(PromedioTiempoRespuesta),
        PromedioSolucion = VALUES(PromedioSolucion),
        PromedioRecomendacion = VALUES(PromedioRecomendacion),
        TicketsConEncuesta = VALUES(TicketsConEncuesta),
        TicketsSinEncuesta = VALUES(TicketsSinEncuesta);
END$$
DELIMITER ;
  Periodo DATE NOT NULL,
  TotalEncuestasGeneradas INT DEFAULT 0,
  TotalEncuestasContestadas INT DEFAULT 0,
  PromedioSatisfaccion DECIMAL(3,2) DEFAULT 0.00,
  PromedioAtencionOperador DECIMAL(3,2) DEFAULT 0.00,
  PromedioTiempoRespuesta DECIMAL(3,2) DEFAULT 0.00,
  PromedioSolucion DECIMAL(3,2) DEFAULT 0.00,
  PromedioRecomendacion DECIMAL(3,2) DEFAULT 0.00,
  TicketsConEncuesta INT DEFAULT 0,
  TicketsSinEncuesta INT DEFAULT 0,
  FechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (MetricaID),
  UNIQUE KEY uq_metrica_periodo (Periodo),
  KEY idx_metrica_fecha (FechaActualizacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Vista para reportes de satisfacción completos
CREATE OR REPLACE VIEW vista_satisfaccion_ccc AS
SELECT 
    r.RetroID,
    r.Cliente,
    t.Folio,
    t.Descripcion AS DescripcionTicket,
    t.Estado AS EstadoTicket,
    t.Responsable,
    r.FechaCreacion AS FechaGeneracionEncuesta,
    rr.FechaRespuesta,
    r.Estado AS EstadoEncuesta,
    CAST(rr.Pregunta1_Atencion_Operador AS SIGNED) AS CalificacionAtencion,
    CAST(rr.Pregunta2_Tiempo_Respuesta AS SIGNED) AS CalificacionTiempo,
    CAST(rr.Pregunta3_Solucion_Brindada AS SIGNED) AS CalificacionSolucion,
    CAST(rr.Pregunta4_Recomendacion AS SIGNED) AS CalificacionRecomendacion,
    rr.Pregunta5_Comentarios AS Comentarios,
    ROUND((
        CAST(rr.Pregunta1_Atencion_Operador AS SIGNED) + 
        CAST(rr.Pregunta2_Tiempo_Respuesta AS SIGNED) + 
        CAST(rr.Pregunta3_Solucion_Brindada AS SIGNED) + 
        CAST(rr.Pregunta4_Recomendacion AS SIGNED)
    ) / 4.0, 2) AS PromedioSatisfaccion,
    DATEDIFF(IFNULL(rr.FechaRespuesta, NOW()), r.FechaCreacion) AS DiasParaRespuesta,
    u.NombreCompleto AS OperadorGenerador
FROM retroalimentacion r
INNER JOIN tickets t ON r.TicketID = t.Id
LEFT JOIN respuestas_retroalimentacion rr ON r.RetroID = rr.RetroID
LEFT JOIN usuarios u ON r.UsuarioID = u.IdUsuario
ORDER BY r.FechaCreacion DESC;

-- Migración idempotente para instalaciones previas
ALTER TABLE retroalimentacion 
  ADD COLUMN IF NOT EXISTS TicketID INT NULL AFTER UsuarioID,
  ADD COLUMN IF NOT EXISTS FechaCreacion DATETIME NULL DEFAULT CURRENT_TIMESTAMP AFTER TicketID,
  ADD KEY IF NOT EXISTS idx_retro_ticket (TicketID);

-- Agregar FK si no existe (TicketID)
SET @has_fk_retro_t := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'retroalimentacion_ibfk_2'
);
SET @sql_retro_t := IF(@has_fk_retro_t=0,
  'ALTER TABLE retroalimentacion ADD CONSTRAINT retroalimentacion_ibfk_2 FOREIGN KEY (TicketID) REFERENCES tickets (Id)',
  'SELECT 1');
PREPARE s2 FROM @sql_retro_t; EXECUTE s2; DEALLOCATE PREPARE s2;

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
