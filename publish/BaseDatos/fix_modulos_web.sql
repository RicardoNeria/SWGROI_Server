-- [DEPRECADO - usar BaseDatos/script_base_de_datos.sql]
-- SCRIPT DE VERIFICACIÓN Y CORRECCIÓN PARA MÓDULOS DOCUMENTOS Y RETROALIMENTACIÓN
-- Ejecutar este script en la base de datos web para asegurar compatibilidad

-- ========================
-- VERIFICACIÓN DE TABLAS
-- ========================

-- Verificar si las tablas principales existen
SELECT 'Verificando tablas necesarias...' AS Status;

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Tabla usuarios existe'
        ELSE '❌ Tabla usuarios NO existe'
    END AS VerificacionUsuarios
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'usuarios';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Tabla documentos existe'
        ELSE '❌ Tabla documentos NO existe'
    END AS VerificacionDocumentos
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'documentos';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Tabla categorias_documento existe'
        ELSE '❌ Tabla categorias_documento NO existe'
    END AS VerificacionCategorias
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'categorias_documento';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Tabla retroalimentacion existe'
        ELSE '❌ Tabla retroalimentacion NO existe'
    END AS VerificacionRetroalimentacion
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'retroalimentacion';

SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Tabla respuestas_retroalimentacion existe'
        ELSE '❌ Tabla respuestas_retroalimentacion NO existe'
    END AS VerificacionRespuestasRetro
FROM information_schema.tables 
WHERE table_schema = DATABASE() AND table_name = 'respuestas_retroalimentacion';

-- ========================
-- CORRECCIÓN RÁPIDA - CREAR TABLAS FALTANTES
-- ========================

-- Crear tabla categorias_documento si no existe
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
  KEY idx_categoria_padre (CategoriaPadre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla documentos si no existe
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
  KEY idx_documento_vigencia (FechaVigencia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla retroalimentacion si no existe
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
  KEY idx_retro_estado (Estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla respuestas_retroalimentacion si no existe
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================
-- DATOS INICIALES
-- ========================

-- Insertar categorías por defecto si no existen
INSERT IGNORE INTO categorias_documento (NombreCategoria, Descripcion, IconoCSS, Color) VALUES
('Manuales Operativos', 'Documentos de procedimientos y guías operativas', 'fas fa-book', '#10B981'),
('Políticas Institucionales', 'Normativas y políticas organizacionales', 'fas fa-gavel', '#EF4444'),
('Formatos y Plantillas', 'Formularios y documentos tipo para uso interno', 'fas fa-file-alt', '#8B5CF6'),
('Capacitación', 'Material de entrenamiento y desarrollo', 'fas fa-graduation-cap', '#F59E0B'),
('Documentación Técnica', 'Manuales técnicos y especificaciones', 'fas fa-cogs', '#06B6D4'),
('Archivo General', 'Documentos de archivo y respaldo', 'fas fa-archive', '#6B7280');

-- Crear usuario admin si no existe
INSERT IGNORE INTO usuarios (NombreCompleto, Usuario, Contrasena, Rol) 
VALUES ('Administrador General', 'admin', 'admin123', 'Administrador');

-- ========================
-- FOREIGN KEYS (Ejecutar solo si las tablas relacionadas existen)
-- ========================

-- Agregar FK para documentos si no existe
SET @fk_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                   WHERE CONSTRAINT_SCHEMA = DATABASE() 
                   AND TABLE_NAME = 'documentos' 
                   AND CONSTRAINT_NAME = 'documentos_ibfk_1');

SET @sql_fk1 := IF(@fk_exists = 0 AND 
                   (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios') > 0,
                   'ALTER TABLE documentos ADD CONSTRAINT documentos_ibfk_1 FOREIGN KEY (UsuarioID) REFERENCES usuarios (IdUsuario)',
                   'SELECT "FK documentos->usuarios ya existe o tabla usuarios no encontrada"');
PREPARE stmt_fk1 FROM @sql_fk1; EXECUTE stmt_fk1; DEALLOCATE PREPARE stmt_fk1;

-- Agregar FK para retroalimentacion si no existe  
SET @fk_exists2 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                    WHERE CONSTRAINT_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'retroalimentacion' 
                    AND CONSTRAINT_NAME = 'retroalimentacion_ibfk_1');

SET @sql_fk2 := IF(@fk_exists2 = 0 AND 
                   (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios') > 0,
                   'ALTER TABLE retroalimentacion ADD CONSTRAINT retroalimentacion_ibfk_1 FOREIGN KEY (UsuarioID) REFERENCES usuarios (IdUsuario)',
                   'SELECT "FK retroalimentacion->usuarios ya existe o tabla usuarios no encontrada"');
PREPARE stmt_fk2 FROM @sql_fk2; EXECUTE stmt_fk2; DEALLOCATE PREPARE stmt_fk2;

-- ========================
-- VERIFICACIÓN FINAL
-- ========================

SELECT 'Verificación final...' AS Status;

SELECT 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'documentos') AS TablaDocumentos,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'categorias_documento') AS TablaCategorias,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'retroalimentacion') AS TablaRetroalimentacion,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'respuestas_retroalimentacion') AS TablaRespuestas,
    (SELECT COUNT(*) FROM usuarios WHERE Usuario = 'admin') AS UsuarioAdmin,
    (SELECT COUNT(*) FROM categorias_documento) AS TotalCategorias;

SELECT '✅ Script de corrección completado' AS Resultado;