-- ===============================================
-- SWGROI - BASE DE DATOS COMPLETA UNIFICADA
-- Script consolidado con nomenclatura en español
-- Versión: 2.0 (2025-01-16)
-- ===============================================
-- Este archivo incluye TODO: tablas, vistas, procedimientos e inserciones iniciales
-- Ejecutar en MySQL 8.0+ con soporte de DELIMITER

-- 1) CREAR BASE DE DATOS
CREATE DATABASE IF NOT EXISTS swgroi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE swgroi_db;

-- ===============================================
-- TABLAS PRINCIPALES
-- ===============================================

-- Tabla: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT NOT NULL AUTO_INCREMENT,
  nombre_completo VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) NOT NULL,
  contrasena VARCHAR(200) NOT NULL,
  rol VARCHAR(50) NOT NULL,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuarios_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Usuarios del sistema';

-- Tabla: tickets
CREATE TABLE IF NOT EXISTS tickets (
  id INT NOT NULL AUTO_INCREMENT,
  folio VARCHAR(20) NOT NULL,
  descripcion VARCHAR(500) NOT NULL,
  estado VARCHAR(50) NOT NULL,
  responsable VARCHAR(100) NOT NULL,
  tecnico VARCHAR(100),
  cuenta VARCHAR(100),
  razon_social VARCHAR(150),
  regional VARCHAR(100),
  domicilio VARCHAR(300),
  fecha_atencion DATE,
  agente_responsable VARCHAR(100),
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME,
  fecha_asignada DATE,
  hora_asignada VARCHAR(10),
  fecha_cierre DATETIME,
  cotizacion VARCHAR(50),
  comentario VARCHAR(1000),
  comentarios_tecnico VARCHAR(1000),
  PRIMARY KEY (id),
  UNIQUE KEY uq_tickets_folio (folio),
  KEY ix_tickets_estado (estado),
  KEY ix_tickets_fecha (fecha_registro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Tickets de servicio técnico';

-- Tabla: tecnicos
CREATE TABLE IF NOT EXISTS tecnicos (
  id_tecnico INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  PRIMARY KEY (id_tecnico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Técnicos disponibles';

-- Tabla: asignaciones
CREATE TABLE IF NOT EXISTS asignaciones (
  id_asignacion INT NOT NULL AUTO_INCREMENT,
  id_ticket INT NOT NULL,
  id_tecnico INT NOT NULL,
  fecha_servicio DATE NOT NULL,
  hora_servicio TIME,
  PRIMARY KEY (id_asignacion),
  KEY (id_ticket),
  KEY (id_tecnico),
  CONSTRAINT fk_asignaciones_tickets FOREIGN KEY (id_ticket) REFERENCES tickets (id),
  CONSTRAINT fk_asignaciones_tecnicos FOREIGN KEY (id_tecnico) REFERENCES tecnicos (id_tecnico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Asignaciones de tickets a técnicos';

-- Tabla: estados_cotizacion
CREATE TABLE IF NOT EXISTS estados_cotizacion (
  id_estado_cotizacion INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  nombre_normalizado VARCHAR(50) GENERATED ALWAYS AS (UPPER(TRIM(nombre))) STORED,
  PRIMARY KEY (id_estado_cotizacion),
  UNIQUE KEY uq_estados_cotizacion_nombre (nombre_normalizado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Catálogo de estados para cotizaciones';

-- Tabla: cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
  id_cotizacion INT NOT NULL AUTO_INCREMENT,
  id_ticket INT NOT NULL,
  id_estado_cotizacion INT NOT NULL,
  fecha_envio DATE,
  monto DECIMAL(12,2),
  comentarios VARCHAR(1000),
  PRIMARY KEY (id_cotizacion),
  KEY (id_ticket),
  KEY (id_estado_cotizacion),
  CONSTRAINT fk_cotizaciones_tickets FOREIGN KEY (id_ticket) REFERENCES tickets (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Cotizaciones asociadas a tickets';

-- Tabla: ordenes_venta
CREATE TABLE IF NOT EXISTS ordenes_venta (
  ovsr3 VARCHAR(50) NOT NULL,
  id_cotizacion INT,
  fecha_venta DATE,
  comision DECIMAL(12,2),
  PRIMARY KEY (ovsr3),
  KEY (id_cotizacion),
  CONSTRAINT fk_ordenes_venta_cotizaciones FOREIGN KEY (id_cotizacion) REFERENCES cotizaciones (id_cotizacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Órdenes de venta';

-- Tabla: ventas_detalle
CREATE TABLE IF NOT EXISTS ventas_detalle (
  id_detalle INT NOT NULL AUTO_INCREMENT,
  id_cotizacion INT,
  ovsr3 VARCHAR(50),
  fecha DATE,
  cuenta VARCHAR(100),
  razon_social VARCHAR(150),
  regional VARCHAR(100),
  domicilio VARCHAR(300),
  descripcion VARCHAR(1000),
  comentarios VARCHAR(1000),
  fecha_atencion DATE,
  agente_responsable VARCHAR(100),
  monto DECIMAL(12,2),
  iva DECIMAL(12,2),
  total_con_comision DECIMAL(12,2),
  status_pago VARCHAR(100),
  fecha_cancelacion DATETIME,
  motivo_cancelacion VARCHAR(250),
  usuario_cancelacion VARCHAR(100),
  constancia_de VARCHAR(100),
  comentarios_cotizacion VARCHAR(1000),
  estado_ovsr3 VARCHAR(100),
  PRIMARY KEY (id_detalle),
  UNIQUE KEY uq_ventas_detalle_ovsr3 (ovsr3),
  KEY (id_cotizacion),
  KEY ix_ventas_detalle_status_pago (status_pago),
  CONSTRAINT fk_ventas_detalle_cotizaciones FOREIGN KEY (id_cotizacion) REFERENCES cotizaciones (id_cotizacion),
  CONSTRAINT fk_ventas_detalle_ordenes FOREIGN KEY (ovsr3) REFERENCES ordenes_venta (ovsr3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Detalles de ventas';

-- ===============================================
-- MÓDULO DE GESTIÓN DOCUMENTAL
-- ===============================================

-- Tabla: categorias_documento
CREATE TABLE IF NOT EXISTS categorias_documento (
  id_categoria INT NOT NULL AUTO_INCREMENT,
  nombre_categoria VARCHAR(100) NOT NULL,
  descripcion VARCHAR(300),
  id_categoria_padre INT NULL,
  icono_css VARCHAR(50) DEFAULT 'fas fa-folder',
  color VARCHAR(7) DEFAULT '#3B82F6',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_categoria),
  UNIQUE KEY uq_categoria_nombre (nombre_categoria),
  KEY idx_categoria_padre (id_categoria_padre),
  CONSTRAINT fk_categorias_documento_padre FOREIGN KEY (id_categoria_padre) REFERENCES categorias_documento (id_categoria) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Categorías jerárquicas para documentos';

-- Tabla: documentos
CREATE TABLE IF NOT EXISTS documentos (
  id_documento INT NOT NULL AUTO_INCREMENT,
  nombre_archivo VARCHAR(255) NOT NULL,
  titulo_descriptivo VARCHAR(300) NOT NULL,
  descripcion TEXT,
  tipo_mime VARCHAR(100) NOT NULL,
  tamano_bytes BIGINT NOT NULL DEFAULT 0,
  hash_sha256 VARCHAR(64),
  ruta_fisica VARCHAR(500) NOT NULL,
  id_categoria INT,
  id_usuario INT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  id_documento_maestro INT NULL,
  estado_documento ENUM('Vigente', 'Obsoleto', 'En_Revision', 'Borrador', 'Archivado') DEFAULT 'Vigente',
  es_publico BOOLEAN DEFAULT FALSE,
  requiere_aprobacion BOOLEAN DEFAULT FALSE,
  fecha_subida TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_modificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  fecha_vigencia DATE,
  etiquetas TEXT,
  notas_version TEXT,
  PRIMARY KEY (id_documento),
  KEY idx_documento_categoria (id_categoria),
  KEY idx_documento_usuario (id_usuario),
  KEY idx_documento_maestro (id_documento_maestro),
  KEY idx_documento_estado (estado_documento),
  KEY idx_documento_fecha (fecha_subida),
  KEY idx_documento_vigencia (fecha_vigencia),
  FULLTEXT KEY ft_documento_busqueda (titulo_descriptivo, descripcion, etiquetas),
  CONSTRAINT fk_documentos_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  CONSTRAINT fk_documentos_categorias FOREIGN KEY (id_categoria) REFERENCES categorias_documento (id_categoria) ON DELETE SET NULL,
  CONSTRAINT fk_documentos_maestro FOREIGN KEY (id_documento_maestro) REFERENCES documentos (id_documento) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Gestión centralizada de documentos';

-- Tabla: auditoria_documentos
CREATE TABLE IF NOT EXISTS auditoria_documentos (
  id_auditoria BIGINT NOT NULL AUTO_INCREMENT,
  id_documento INT NOT NULL,
  id_usuario INT NOT NULL,
  accion ENUM('Subida', 'Descarga', 'Visualizacion', 'Edicion', 'Eliminacion', 'Cambio_Estado', 'Aprobacion') NOT NULL,
  detalle_accion VARCHAR(500),
  direccion_ip VARCHAR(45),
  user_agent VARCHAR(300),
  fecha_accion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_auditoria),
  KEY idx_auditoria_documento (id_documento),
  KEY idx_auditoria_usuario (id_usuario),
  KEY idx_auditoria_accion (accion),
  KEY idx_auditoria_fecha (fecha_accion),
  CONSTRAINT fk_auditoria_documentos_documentos FOREIGN KEY (id_documento) REFERENCES documentos (id_documento) ON DELETE CASCADE,
  CONSTRAINT fk_auditoria_documentos_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Auditoría de documentos';

-- Tabla: permisos_documento
CREATE TABLE IF NOT EXISTS permisos_documento (
  id_permiso INT NOT NULL AUTO_INCREMENT,
  id_documento INT NOT NULL,
  id_usuario INT NULL,
  rol_permitido VARCHAR(50) NULL,
  tipo_permiso ENUM('Lectura', 'Descarga', 'Edicion', 'Eliminacion', 'Administracion') NOT NULL,
  fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  asignado_por INT NOT NULL,
  PRIMARY KEY (id_permiso),
  KEY idx_permiso_documento (id_documento),
  KEY idx_permiso_usuario (id_usuario),
  KEY idx_permiso_tipo (tipo_permiso),
  CONSTRAINT fk_permisos_documento_documentos FOREIGN KEY (id_documento) REFERENCES documentos (id_documento) ON DELETE CASCADE,
  CONSTRAINT fk_permisos_documento_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_permisos_documento_asignador FOREIGN KEY (asignado_por) REFERENCES usuarios (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Control de acceso a documentos';

-- Tabla: favoritos_documento
CREATE TABLE IF NOT EXISTS favoritos_documento (
  id_favorito INT NOT NULL AUTO_INCREMENT,
  id_documento INT NOT NULL,
  id_usuario INT NOT NULL,
  fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_favorito),
  UNIQUE KEY uq_favorito_usuario_doc (id_usuario, id_documento),
  KEY idx_favorito_documento (id_documento),
  CONSTRAINT fk_favoritos_documento_documentos FOREIGN KEY (id_documento) REFERENCES documentos (id_documento) ON DELETE CASCADE,
  CONSTRAINT fk_favoritos_documento_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Documentos favoritos de usuarios';

-- ===============================================
-- MÓDULO DE AVISOS Y COMUNICADOS
-- ===============================================

-- Tabla: avisos
CREATE TABLE IF NOT EXISTS avisos (
  id INT NOT NULL AUTO_INCREMENT,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  asunto VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME,
  PRIMARY KEY (id),
  KEY ix_avisos_fecha (fecha),
  KEY ix_avisos_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Mensajes y comunicados del sistema';

-- ===============================================
-- MÓDULO CCC - RETROALIMENTACIÓN
-- ===============================================

-- Tabla: retroalimentacion
CREATE TABLE IF NOT EXISTS retroalimentacion (
  id_retro INT NOT NULL AUTO_INCREMENT,
  cliente VARCHAR(100) NOT NULL,
  enlace_unico VARCHAR(255) NOT NULL,
  id_usuario INT,
  id_ticket INT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('Pendiente', 'Contestada', 'Expirada') DEFAULT 'Pendiente',
  PRIMARY KEY (id_retro),
  UNIQUE KEY uq_retro_enlace (enlace_unico),
  UNIQUE KEY uq_retro_ticket (id_ticket),
  KEY idx_retro_usuario (id_usuario),
  KEY idx_retro_fecha (fecha_creacion),
  KEY idx_retro_estado (estado),
  CONSTRAINT fk_retroalimentacion_usuarios FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
  CONSTRAINT fk_retroalimentacion_tickets FOREIGN KEY (id_ticket) REFERENCES tickets (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Encuestas de satisfacción CCC';

-- Tabla: respuestas_retroalimentacion
CREATE TABLE IF NOT EXISTS respuestas_retroalimentacion (
  id_retro INT NOT NULL,
  pregunta1_atencion_operador VARCHAR(1000) NOT NULL,
  pregunta2_tiempo_respuesta VARCHAR(1000) NOT NULL,
  pregunta3_solucion_brindada VARCHAR(1000) NOT NULL,
  pregunta4_recomendacion VARCHAR(1000) NOT NULL,
  pregunta5_comentarios VARCHAR(1000),
  fecha_respuesta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  direccion_ip VARCHAR(45),
  user_agent VARCHAR(500),
  tiempo_completado INT,
  PRIMARY KEY (id_retro),
  KEY idx_rr_fecha (fecha_respuesta),
  CONSTRAINT fk_respuestas_retro_retroalimentacion FOREIGN KEY (id_retro) REFERENCES retroalimentacion (id_retro) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Respuestas de encuestas';

-- Tabla: metricas_retroalimentacion
CREATE TABLE IF NOT EXISTS metricas_retroalimentacion (
  id_metrica INT NOT NULL AUTO_INCREMENT,
  periodo DATE NOT NULL,
  total_encuestas_generadas INT DEFAULT 0,
  total_encuestas_contestadas INT DEFAULT 0,
  promedio_satisfaccion DECIMAL(3,2) DEFAULT 0.00,
  promedio_atencion_operador DECIMAL(3,2) DEFAULT 0.00,
  promedio_tiempo_respuesta DECIMAL(3,2) DEFAULT 0.00,
  promedio_solucion DECIMAL(3,2) DEFAULT 0.00,
  promedio_recomendacion DECIMAL(3,2) DEFAULT 0.00,
  tickets_con_encuesta INT DEFAULT 0,
  tickets_sin_encuesta INT DEFAULT 0,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_metrica),
  UNIQUE KEY uq_metrica_periodo (periodo),
  KEY idx_metrica_fecha (fecha_actualizacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Métricas agregadas de retroalimentación';

-- ===============================================
-- AUDITORÍA GENERAL
-- ===============================================

-- Tabla: auditoria
CREATE TABLE IF NOT EXISTS auditoria (
  id_audit BIGINT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NULL,
  metodo VARCHAR(10) NOT NULL,
  endpoint VARCHAR(200) NOT NULL,
  entidad VARCHAR(100) NULL,
  accion VARCHAR(50) NOT NULL,
  clave_entidad VARCHAR(100) NULL,
  ip_cliente VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  resultado VARCHAR(20) NOT NULL,
  mensaje TEXT NULL,
  fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (endpoint), INDEX (entidad), INDEX (accion), INDEX (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Auditoría general del sistema';

-- ===============================================
-- VISTAS
-- ===============================================

-- Vista: documentos completos
CREATE OR REPLACE VIEW vista_documentos_completa AS
SELECT 
    d.id_documento,
    d.titulo_descriptivo,
    d.nombre_archivo,
    d.descripcion,
    d.tipo_mime,
    ROUND(d.tamano_bytes / 1024.0, 2) AS tamano_kb,
    c.nombre_categoria AS categoria,
    c.icono_css,
    c.color AS color_categoria,
    u.nombre_completo AS subido_por,
    d.version,
    dm.titulo_descriptivo AS documento_maestro_titulo,
    d.estado_documento,
    d.es_publico,
    d.fecha_subida,
    d.fecha_modificacion,
    d.fecha_vigencia,
    d.etiquetas,
    d.notas_version,
    (SELECT COUNT(*) FROM auditoria_documentos ad WHERE ad.id_documento = d.id_documento AND ad.accion = 'Descarga') AS total_descargas,
    (SELECT COUNT(*) FROM favoritos_documento fd WHERE fd.id_documento = d.id_documento) AS total_favoritos,
    CASE 
        WHEN d.fecha_vigencia IS NULL THEN 'Permanente'
        WHEN d.fecha_vigencia < CURDATE() THEN 'Vencido'
        WHEN d.fecha_vigencia <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'Próximo_a_vencer'
        ELSE 'Vigente'
    END AS estado_vigencia
FROM documentos d
LEFT JOIN categorias_documento c ON d.id_categoria = c.id_categoria
LEFT JOIN usuarios u ON d.id_usuario = u.id_usuario
LEFT JOIN documentos dm ON d.id_documento_maestro = dm.id_documento
ORDER BY d.fecha_modificacion DESC;

-- ===============================================
-- PROCEDIMIENTOS ALMACENADOS
-- ===============================================

DELIMITER $$

-- Procedimiento: buscar_documentos
CREATE PROCEDURE IF NOT EXISTS buscar_documentos(
    IN p_termino VARCHAR(255),
    IN p_id_categoria INT,
    IN p_estado VARCHAR(20),
    IN p_id_usuario INT,
    IN p_limite INT,
    IN p_offset INT
)
BEGIN
    DECLARE consulta TEXT;
    SET @consulta = 'SELECT * FROM vista_documentos_completa WHERE 1=1';
    
    IF p_termino IS NOT NULL AND p_termino != '' THEN
        SET @consulta = CONCAT(@consulta, ' AND (titulo_descriptivo LIKE "%', p_termino, '%" OR descripcion LIKE "%', p_termino, '%")');
    END IF;
    
    IF p_id_categoria IS NOT NULL THEN
        SET @consulta = CONCAT(@consulta, ' AND id_categoria = ', p_id_categoria);
    END IF;
    
    IF p_estado IS NOT NULL AND p_estado != '' THEN
        SET @consulta = CONCAT(@consulta, ' AND estado_documento = "', p_estado, '"');
    END IF;
    
    SET @consulta = CONCAT(@consulta, ' ORDER BY fecha_modificacion DESC');
    
    IF p_limite IS NOT NULL AND p_limite > 0 THEN
        SET @consulta = CONCAT(@consulta, ' LIMIT ', p_limite);
    END IF;
    
    IF p_offset IS NOT NULL AND p_offset > 0 THEN
        SET @consulta = CONCAT(@consulta, ' OFFSET ', p_offset);
    END IF;
    
    PREPARE stmt FROM @consulta;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$

-- Procedimiento: actualizar_metricas_ccc (en tiempo real)
CREATE PROCEDURE IF NOT EXISTS actualizar_metricas_ccc(IN fecha_calculo DATE)
BEGIN
    -- Insertar o actualizar métricas diarias de CCC
    INSERT INTO metricas_retroalimentacion (
        periodo,
        total_encuestas_generadas,
        total_encuestas_contestadas,
        promedio_satisfaccion,
        promedio_atencion_operador,
        promedio_tiempo_respuesta,
        promedio_solucion,
        promedio_recomendacion,
        tickets_con_encuesta,
        tickets_sin_encuesta,
        fecha_actualizacion
    )
    SELECT
        fecha_calculo AS periodo,
        COUNT(r.id_retro) AS total_encuestas_generadas,
        SUM(CASE WHEN r.estado = 'Contestada' THEN 1 ELSE 0 END) AS total_encuestas_contestadas,
        ROUND(AVG(
            CAST(COALESCE(rr.pregunta1_atencion_operador, '0') AS DECIMAL(3,2)) +
            CAST(COALESCE(rr.pregunta2_tiempo_respuesta, '0') AS DECIMAL(3,2)) +
            CAST(COALESCE(rr.pregunta3_solucion_brindada, '0') AS DECIMAL(3,2)) +
            CAST(COALESCE(rr.pregunta4_recomendacion, '0') AS DECIMAL(3,2))
        ) / 4, 2) AS promedio_satisfaccion,
        ROUND(AVG(CAST(COALESCE(rr.pregunta1_atencion_operador, '0') AS DECIMAL(3,2))), 2) AS promedio_atencion_operador,
        ROUND(AVG(CAST(COALESCE(rr.pregunta2_tiempo_respuesta, '0') AS DECIMAL(3,2))), 2) AS promedio_tiempo_respuesta,
        ROUND(AVG(CAST(COALESCE(rr.pregunta3_solucion_brindada, '0') AS DECIMAL(3,2))), 2) AS promedio_solucion,
        ROUND(AVG(CAST(COALESCE(rr.pregunta4_recomendacion, '0') AS DECIMAL(3,2))), 2) AS promedio_recomendacion,
        (SELECT COUNT(*) FROM tickets t WHERE DATE(t.fecha_registro) = fecha_calculo AND EXISTS(SELECT 1 FROM retroalimentacion r2 WHERE r2.id_ticket = t.id)) AS tickets_con_encuesta,
        (SELECT COUNT(*) FROM tickets t WHERE DATE(t.fecha_registro) = fecha_calculo AND NOT EXISTS(SELECT 1 FROM retroalimentacion r2 WHERE r2.id_ticket = t.id)) AS tickets_sin_encuesta,
        NOW() AS fecha_actualizacion
    FROM retroalimentacion r
    LEFT JOIN respuestas_retroalimentacion rr ON r.id_retro = rr.id_retro
    WHERE DATE(r.fecha_creacion) = fecha_calculo
    ON DUPLICATE KEY UPDATE
        total_encuestas_generadas = VALUES(total_encuestas_generadas),
        total_encuestas_contestadas = VALUES(total_encuestas_contestadas),
        promedio_satisfaccion = VALUES(promedio_satisfaccion),
        promedio_atencion_operador = VALUES(promedio_atencion_operador),
        promedio_tiempo_respuesta = VALUES(promedio_tiempo_respuesta),
        promedio_solucion = VALUES(promedio_solucion),
        promedio_recomendacion = VALUES(promedio_recomendacion),
        tickets_con_encuesta = VALUES(tickets_con_encuesta),
        tickets_sin_encuesta = VALUES(tickets_sin_encuesta),
        fecha_actualizacion = NOW();
END$$

DELIMITER ;

-- ===============================================
-- DATOS INICIALES
-- ===============================================

-- Estados de cotización
INSERT IGNORE INTO estados_cotizacion (nombre) VALUES
('ENVIADO'),('DECLINADA'),('ALMACEN'),('OPERACIONES'),('COBRANZA'),('FACTURACION'),('FINALIZADO');

-- Usuario administrador por defecto
INSERT IGNORE INTO usuarios (nombre_completo, usuario, contrasena, rol)
VALUES ('Administrador General', 'admin', 'admin123', 'Administrador');

-- Categorías de documentos
INSERT IGNORE INTO categorias_documento (nombre_categoria, descripcion, icono_css, color) VALUES
('Manuales Operativos', 'Documentos de procedimientos y guías operativas', 'fas fa-book', '#10B981'),
('Políticas Institucionales', 'Normativas y políticas organizacionales', 'fas fa-gavel', '#EF4444'),
('Formatos y Plantillas', 'Formularios y documentos tipo para uso interno', 'fas fa-file-alt', '#8B5CF6'),
('Capacitación', 'Material de entrenamiento y desarrollo', 'fas fa-graduation-cap', '#F59E0B'),
('Documentación Técnica', 'Manuales técnicos y especificaciones', 'fas fa-cogs', '#06B6D4'),
('Archivo General', 'Documentos de archivo y respaldo', 'fas fa-archive', '#6B7280');

-- ===============================================
-- FIN DEL SCRIPT
-- ===============================================
-- Para aplicar:
-- 1. Backup: mysqldump -u root -p swgroi_db > backup_$(date +%Y%m%d).sql
-- 2. Aplicar: mysql -u root -p < swgroi_db_completo.sql
-- 3. Verificar: mysql -u root -p -e "USE swgroi_db; SHOW TABLES;"
