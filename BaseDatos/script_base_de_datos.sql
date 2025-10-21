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
  TipoAsunto VARCHAR(50) NOT NULL,
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
  EstadoOVSR3 VARCHAR(100),
  PRIMARY KEY (DetalleID),
  UNIQUE KEY uq_ventasdetalle_ovsr3 (OVSR3),
  KEY (CotizacionID),
  KEY ix_ventasdetalle_statuspago (StatusPago),
  CONSTRAINT ventasdetalle_ibfk_1 FOREIGN KEY (CotizacionID) REFERENCES cotizaciones (CotizacionID),
  CONSTRAINT ventasdetalle_ibfk_2 FOREIGN KEY (OVSR3) REFERENCES ordenesventa (OVSR3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ========================
-- MÓDULO DE GESTIÓN DOCUMENTAL
-- ========================

-- Tabla de categorías documentales para clasificación temática
CREATE TABLE IF NOT EXISTS categorias_documento (
  CategoriaID INT NOT NULL AUTO_INCREMENT,
  NombreCategoria VARCHAR(100) NOT NULL,
  Descripcion VARCHAR(300),
  CategoriaPadre INT NULL,
  IconoCSS VARCHAR(50) DEFAULT 'fas fa-folder',
  Color VARCHAR(7) DEFAULT '#3B82F6',
  FechaCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (CategoriaID),
  UNIQUE KEY uq_categoria_nombre (NombreCategoria),
  KEY idx_categoria_padre (CategoriaPadre),
  CONSTRAINT categorias_documento_ibfk_1 FOREIGN KEY (CategoriaPadre) REFERENCES categorias_documento (CategoriaID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Categorías jerárquicas para clasificación documental';

-- Tabla expandida de documentos con control de versiones y metadatos
CREATE TABLE IF NOT EXISTS documentos (
  DocumentoID INT NOT NULL AUTO_INCREMENT,
  NombreArchivo VARCHAR(255) NOT NULL,
  TituloDescriptivo VARCHAR(300) NOT NULL,
  Descripcion TEXT,
  TipoMIME VARCHAR(100) NOT NULL,
  TamanoBytes BIGINT NOT NULL DEFAULT 0,
  HashSHA256 VARCHAR(64) COMMENT 'Hash para verificación de integridad',
  RutaFisica VARCHAR(500) NOT NULL COMMENT 'Ruta en el sistema de archivos',
  CategoriaID INT,
  UsuarioID INT NOT NULL COMMENT 'Usuario que subió el documento',
  Version INT NOT NULL DEFAULT 1,
  DocumentoMaestro INT NULL COMMENT 'ID del documento original para versiones',
  EstadoDocumento ENUM('Vigente', 'Obsoleto', 'En_Revision', 'Borrador', 'Archivado') DEFAULT 'Vigente',
  EsPublico BOOLEAN DEFAULT FALSE COMMENT 'Documento accesible para consulta general',
  RequiereAprobacion BOOLEAN DEFAULT FALSE,
  FechaSubida TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FechaModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FechaVigencia DATE COMMENT 'Fecha hasta la que es válido el documento',
  Etiquetas TEXT COMMENT 'Etiquetas separadas por comas para búsqueda',
  NotasVersion TEXT COMMENT 'Descripción de cambios en esta versión',
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

-- Tabla de auditoría documental para trazabilidad
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

-- Tabla de permisos por documento para control de acceso granular
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
  CONSTRAINT permisos_documento_ibfk_3 FOREIGN KEY (AsignadoPor) REFERENCES usuarios (IdUsuario),
  CONSTRAINT chk_permiso_usuario_rol CHECK ((UsuarioID IS NOT NULL AND RolPermitido IS NULL) OR (UsuarioID IS NULL AND RolPermitido IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Control de acceso granular por documento';

-- Tabla de favoritos para marcadores personalizados de usuarios
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

-- Vista principal para consulta de documentos con metadatos completos
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

-- Procedimiento para búsqueda avanzada de documentos
DELIMITER $$
DROP PROCEDURE IF EXISTS BuscarDocumentos$$
CREATE PROCEDURE BuscarDocumentos(
    IN p_texto_busqueda VARCHAR(300),
    IN p_categoria_id INT,
    IN p_estado VARCHAR(20),
    IN p_usuario_id INT,
    IN p_es_publico BOOLEAN,
    IN p_fecha_desde DATE,
    IN p_fecha_hasta DATE,
    IN p_limite INT,
    IN p_offset INT
)
BEGIN
    DECLARE sql_query TEXT DEFAULT '';
    DECLARE sql_where TEXT DEFAULT ' WHERE d.EstadoDocumento != ''Eliminado'' ';
    DECLARE sql_params TEXT DEFAULT '';
    
    -- Construir consulta dinámica
    IF p_texto_busqueda IS NOT NULL AND p_texto_busqueda != '' THEN
        SET sql_where = CONCAT(sql_where, ' AND (MATCH(d.TituloDescriptivo, d.Descripcion, d.Etiquetas) AGAINST (''', p_texto_busqueda, ''' IN NATURAL LANGUAGE MODE) OR d.NombreArchivo LIKE ''%', p_texto_busqueda, '%'') ');
    END IF;
    
    IF p_categoria_id IS NOT NULL THEN
        SET sql_where = CONCAT(sql_where, ' AND d.CategoriaID = ', p_categoria_id, ' ');
    END IF;
    
    IF p_estado IS NOT NULL THEN
        SET sql_where = CONCAT(sql_where, ' AND d.EstadoDocumento = ''', p_estado, ''' ');
    END IF;
    
    IF p_usuario_id IS NOT NULL THEN
        SET sql_where = CONCAT(sql_where, ' AND d.UsuarioID = ', p_usuario_id, ' ');
    END IF;
    
    IF p_es_publico IS NOT NULL THEN
        SET sql_where = CONCAT(sql_where, ' AND d.EsPublico = ', p_es_publico, ' ');
    END IF;
    
    IF p_fecha_desde IS NOT NULL THEN
        SET sql_where = CONCAT(sql_where, ' AND d.FechaSubida >= ''', p_fecha_desde, ''' ');
    END IF;
    
    IF p_fecha_hasta IS NOT NULL THEN
        SET sql_where = CONCAT(sql_where, ' AND d.FechaSubida <= ''', p_fecha_hasta, ''' ');
    END IF;
    
    SET sql_query = CONCAT(
        'SELECT * FROM vista_documentos_completa d ',
        sql_where,
        ' ORDER BY d.FechaModificacion DESC '
    );
    
    IF p_limite IS NOT NULL THEN
        SET sql_query = CONCAT(sql_query, ' LIMIT ', p_limite);
        IF p_offset IS NOT NULL THEN
            SET sql_query = CONCAT(sql_query, ' OFFSET ', p_offset);
        END IF;
    END IF;
    
    SET @sql = sql_query;
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$

-- Procedimiento para crear nueva versión de documento
DROP PROCEDURE IF EXISTS CrearVersionDocumento$$
CREATE PROCEDURE CrearVersionDocumento(
    IN p_documento_maestro INT,
    IN p_nuevo_archivo VARCHAR(255),
    IN p_titulo VARCHAR(300),
    IN p_ruta_fisica VARCHAR(500),
    IN p_tamano BIGINT,
    IN p_hash VARCHAR(64),
    IN p_usuario_id INT,
    IN p_notas_version TEXT,
    OUT p_nuevo_documento_id INT
)
BEGIN
    DECLARE v_siguiente_version INT;
    DECLARE v_categoria_id INT;
    DECLARE v_mime_type VARCHAR(100);
    
    -- Obtener información del documento maestro
    SELECT MAX(Version) + 1, CategoriaID, TipoMIME
    INTO v_siguiente_version, v_categoria_id, v_mime_type
    FROM documentos 
    WHERE DocumentoMaestro = p_documento_maestro OR DocumentoID = p_documento_maestro;
    
    -- Insertar nueva versión
    INSERT INTO documentos (
        NombreArchivo, TituloDescriptivo, TipoMIME, TamanoBytes, 
        HashSHA256, RutaFisica, CategoriaID, UsuarioID, Version,
        DocumentoMaestro, EstadoDocumento, NotasVersion
    ) VALUES (
        p_nuevo_archivo, p_titulo, v_mime_type, p_tamano,
        p_hash, p_ruta_fisica, v_categoria_id, p_usuario_id, v_siguiente_version,
        p_documento_maestro, 'Vigente', p_notas_version
    );
    
    SET p_nuevo_documento_id = LAST_INSERT_ID();
    
    -- Marcar versiones anteriores como obsoletas
    UPDATE documentos 
    SET EstadoDocumento = 'Obsoleto' 
    WHERE (DocumentoMaestro = p_documento_maestro OR DocumentoID = p_documento_maestro) 
    AND DocumentoID != p_nuevo_documento_id;
    
    -- Auditoría
    INSERT INTO auditoria_documentos (DocumentoID, UsuarioID, Accion, DetalleAccion)
    VALUES (p_nuevo_documento_id, p_usuario_id, 'Subida', CONCAT('Nueva versión ', v_siguiente_version, ' del documento'));
END$$

-- Procedimiento para auditoría de acciones
DROP PROCEDURE IF EXISTS RegistrarAccionDocumento$$
CREATE PROCEDURE RegistrarAccionDocumento(
    IN p_documento_id INT,
    IN p_usuario_id INT,
    IN p_accion VARCHAR(20),
    IN p_detalle VARCHAR(500),
    IN p_ip VARCHAR(45),
    IN p_user_agent VARCHAR(300)
)
BEGIN
    INSERT INTO auditoria_documentos (
        DocumentoID, UsuarioID, Accion, DetalleAccion, DireccionIP, UserAgent
    ) VALUES (
        p_documento_id, p_usuario_id, p_accion, p_detalle, p_ip, p_user_agent
    );
END$$
DELIMITER ;

-- Datos iniciales para categorías
INSERT IGNORE INTO categorias_documento (NombreCategoria, Descripcion, IconoCSS, Color) VALUES
('Manuales Operativos', 'Documentos de procedimientos y guías operativas', 'fas fa-book', '#10B981'),
('Políticas Institucionales', 'Normativas y políticas organizacionales', 'fas fa-gavel', '#EF4444'),
('Formatos y Plantillas', 'Formularios y documentos tipo para uso interno', 'fas fa-file-alt', '#8B5CF6'),
('Capacitación', 'Material de entrenamiento y desarrollo', 'fas fa-graduation-cap', '#F59E0B'),
('Documentación Técnica', 'Manuales técnicos y especificaciones', 'fas fa-cogs', '#06B6D4'),
('Archivo General', 'Documentos de archivo y respaldo', 'fas fa-archive', '#6B7280');

-- Migración segura de datos existentes si los hay
UPDATE documentos SET 
    TituloDescriptivo = COALESCE(TituloDescriptivo, NombreArchivo),
    EstadoDocumento = COALESCE(EstadoDocumento, 'Vigente'),
    TamanoBytes = COALESCE(TamanoBytes, 0),
    RutaFisica = COALESCE(RutaFisica, CONCAT('uploads/', NombreArchivo))
WHERE TituloDescriptivo IS NULL OR EstadoDocumento IS NULL;

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

-- Vista de ventas expandida con estado de tickets
CREATE OR REPLACE VIEW vistareporteventas AS
SELECT 
  o.OVSR3,
  c.CotizacionID,
  c.Monto AS MontoCotizado,
  o.FechaVenta,
  o.Comision,
  vd.Fecha,
  COALESCE(ec.Nombre,'ENVIADO') AS Estado,
  vd.EstadoOVSR3,  -- Campo para estado específico OVSR3
  t.Estado AS EstadoTicket,  -- Estado del ticket asociado (ALMACÉN, CAPTURADO, etc.)
  t.Folio AS FolioTicket,    -- Folio del ticket para referencia
  vd.Cuenta,
  vd.RazonSocial,
  vd.Regional,
  vd.Domicilio,
  vd.Descripcion,
  vd.FechaAtencion,
  vd.AgenteResponsable,
  vd.Monto,
  vd.StatusPago,
  vd.ConstanciaDe,
  vd.ComentariosCotizacion,
  vd.FechaCancelacion,
  vd.MotivoCancelacion,
  vd.UsuarioCancelacion
FROM ordenesventa o
JOIN cotizaciones c            ON c.CotizacionID = o.CotizacionID
LEFT JOIN estadoscotizacion ec ON c.EstadoCotizacionID = ec.EstadoCotizacionID
JOIN ventasdetalle vd          ON vd.OVSR3 = o.OVSR3
LEFT JOIN tickets t            ON t.Id = c.TicketID;

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
  KEY idx_rr_fecha (FechaRespuesta),
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

-- (Se elimina bloque de migración malformado; las columnas e índices ya están definidas en CREATE TABLE y en migraciones idempotentes posteriores)

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
DROP PROCEDURE IF EXISTS ActualizarMetricasCCC$$
CREATE PROCEDURE ActualizarMetricasCCC(IN fecha_calculo DATE)
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

  -- Definir rangos de fecha [inicio, fin)
  SET @inicio := fecha_calculo;
  SET @fin := DATE_ADD(fecha_calculo, INTERVAL 1 DAY);

  -- Calcular métricas del día (usando rangos para usar índices)
  SELECT COUNT(*) INTO total_generadas
  FROM retroalimentacion 
  WHERE FechaCreacion >= @inicio AND FechaCreacion < @fin;

  SELECT COUNT(*) INTO total_contestadas
  FROM retroalimentacion r
  INNER JOIN respuestas_retroalimentacion rr ON r.RetroID = rr.RetroID
  WHERE rr.FechaRespuesta >= @inicio AND rr.FechaRespuesta < @fin;

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
  WHERE FechaRespuesta >= @inicio AND FechaRespuesta < @fin;

  SELECT COUNT(DISTINCT r.TicketID) INTO tickets_con_encuesta
  FROM retroalimentacion r
  WHERE r.FechaCreacion >= @inicio AND r.FechaCreacion < @fin;

  SELECT COUNT(*) - tickets_con_encuesta INTO tickets_sin_encuesta
  FROM tickets 
  WHERE FechaRegistro >= @inicio AND FechaRegistro < @fin;

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

-- ========================
-- MIGRACIÓN: Integración Estado de Tickets en Ventas
-- ========================

-- Actualizar vista para incluir estado de tickets (ejecutar si ya existe la BD)
-- Esta migración es segura y puede ejecutarse múltiples veces

-- Recrear la vista con la nueva estructura incluyendo EstadoTicket
CREATE OR REPLACE VIEW vistareporteventas AS
SELECT 
  o.OVSR3,
  c.CotizacionID,
  c.Monto AS MontoCotizado,
  o.FechaVenta,
  o.Comision,
  vd.Fecha,
  COALESCE(ec.Nombre,'ENVIADO') AS Estado,
  vd.EstadoOVSR3,  -- Campo para estado específico OVSR3
  t.Estado AS EstadoTicket,  -- Estado del ticket asociado (ALMACÉN, CAPTURADO, etc.)
  t.Folio AS FolioTicket,    -- Folio del ticket para referencia
  vd.Cuenta,
  vd.RazonSocial,
  vd.Regional,
  vd.Domicilio,
  vd.Descripcion,
  vd.FechaAtencion,
  vd.AgenteResponsable,
  vd.Monto,
  vd.StatusPago,
  vd.ConstanciaDe,
  vd.ComentariosCotizacion,
  vd.FechaCancelacion,
  vd.MotivoCancelacion,
  vd.UsuarioCancelacion
FROM ordenesventa o
JOIN cotizaciones c            ON c.CotizacionID = o.CotizacionID
LEFT JOIN estadoscotizacion ec ON c.EstadoCotizacionID = ec.EstadoCotizacionID
JOIN ventasdetalle vd          ON vd.OVSR3 = o.OVSR3
LEFT JOIN tickets t            ON t.Id = c.TicketID;
