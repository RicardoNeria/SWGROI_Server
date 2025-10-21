-- SCRIPT: COMANDOS DE CREACIÓN/EVOLUCIÓN DE COLUMNAS (MIGRACIONES INCREMENTALES)
-- Objetivo: centralizar ALTER TABLE idempotentes para nuevas columnas agregadas a lo largo del tiempo.
-- Compatibilidad: MySQL 8+. Usa ALTER ... ADD COLUMN IF NOT EXISTS y pasos seguros.

USE swgroi_db;

-- ===============================
-- TICKETS
-- ===============================
-- 1) TipoAsunto (nuevo dominio para clasificar tickets)
ALTER TABLE tickets 
    ADD COLUMN IF NOT EXISTS TipoAsunto VARCHAR(50) NOT NULL DEFAULT '' AFTER Descripcion;

-- Normalizar valores nulos si el motor ignoró DEFAULT en la adición
UPDATE tickets SET TipoAsunto = '' WHERE TipoAsunto IS NULL;

-- 2) FechaActualizacion (momento de la última actualización de estado)
ALTER TABLE tickets 
    ADD COLUMN IF NOT EXISTS FechaActualizacion DATETIME NULL AFTER FechaRegistro;

-- 3) Campo de comentario técnico (por compatibilidad histórica)
ALTER TABLE tickets 
    ADD COLUMN IF NOT EXISTS Comentario VARCHAR(1000) NULL AFTER Cotizacion;

-- (Opcional) ComentariosTecnico si no existe en instalaciones antiguas
ALTER TABLE tickets 
    ADD COLUMN IF NOT EXISTS ComentariosTecnico VARCHAR(1000) NULL AFTER Comentario;

-- ===============================
-- TECNICOS (Módulo Mesa de Control)
-- ===============================
-- Actualmente el módulo solo consulta y actualiza estados/comentarios del ticket.
-- Se deja reservado un ejemplo para futuras extensiones (descomentarlo cuando se requiera):
-- ALTER TABLE tecnicos ADD COLUMN IF NOT EXISTS Especialidad VARCHAR(100) NULL AFTER Nombre;

-- Nota: Este script NO crea tablas; para eso usa el script canónico `script_base_de_datos.sql`.
--       Mantén este archivo para agregar nuevas columnas de forma ordenada y repetible.
