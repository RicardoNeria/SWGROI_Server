-- ===============================================
-- SWGROI_DB_COMPLETO_UNIFICADO.sql
-- Esquema completo que integra TODA la funcionalidad del sistema
-- Incluye: tipo_asunto + todas las tablas del backend + nuevos módulos
-- Version: 2.0 (17 de octubre de 2025)
-- ===============================================

-- 1) Crear base de datos y usarla
CREATE DATABASE IF NOT EXISTS swgroi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE swgroi_db;

-- -----------------------
-- TABLAS PRINCIPALES CORE
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Usuarios del sistema con autenticación';

-- TABLA TICKETS - VERSIÓN COMPLETA CON TIPO_ASUNTO
CREATE TABLE IF NOT EXISTS tickets (
  Id INT NOT NULL AUTO_INCREMENT,
  Folio VARCHAR(20) NOT NULL,
  tipo_asunto VARCHAR(100) NOT NULL DEFAULT 'Mant. Correctivo Panel',
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
  FechaActualizacion DATETIME,
  FechaAsignada DATE,
  HoraAsignada VARCHAR(10),
  FechaCierre DATETIME,
  Cotizacion VARCHAR(50),
  Comentario VARCHAR(1000),
  ComentariosTecnico VARCHAR(1000),
  PRIMARY KEY (Id),
  UNIQUE KEY uq_tickets_folio (Folio),
  KEY ix_tickets_estado (Estado),
  KEY ix_tickets_fecha (FechaRegistro),
  KEY ix_tickets_tipo_asunto (tipo_asunto),
  KEY ix_tickets_responsable (Responsable),
  KEY ix_tickets_tecnico (Tecnico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Tickets principales del sistema con tipificación';

CREATE TABLE IF NOT EXISTS tecnicos (
  IdTecnico INT NOT NULL AUTO_INCREMENT,
  Nombre VARCHAR(100) NOT NULL,
  Activo BOOLEAN DEFAULT TRUE,
  Especialidad VARCHAR(100),
  FechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (IdTecnico),
  KEY ix_tecnicos_activo (Activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Catálogo de técnicos';

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
  KEY ix_asignaciones_fecha (FechaServicio),
  CONSTRAINT asignaciones_ibfk_1 FOREIGN KEY (TicketID) REFERENCES tickets (Id) ON DELETE CASCADE,
  CONSTRAINT asignaciones_ibfk_2 FOREIGN KEY (TecnicoID) REFERENCES tecnicos (IdTecnico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Asignaciones de técnicos a tickets';

-- -----------------------
-- MÓDULO DE COTIZACIONES Y VENTAS
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Estados de cotizaciones';

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
  KEY ix_cotizaciones_fecha (FechaEnvio),
  CONSTRAINT cotizaciones_ibfk_1 FOREIGN KEY (TicketID) REFERENCES tickets (Id) ON DELETE CASCADE,
  CONSTRAINT cotizaciones_ibfk_2 FOREIGN KEY (EstadoCotizacionID) REFERENCES estadoscotizacion (EstadoCotizacionID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Cotizaciones asociadas a tickets';

CREATE TABLE IF NOT EXISTS ordenesventa (
  OVSR3 VARCHAR(50) NOT NULL,
  CotizacionID INT,
  FechaVenta DATE,
  Comision DECIMAL(12,2),
  FechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (OVSR3),
  KEY ix_ordenesventa_cotizacion (CotizacionID),
  KEY ix_ordenesventa_fecha (FechaVenta),
  CONSTRAINT ordenesventa_ibfk_1 FOREIGN KEY (CotizacionID) REFERENCES cotizaciones (CotizacionID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Órdenes de venta';

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
  KEY ix_ventasdetalle_fecha (Fecha),
  CONSTRAINT ventasdetalle_ibfk_1 FOREIGN KEY (CotizacionID) REFERENCES cotizaciones (CotizacionID) ON DELETE SET NULL,
  CONSTRAINT ventasdetalle_ibfk_2 FOREIGN KEY (OVSR3) REFERENCES ordenesventa (OVSR3) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Detalle completo de ventas';

-- -----------------------
-- MÓDULO DE GESTIÓN DOCUMENTAL
-- -----------------------

CREATE TABLE IF NOT EXISTS categorias_documento (
  CategoriaID INT NOT NULL AUTO_INCREMENT,
  NombreCategoria VARCHAR(100) NOT NULL,
  Descripcion VARCHAR(300),
  CategoriaPadre INT NULL,
  IconoCSS VARCHAR(50) DEFAULT 'fas fa-folder',
  Color VARCHAR(7) DEFAULT '#3B82F6',
  Activo BOOLEAN DEFAULT TRUE,
  FechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (CategoriaID),
  UNIQUE KEY uq_categoria_nombre (NombreCategoria),
  KEY idx_categoria_padre (CategoriaPadre),
  KEY idx_categoria_activo (Activo),
  CONSTRAINT categorias_documento_ibfk_1 FOREIGN KEY (CategoriaPadre) REFERENCES categorias_documento (CategoriaID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Categorías jerárquicas para clasificación documental';

CREATE TABLE IF NOT EXISTS documentos (
  DocumentoID INT NOT NULL AUTO_INCREMENT,
  NombreArchivo VARCHAR(255) NOT NULL,
  TituloDescriptivo VARCHAR(300) NOT NULL,
  Descripcion TEXT,
  TipoMIME VARCHAR(100) NOT NULL,
  TamanoBytes BIGINT NOT NULL DEFAULT 0,
  HashSHA256 VARCHAR(64),
  RutaFisica VARCHAR(500) NOT NULL,
  CategoriaID INT,
  UsuarioID INT NOT NULL,
  Version INT NOT NULL DEFAULT 1,
  DocumentoMaestro INT NULL,
  EstadoDocumento ENUM('Vigente', 'Obsoleto', 'En_Revision', 'Borrador', 'Archivado') DEFAULT 'Vigente',
  EsPublico BOOLEAN DEFAULT FALSE,
  RequiereAprobacion BOOLEAN DEFAULT FALSE,
  FechaSubida TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FechaModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FechaVigencia DATE,
  Etiquetas TEXT,
  NotasVersion TEXT,
  PRIMARY KEY (DocumentoID),
  KEY idx_documento_categoria (CategoriaID),
  KEY idx_documento_usuario (UsuarioID),
  KEY idx_documento_maestro (DocumentoMaestro),
  KEY idx_documento_estado (EstadoDocumento),
  KEY idx_documento_fecha (FechaSubida),
  KEY idx_documento_vigencia (FechaVigencia),
  FULLTEXT KEY ft_documento_busqueda (TituloDescriptivo, Descripcion, Etiquetas),
  CONSTRAINT documentos_ibfk_1 FOREIGN KEY (UsuarioID) REFERENCES usuarios (IdUsuario),
  CONSTRAINT documentos_ibfk_2 FOREIGN KEY (CategoriaID) REFERENCES categorias_documento (CategoriaID) ON DELETE SET NULL,
  CONSTRAINT documentos_ibfk_3 FOREIGN KEY (DocumentoMaestro) REFERENCES documentos (DocumentoID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Gestión centralizada de documentos con versionado';

CREATE TABLE IF NOT EXISTS auditoria_documentos (
  AuditoriaID BIGINT NOT NULL AUTO_INCREMENT,
  DocumentoID INT NOT NULL,
  UsuarioID INT NOT NULL,
  Accion ENUM('Subida', 'Descarga', 'Visualizacion', 'Edicion', 'Eliminacion', 'Cambio_Estado', 'Aprobacion') NOT NULL,
  DetalleAccion VARCHAR(500),
  DireccionIP VARCHAR(45),
  UserAgent VARCHAR(300),
  FechaAccion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (AuditoriaID),
  KEY idx_auditoria_documento (DocumentoID),
  KEY idx_auditoria_usuario (UsuarioID),
  KEY idx_auditoria_accion (Accion),
  KEY idx_auditoria_fecha (FechaAccion),
  CONSTRAINT auditoria_documentos_ibfk_1 FOREIGN KEY (DocumentoID) REFERENCES documentos (DocumentoID) ON DELETE CASCADE,
  CONSTRAINT auditoria_documentos_ibfk_2 FOREIGN KEY (UsuarioID) REFERENCES usuarios (IdUsuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Auditoría completa de interacciones con documentos';

CREATE TABLE IF NOT EXISTS permisos_documento (
  PermisoID INT NOT NULL AUTO_INCREMENT,
  DocumentoID INT NOT NULL,
  UsuarioID INT NULL,
  RolPermitido VARCHAR(50) NULL,
  TipoPermiso ENUM('Lectura', 'Descarga', 'Edicion', 'Eliminacion', 'Administracion') NOT NULL,
  FechaAsignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  AsignadoPor INT NOT NULL,
  PRIMARY KEY (PermisoID),
  KEY idx_permiso_documento (DocumentoID),
  KEY idx_permiso_usuario (UsuarioID),
  KEY idx_permiso_tipo (TipoPermiso),
  CONSTRAINT permisos_documento_ibfk_1 FOREIGN KEY (DocumentoID) REFERENCES documentos (DocumentoID) ON DELETE CASCADE,
  CONSTRAINT permisos_documento_ibfk_2 FOREIGN KEY (UsuarioID) REFERENCES usuarios (IdUsuario) ON DELETE CASCADE,
  CONSTRAINT permisos_documento_ibfk_3 FOREIGN KEY (AsignadoPor) REFERENCES usuarios (IdUsuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Control de acceso granular por documento';

CREATE TABLE IF NOT EXISTS favoritos_documento (
  FavoritoID INT NOT NULL AUTO_INCREMENT,
  DocumentoID INT NOT NULL,
  UsuarioID INT NOT NULL,
  FechaAgregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (FavoritoID),
  UNIQUE KEY uq_favorito_usuario_doc (UsuarioID, DocumentoID),
  KEY idx_favorito_documento (DocumentoID),
  CONSTRAINT favoritos_documento_ibfk_1 FOREIGN KEY (DocumentoID) REFERENCES documentos (DocumentoID) ON DELETE CASCADE,
  CONSTRAINT favoritos_documento_ibfk_2 FOREIGN KEY (UsuarioID) REFERENCES usuarios (IdUsuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Documentos marcados como favoritos por usuarios';

-- -----------------------
-- TABLA DE AVISOS (MENSAJES / COMUNICADOS)
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Mensajes y comunicados del sistema';

-- -----------------------
-- MÓDULO CCC - RETROALIMENTACIÓN
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
  KEY idx_retro_estado (Estado),
  CONSTRAINT retroalimentacion_ibfk_1 FOREIGN KEY (UsuarioID) REFERENCES usuarios (IdUsuario),
  CONSTRAINT retroalimentacion_ibfk_2 FOREIGN KEY (TicketID) REFERENCES tickets (Id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Enlaces de retroalimentación de clientes';

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
  KEY idx_rr_fecha (FechaRespuesta),
  CONSTRAINT respuestas_retroalimentacion_ibfk_1 FOREIGN KEY (RetroID) REFERENCES retroalimentacion (RetroID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Respuestas de encuestas de satisfacción';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Métricas consolidadas de retroalimentación';

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
  INDEX ix_auditoria_usuario (IdUsuario),
  CONSTRAINT auditoria_ibfk_1 FOREIGN KEY (IdUsuario) REFERENCES usuarios (IdUsuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Auditoría general del sistema';

-- -----------------------
-- VISTAS ÚTILES
-- -----------------------

-- Vista central de documentos
CREATE OR REPLACE VIEW vista_documentos_completa AS
SELECT 
    d.DocumentoID,
    d.TituloDescriptivo,
    d.NombreArchivo,
    d.Descripcion,
    d.TipoMIME,
    ROUND(d.TamanoBytes / 1024.0, 2) AS TamanoKB,
    c.NombreCategoria AS Categoria,
    c.IconoCSS,
    c.Color AS ColorCategoria,
    u.NombreCompleto AS SubidoPor,
    d.Version,
    dm.TituloDescriptivo AS DocumentoMaestroTitulo,
    d.EstadoDocumento,
    d.EsPublico,
    d.FechaSubida,
    d.FechaModificacion,
    d.FechaVigencia,
    d.Etiquetas,
    d.NotasVersion,
    (SELECT COUNT(*) FROM auditoria_documentos ad WHERE ad.DocumentoID = d.DocumentoID AND ad.Accion = 'Descarga') AS TotalDescargas,
    (SELECT COUNT(*) FROM favoritos_documento fd WHERE fd.DocumentoID = d.DocumentoID) AS TotalFavoritos,
    CASE 
        WHEN d.FechaVigencia IS NULL THEN 'Permanente'
        WHEN d.FechaVigencia < CURDATE() THEN 'Vencido'
        WHEN d.FechaVigencia <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Próximo_a_vencer'
        ELSE 'Vigente'
    END AS EstadoVigencia
FROM documentos d
LEFT JOIN categorias_documento c ON d.CategoriaID = c.CategoriaID
LEFT JOIN usuarios u ON d.UsuarioID = u.IdUsuario
LEFT JOIN documentos dm ON d.DocumentoMaestro = dm.DocumentoID
ORDER BY d.FechaModificacion DESC;

-- Vista resumen de tickets
CREATE OR REPLACE VIEW vista_tickets_resumen AS
SELECT 
    t.Id,
    t.Folio,
    t.tipo_asunto,
    t.Descripcion,
    t.Estado,
    t.Responsable,
    t.Tecnico,
    t.FechaRegistro,
    t.FechaActualizacion,
    c.CotizacionID,
    c.Monto AS MontoCotizacion,
    ec.Nombre AS EstadoCotizacion,
    CASE 
        WHEN t.Estado = 'Cerrado' THEN 'Completado'
        WHEN c.CotizacionID IS NOT NULL THEN 'Con_Cotizacion'
        WHEN t.Tecnico IS NOT NULL THEN 'Asignado'
        ELSE 'Pendiente'
    END AS EstadoCompleto
FROM tickets t
LEFT JOIN cotizaciones c ON t.Id = c.TicketID
LEFT JOIN estadoscotizacion ec ON c.EstadoCotizacionID = ec.EstadoCotizacionID
ORDER BY t.FechaRegistro DESC;

-- -----------------------
-- DATOS INICIALES (idempotentes)
-- -----------------------

INSERT IGNORE INTO estadoscotizacion (Nombre, Descripcion) VALUES
('ENVIADO', 'Cotización enviada al cliente'),
('DECLINADA', 'Cliente rechazó la cotización'),
('ALMACEN', 'En proceso de almacén'),
('OPERACIONES', 'En operaciones'),
('COBRANZA', 'En proceso de cobranza'),
('FACTURACION', 'En facturación'),
('FINALIZADO', 'Proceso completado');

INSERT IGNORE INTO usuarios (NombreCompleto, Usuario, Contrasena, Rol)
VALUES ('Administrador General', 'admin', 'admin123', 'Administrador');

INSERT IGNORE INTO categorias_documento (NombreCategoria, Descripcion, IconoCSS, Color) VALUES
('Manuales Operativos', 'Documentos de procedimientos y guías operativas', 'fas fa-book', '#10B981'),
('Políticas Institucionales', 'Normativas y políticas organizacionales', 'fas fa-gavel', '#EF4444'),
('Formatos y Plantillas', 'Formularios y documentos tipo para uso interno', 'fas fa-file-alt', '#8B5CF6'),
('Capacitación', 'Material de entrenamiento y desarrollo', 'fas fa-graduation-cap', '#F59E0B'),
('Documentación Técnica', 'Manuales técnicos y especificaciones', 'fas fa-cogs', '#06B6D4'),
('Archivo General', 'Documentos de archivo y respaldo', 'fas fa-archive', '#6B7280');

-- -----------------------
-- VERIFICACIONES FINALES
-- -----------------------

-- Mostrar resumen de tablas creadas
SELECT 
    'TABLAS CREADAS' AS tipo,
    COUNT(*) AS cantidad
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE();

-- Verificar tabla tickets con tipo_asunto
SELECT 
    'COLUMNA TIPO_ASUNTO' AS verificacion,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'ERROR' END AS estado
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'tickets' 
  AND COLUMN_NAME = 'tipo_asunto';

-- Mostrar estructura de tickets
DESCRIBE tickets;

-- -----------------------
-- NOTAS FINALES
-- -----------------------

/*
ESQUEMA COMPLETO Y UNIFICADO - VERSION 2.0

✅ INCLUYE:
- Columna tipo_asunto en tickets (CRÍTICA)
- Todas las tablas usadas por controladores
- Módulos de documentos, retroalimentación, auditoría
- Índices optimizados para rendimiento
- Claves foráneas con integridad referencial
- Vistas útiles para consultas complejas

🔧 PARA APLICAR:
1. Respaldar BD actual: mysqldump -u root -p swgroi_db > backup_$(date +%Y%m%d).sql
2. Ejecutar: mysql -u root -p < SWGROI_DB_COMPLETO_UNIFICADO.sql
3. Verificar: SELECT COUNT(*) FROM tickets; DESCRIBE tickets;

📋 COMPATIBLE CON:
- TicketsController.cs (tipo_asunto)
- TecnicosController.cs (tickets + tipo_asunto)
- VentasController.cs (cotizaciones, ventasdetalle)
- DocumentosController.cs (categorias, documentos)
- RetroalimentacionController.cs (retroalimentacion)
- AuditoriaController.cs (auditoria)

✨ NUEVAS FUNCIONALIDADES:
- Gestión documental completa
- Sistema de retroalimentación CCC
- Auditoría detallada
- Métricas y reportes avanzados

🚀 LISTO PARA PRODUCCIÓN
*/