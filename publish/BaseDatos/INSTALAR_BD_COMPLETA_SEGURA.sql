-- ===============================================
-- INSTALAR_BD_COMPLETA_SEGURA.sql
-- Script de instalación SEGURO que preserva datos
-- Version: 2.0 (17 de octubre de 2025)
-- ===============================================

-- IMPORTANTE: Este script es IDEMPOTENTE y SEGURO
-- - NO elimina datos existentes
-- - Solo agrega tablas/columnas faltantes
-- - Preserva toda la información actual

-- 1) Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS swgroi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE swgroi_db;

-- -----------------------
-- VERIFICACIONES INICIALES
-- -----------------------

SELECT 'INICIANDO INSTALACIÓN SEGURA...' AS estado;
SELECT NOW() AS fecha_inicio;

-- Verificar BD existente
SELECT 
    'ESTADO INICIAL' AS paso,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()) AS tablas_existentes,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'tipo_asunto') AS tipo_asunto_existe;

-- -----------------------
-- TABLA USUARIOS
-- -----------------------

CREATE TABLE IF NOT EXISTS usuarios (
  IdUsuario INT NOT NULL AUTO_INCREMENT,
  NombreCompleto VARCHAR(100) NOT NULL,
  Usuario VARCHAR(50) NOT NULL,
  Contrasena VARCHAR(200) NOT NULL,
  Rol VARCHAR(50) NOT NULL,
  FechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (IdUsuario),
  UNIQUE KEY uq_usuarios_usuario (Usuario),
  KEY ix_usuarios_rol (Rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Usuario admin por defecto (solo si no existe)
INSERT IGNORE INTO usuarios (NombreCompleto, Usuario, Contrasena, Rol)
VALUES ('Administrador General', 'admin', 'admin123', 'Administrador');

-- -----------------------
-- TABLA TICKETS (CRÍTICA)
-- -----------------------

-- Crear tabla básica si no existe
CREATE TABLE IF NOT EXISTS tickets (
  Id INT NOT NULL AUTO_INCREMENT,
  Folio VARCHAR(20) NOT NULL,
  Descripcion VARCHAR(500) NOT NULL,
  Estado VARCHAR(50) NOT NULL,
  Responsable VARCHAR(100) NOT NULL,
  FechaRegistro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (Id),
  UNIQUE KEY uq_tickets_folio (Folio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- AGREGAR COLUMNA TIPO_ASUNTO SI NO EXISTE (CRÍTICO)
SET @columna_existe = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                       WHERE TABLE_SCHEMA = DATABASE() 
                       AND TABLE_NAME = 'tickets' 
                       AND COLUMN_NAME = 'tipo_asunto');

SET @sql_tipo_asunto = CASE 
    WHEN @columna_existe = 0 THEN 
        'ALTER TABLE tickets ADD COLUMN tipo_asunto VARCHAR(100) NOT NULL DEFAULT ''Mant. Correctivo Panel'' AFTER Folio'
    ELSE 
        'SELECT ''Columna tipo_asunto ya existe'' as resultado'
END;

PREPARE stmt FROM @sql_tipo_asunto;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar columnas adicionales si no existen
SET @sql_columnas = 'ALTER TABLE tickets ';
SET @alteraciones = '';

-- Verificar y agregar cada columna faltante
SET @tiene_tecnico = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'Tecnico');
IF @tiene_tecnico = 0 THEN
    SET @alteraciones = CONCAT(@alteraciones, 'ADD COLUMN Tecnico VARCHAR(100), ');
END IF;

SET @tiene_cuenta = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'Cuenta');
IF @tiene_cuenta = 0 THEN
    SET @alteraciones = CONCAT(@alteraciones, 'ADD COLUMN Cuenta VARCHAR(100), ');
END IF;

SET @tiene_razon = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'RazonSocial');
IF @tiene_razon = 0 THEN
    SET @alteraciones = CONCAT(@alteraciones, 'ADD COLUMN RazonSocial VARCHAR(150), ');
END IF;

SET @tiene_regional = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'Regional');
IF @tiene_regional = 0 THEN
    SET @alteraciones = CONCAT(@alteraciones, 'ADD COLUMN Regional VARCHAR(100), ');
END IF;

SET @tiene_domicilio = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'Domicilio');
IF @tiene_domicilio = 0 THEN
    SET @alteraciones = CONCAT(@alteraciones, 'ADD COLUMN Domicilio VARCHAR(300), ');
END IF;

SET @tiene_fecha_atencion = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'FechaAtencion');
IF @tiene_fecha_atencion = 0 THEN
    SET @alteraciones = CONCAT(@alteraciones, 'ADD COLUMN FechaAtencion DATE, ');
END IF;

SET @tiene_agente = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'AgenteResponsable');
IF @tiene_agente = 0 THEN
    SET @alteraciones = CONCAT(@alteraciones, 'ADD COLUMN AgenteResponsable VARCHAR(100), ');
END IF;

SET @tiene_fecha_act = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'FechaActualizacion');
IF @tiene_fecha_act = 0 THEN
    SET @alteraciones = CONCAT(@alteraciones, 'ADD COLUMN FechaActualizacion DATETIME, ');
END IF;

SET @tiene_fecha_asignada = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'FechaAsignada');
IF @tiene_fecha_asignada = 0 THEN
    SET @alteraciones = CONCAT(@alteraciones, 'ADD COLUMN FechaAsignada DATE, ');
END IF;

SET @tiene_hora_asignada = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'HoraAsignada');
IF @tiene_hora_asignada = 0 THEN
    SET @alteraciones = CONCAT(@alteraciones, 'ADD COLUMN HoraAsignada VARCHAR(10), ');
END IF;

SET @tiene_fecha_cierre = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'FechaCierre');
IF @tiene_fecha_cierre = 0 THEN
    SET @alteraciones = CONCAT(@alteraciones, 'ADD COLUMN FechaCierre DATETIME, ');
END IF;

SET @tiene_cotizacion = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'Cotizacion');
IF @tiene_cotizacion = 0 THEN
    SET @alteraciones = CONCAT(@alteraciones, 'ADD COLUMN Cotizacion VARCHAR(50), ');
END IF;

SET @tiene_comentario = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'Comentario');
IF @tiene_comentario = 0 THEN
    SET @alteraciones = CONCAT(@alteraciones, 'ADD COLUMN Comentario VARCHAR(1000), ');
END IF;

SET @tiene_comentarios_tecnico = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'ComentariosTecnico');
IF @tiene_comentarios_tecnico = 0 THEN
    SET @alteraciones = CONCAT(@alteraciones, 'ADD COLUMN ComentariosTecnico VARCHAR(1000), ');
END IF;

-- Ejecutar alteraciones si hay alguna
IF LENGTH(@alteraciones) > 0 THEN
    SET @alteraciones = LEFT(@alteraciones, LENGTH(@alteraciones) - 2); -- Quitar última coma
    SET @sql_final = CONCAT(@sql_columnas, @alteraciones);
    PREPARE stmt2 FROM @sql_final;
    EXECUTE stmt2;
    DEALLOCATE PREPARE stmt2;
    SELECT 'Columnas agregadas a tickets' AS resultado;
ELSE
    SELECT 'Todas las columnas ya existen en tickets' AS resultado;
END IF;

-- Agregar índices si no existen
CREATE INDEX IF NOT EXISTS ix_tickets_estado ON tickets (Estado);
CREATE INDEX IF NOT EXISTS ix_tickets_fecha ON tickets (FechaRegistro);
CREATE INDEX IF NOT EXISTS ix_tickets_tipo_asunto ON tickets (tipo_asunto);
CREATE INDEX IF NOT EXISTS ix_tickets_responsable ON tickets (Responsable);
CREATE INDEX IF NOT EXISTS ix_tickets_tecnico ON tickets (Tecnico);

-- -----------------------
-- TABLA AVISOS
-- -----------------------

CREATE TABLE IF NOT EXISTS avisos (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------
-- MÓDULO TÉCNICOS
-- -----------------------

CREATE TABLE IF NOT EXISTS tecnicos (
  IdTecnico INT NOT NULL AUTO_INCREMENT,
  Nombre VARCHAR(100) NOT NULL,
  Activo BOOLEAN DEFAULT TRUE,
  Especialidad VARCHAR(100),
  FechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (IdTecnico),
  KEY ix_tecnicos_activo (Activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS asignaciones (
  AsignacionID INT NOT NULL AUTO_INCREMENT,
  TicketID INT NOT NULL,
  TecnicoID INT NOT NULL,
  FechaServicio DATE NOT NULL,
  HoraServicio TIME,
  FechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  Estado ENUM('Programada', 'En_Proceso', 'Completada', 'Cancelada') DEFAULT 'Programada',
  PRIMARY KEY (AsignacionID),
  KEY ix_asignaciones_ticket (TicketID),
  KEY ix_asignaciones_tecnico (TecnicoID),
  KEY ix_asignaciones_fecha (FechaServicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------
-- MÓDULO COTIZACIONES Y VENTAS
-- -----------------------

CREATE TABLE IF NOT EXISTS estadoscotizacion (
  EstadoCotizacionID INT NOT NULL AUTO_INCREMENT,
  Nombre VARCHAR(50) NOT NULL,
  NombreNorm VARCHAR(50) GENERATED ALWAYS AS (UPPER(TRIM(Nombre))) STORED,
  Descripcion VARCHAR(200),
  Activo BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (EstadoCotizacionID),
  UNIQUE KEY uq_estadoscotizacion_n (NombreNorm),
  KEY ix_estadoscotizacion_activo (Activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Estados por defecto
INSERT IGNORE INTO estadoscotizacion (Nombre, Descripcion) VALUES
('ENVIADO', 'Cotización enviada al cliente'),
('DECLINADA', 'Cliente rechazó la cotización'),
('ALMACEN', 'En proceso de almacén'),
('OPERACIONES', 'En operaciones'),
('COBRANZA', 'En proceso de cobranza'),
('FACTURACION', 'En facturación'),
('FINALIZADO', 'Proceso completado');

CREATE TABLE IF NOT EXISTS cotizaciones (
  CotizacionID INT NOT NULL AUTO_INCREMENT,
  TicketID INT NOT NULL,
  EstadoCotizacionID INT NOT NULL,
  FechaEnvio DATE,
  Monto DECIMAL(12,2),
  Comentarios VARCHAR(1000),
  FechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (CotizacionID),
  KEY ix_cotizaciones_ticket (TicketID),
  KEY ix_cotizaciones_estado (EstadoCotizacionID),
  KEY ix_cotizaciones_fecha (FechaEnvio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS ordenesventa (
  OVSR3 VARCHAR(50) NOT NULL,
  CotizacionID INT,
  FechaVenta DATE,
  Comision DECIMAL(12,2),
  FechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (OVSR3),
  KEY ix_ordenesventa_cotizacion (CotizacionID),
  KEY ix_ordenesventa_fecha (FechaVenta)
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
  Monto DECIMAL(12,2),
  Iva DECIMAL(12,2),
  TotalConComision DECIMAL(12,2),
  StatusPago VARCHAR(100),
  FechaCancelacion DATETIME,
  MotivoCancelacion VARCHAR(250),
  UsuarioCancelacion VARCHAR(100),
  ConstanciaDe VARCHAR(100),
  ComentariosCotizacion VARCHAR(1000),
  EstadoOVSR3 VARCHAR(100),
  PRIMARY KEY (DetalleID),
  UNIQUE KEY uq_ventasdetalle_ovsr3 (OVSR3),
  KEY ix_ventasdetalle_cotizacion (CotizacionID),
  KEY ix_ventasdetalle_status (StatusPago),
  KEY ix_ventasdetalle_fecha (Fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------
-- MÓDULO DE RETROALIMENTACIÓN
-- -----------------------

CREATE TABLE IF NOT EXISTS retroalimentacion (
  RetroID INT NOT NULL AUTO_INCREMENT,
  Cliente VARCHAR(100) NOT NULL,
  EnlaceUnico VARCHAR(255) NOT NULL,
  UsuarioID INT,
  TicketID INT,
  FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  Estado ENUM('Pendiente', 'Contestada', 'Expirada') DEFAULT 'Pendiente',
  FechaExpiracion DATETIME,
  PRIMARY KEY (RetroID),
  UNIQUE KEY uq_retro_enlace (EnlaceUnico),
  UNIQUE KEY uq_retro_ticket (TicketID),
  KEY idx_retro_usuario (UsuarioID),
  KEY idx_retro_fecha (FechaCreacion),
  KEY idx_retro_estado (Estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS respuestas_retroalimentacion (
  RetroID INT NOT NULL,
  Pregunta1_Atencion_Operador VARCHAR(1000) NOT NULL,
  Pregunta2_Tiempo_Respuesta VARCHAR(1000) NOT NULL,
  Pregunta3_Solucion_Brindada VARCHAR(1000) NOT NULL,
  Pregunta4_Recomendacion VARCHAR(1000) NOT NULL,
  Pregunta5_Comentarios VARCHAR(1000),
  FechaRespuesta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  DireccionIP VARCHAR(45),
  UserAgent VARCHAR(500),
  TiempoCompletado INT,
  PRIMARY KEY (RetroID),
  KEY idx_rr_fecha (FechaRespuesta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

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

-- -----------------------
-- AUDITORÍA GENERAL
-- -----------------------

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
  INDEX ix_auditoria_endpoint (Endpoint), 
  INDEX ix_auditoria_entidad (Entidad), 
  INDEX ix_auditoria_accion (Accion), 
  INDEX ix_auditoria_fecha (Fecha),
  INDEX ix_auditoria_usuario (IdUsuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- -----------------------
-- AGREGAR CLAVES FORÁNEAS (SOLO SI NO EXISTEN)
-- -----------------------

-- Función para agregar FK solo si no existe
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS AgregarFKSiNoExiste(
    IN tabla VARCHAR(64),
    IN nombre_fk VARCHAR(64),
    IN definicion_fk TEXT
)
BEGIN
    DECLARE fk_existe INT DEFAULT 0;
    
    SELECT COUNT(*) INTO fk_existe 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
      AND TABLE_NAME = tabla 
      AND CONSTRAINT_NAME = nombre_fk;
    
    IF fk_existe = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', tabla, ' ADD CONSTRAINT ', nombre_fk, ' ', definicion_fk);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- Agregar FK principales
CALL AgregarFKSiNoExiste('asignaciones', 'asignaciones_ibfk_1', 'FOREIGN KEY (TicketID) REFERENCES tickets (Id) ON DELETE CASCADE');
CALL AgregarFKSiNoExiste('asignaciones', 'asignaciones_ibfk_2', 'FOREIGN KEY (TecnicoID) REFERENCES tecnicos (IdTecnico)');
CALL AgregarFKSiNoExiste('cotizaciones', 'cotizaciones_ibfk_1', 'FOREIGN KEY (TicketID) REFERENCES tickets (Id) ON DELETE CASCADE');
CALL AgregarFKSiNoExiste('cotizaciones', 'cotizaciones_ibfk_2', 'FOREIGN KEY (EstadoCotizacionID) REFERENCES estadoscotizacion (EstadoCotizacionID)');
CALL AgregarFKSiNoExiste('ordenesventa', 'ordenesventa_ibfk_1', 'FOREIGN KEY (CotizacionID) REFERENCES cotizaciones (CotizacionID) ON DELETE SET NULL');
CALL AgregarFKSiNoExiste('ventasdetalle', 'ventasdetalle_ibfk_1', 'FOREIGN KEY (CotizacionID) REFERENCES cotizaciones (CotizacionID) ON DELETE SET NULL');
CALL AgregarFKSiNoExiste('ventasdetalle', 'ventasdetalle_ibfk_2', 'FOREIGN KEY (OVSR3) REFERENCES ordenesventa (OVSR3) ON DELETE SET NULL');
CALL AgregarFKSiNoExiste('retroalimentacion', 'retroalimentacion_ibfk_1', 'FOREIGN KEY (UsuarioID) REFERENCES usuarios (IdUsuario)');
CALL AgregarFKSiNoExiste('retroalimentacion', 'retroalimentacion_ibfk_2', 'FOREIGN KEY (TicketID) REFERENCES tickets (Id) ON DELETE CASCADE');
CALL AgregarFKSiNoExiste('respuestas_retroalimentacion', 'respuestas_retroalimentacion_ibfk_1', 'FOREIGN KEY (RetroID) REFERENCES retroalimentacion (RetroID) ON DELETE CASCADE');
CALL AgregarFKSiNoExiste('auditoria', 'auditoria_ibfk_1', 'FOREIGN KEY (IdUsuario) REFERENCES usuarios (IdUsuario) ON DELETE SET NULL');

-- Limpiar procedimiento temporal
DROP PROCEDURE IF EXISTS AgregarFKSiNoExiste;

-- -----------------------
-- VERIFICACIONES FINALES
-- -----------------------

SELECT 'INSTALACIÓN COMPLETADA EXITOSAMENTE' AS estado;
SELECT NOW() AS fecha_fin;

-- Mostrar resumen final
SELECT 
    'RESUMEN FINAL' AS paso,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()) AS tablas_totales,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets') AS columnas_tickets,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tickets' AND COLUMN_NAME = 'tipo_asunto') AS tipo_asunto_ok,
    (SELECT COUNT(*) FROM usuarios) AS usuarios_registrados,
    (SELECT COUNT(*) FROM tickets) AS tickets_existentes,
    (SELECT COUNT(*) FROM avisos) AS avisos_existentes;

-- Verificar estructura de tickets
SELECT 'ESTRUCTURA FINAL DE TICKETS:' AS verificacion;
DESCRIBE tickets;

-- -----------------------
-- MENSAJE FINAL
-- -----------------------

/*
✅ INSTALACIÓN COMPLETADA EXITOSAMENTE

🔧 QUE SE HIZO:
- Se preservaron TODOS los datos existentes
- Se agregó la columna 'tipo_asunto' de forma segura
- Se crearon todas las tablas del sistema
- Se establecieron las claves foráneas
- Se agregaron índices para optimizar rendimiento

📊 PRÓXIMOS PASOS:
1. Verificar que la aplicación funciona correctamente
2. Ejecutar pruebas de funcionalidad
3. Revisar que todos los módulos cargan sin errores

🚀 SISTEMA LISTO PARA PRODUCCIÓN
*/