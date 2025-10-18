-- ===============================================
-- INSTALADOR SIMPLIFICADO MYSQL - SWGROI VPS
-- Version: 1.0 (17 de octubre de 2025)
-- ===============================================
-- Este script verifica MySQL y crea la BD paso a paso
-- Para ejecutar: mysql -u root -p < INSTALAR_BD_SIMPLE.sql
-- ===============================================

-- Mostrar versión de MySQL
SELECT VERSION() AS mysql_version;

-- Mostrar bases de datos actuales
SHOW DATABASES;

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS swgroi_db CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Usar la base de datos
USE swgroi_db;

-- Verificar que estamos en la BD correcta
SELECT DATABASE() AS database_actual;

-- Crear tabla tickets con TipoAsunto
CREATE TABLE IF NOT EXISTS tickets (
  id INT NOT NULL AUTO_INCREMENT,
  folio VARCHAR(20) NOT NULL,
  descripcion VARCHAR(500) NOT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'Nuevo',
  responsable VARCHAR(100) NOT NULL,
  tecnico VARCHAR(100) DEFAULT NULL,
  cuenta VARCHAR(100) DEFAULT NULL,
  razon_social VARCHAR(150) DEFAULT NULL,
  regional VARCHAR(100) DEFAULT NULL,
  domicilio VARCHAR(300) DEFAULT NULL,
  fecha_atencion DATE DEFAULT NULL,
  agente_responsable VARCHAR(100) DEFAULT NULL,
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  fecha_asignada DATE DEFAULT NULL,
  hora_asignada VARCHAR(10) DEFAULT NULL,
  fecha_cierre DATETIME DEFAULT NULL,
  cotizacion VARCHAR(50) DEFAULT NULL,
  comentario VARCHAR(1000) DEFAULT NULL,
  comentarios_tecnico VARCHAR(1000) DEFAULT NULL,
  tipo_asunto VARCHAR(100) NOT NULL DEFAULT 'Mant. Correctivo Panel',
  PRIMARY KEY (id),
  UNIQUE KEY uq_tickets_folio (folio),
  KEY ix_tickets_estado (estado),
  KEY ix_tickets_fecha (fecha_registro),
  KEY ix_tickets_tipo (tipo_asunto),
  KEY ix_tickets_tecnico (tecnico)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Crear tabla usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario INT NOT NULL AUTO_INCREMENT,
  nombre_completo VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) NOT NULL,
  contrasena VARCHAR(200) NOT NULL,
  rol VARCHAR(50) NOT NULL DEFAULT 'Usuario',
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuarios_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Crear tabla tecnicos
CREATE TABLE IF NOT EXISTS tecnicos (
  id_tecnico INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  telefono VARCHAR(20) DEFAULT NULL,
  email VARCHAR(100) DEFAULT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_tecnico),
  UNIQUE KEY uq_tecnicos_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Crear tabla avisos (para evitar error del DataSeeder)
CREATE TABLE IF NOT EXISTS avisos (
  id_aviso INT NOT NULL AUTO_INCREMENT,
  titulo VARCHAR(200) NOT NULL,
  contenido TEXT NOT NULL,
  fecha_publicacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id_aviso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insertar usuario admin inicial (password: admin123)
INSERT IGNORE INTO usuarios (nombre_completo, usuario, contrasena, rol) VALUES
('Administrador', 'admin', '$2b$10$rH8qKqV7XqN3yP4aY1xwz.Kb9cP5M6vT8uR2nL7sA3hF9jW1xQmNy', 'Administrador');

-- Insertar técnicos de ejemplo
INSERT IGNORE INTO tecnicos (nombre, telefono, email) VALUES
('Juan Carlos Mendoza', '55-1234-5678', 'juan.mendoza@swgroi.com'),
('María Elena Rodriguez', '55-2345-6789', 'maria.rodriguez@swgroi.com'),
('Roberto Silva Castro', '55-3456-7890', 'roberto.silva@swgroi.com');

-- Insertar tickets de ejemplo con TipoAsunto
INSERT IGNORE INTO tickets (folio, descripcion, estado, responsable, tecnico, tipo_asunto, comentario) VALUES
('TKT-2025-001', 'Mantenimiento correctivo en panel eléctrico', 'Nuevo', 'Supervisor', 'Juan Carlos Mendoza', 'Mant. Correctivo Panel', 'Revisión urgente'),
('TKT-2025-002', 'Instalación de sistema de monitoreo', 'En Proceso', 'Jefe Proyectos', 'María Elena Rodriguez', 'Instalación', 'Instalación programada'),
('TKT-2025-003', 'Mantenimiento preventivo mensual', 'Programado', 'Coordinador', 'Roberto Silva Castro', 'Mant. Preventivo', 'Mantenimiento rutinario');

-- Insertar aviso inicial para evitar error DataSeeder
INSERT IGNORE INTO avisos (titulo, contenido) VALUES
('Bienvenido a SWGROI v3.0', 'Sistema actualizado con nueva funcionalidad Tipo de Asunto');

-- Mostrar resultados
SELECT 'INSTALACIÓN COMPLETADA' AS status;
SELECT COUNT(*) AS total_usuarios FROM usuarios;
SELECT COUNT(*) AS total_tecnicos FROM tecnicos;
SELECT COUNT(*) AS total_tickets FROM tickets;
SELECT COUNT(*) AS total_avisos FROM avisos;

-- Mostrar estructura de tickets para verificar TipoAsunto
DESCRIBE tickets;

-- Verificar algunos datos
SELECT id, folio, tipo_asunto, estado FROM tickets LIMIT 3;

SELECT 'BASE DE DATOS LISTA PARA SWGROI v3.0' AS mensaje_final;