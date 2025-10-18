-- ===============================================
-- SCRIPT DE VERIFICACION Y PARCHE - TIPO ASUNTO
-- Para ejecutar ANTES de usar SWGROI_DB_COMPLETO.sql
-- Version: 1.0 (17 de octubre de 2025)
-- ===============================================
-- Este script verifica si la columna TipoAsunto existe
-- y la agrega si no está presente
-- ===============================================

USE swgroi_db;

-- Verificar si la columna TipoAsunto existe
SET @column_exists = 0;
SELECT COUNT(*) INTO @column_exists
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'swgroi_db' 
  AND TABLE_NAME = 'tickets' 
  AND COLUMN_NAME = 'TipoAsunto';

-- Si no existe, agregarla
SET @sql = CASE 
    WHEN @column_exists = 0 THEN 
        'ALTER TABLE tickets ADD COLUMN TipoAsunto VARCHAR(100) NOT NULL DEFAULT ''Mant. Correctivo Panel'' AFTER comentarios_tecnico'
    ELSE 
        'SELECT ''Columna TipoAsunto ya existe'' as status'
END;

-- Mostrar el SQL que se ejecutará
SELECT @sql as sql_to_execute;

-- Preparar y ejecutar
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar el resultado
SELECT 
    CASE 
        WHEN @column_exists = 0 THEN 'Columna TipoAsunto agregada exitosamente'
        ELSE 'Columna TipoAsunto ya existía'
    END as resultado;

-- Mostrar estructura actual de la tabla tickets
DESCRIBE tickets;

-- Verificar datos
SELECT COUNT(*) as total_tickets FROM tickets;
SELECT DISTINCT TipoAsunto, COUNT(*) as cantidad 
FROM tickets 
GROUP BY TipoAsunto 
ORDER BY cantidad DESC;

SELECT 'PARCHE COMPLETADO - La base de datos está lista para SWGROI v3.0' as mensaje_final;