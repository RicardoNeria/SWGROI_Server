-- VERIFICACIÓN RÁPIDA BD - SWGROI VPS
-- Ejecutar en MySQL para verificar que todo esté correcto
-- mysql -u root -p < VERIFICAR_BD_RAPIDO.sql

USE swgroi_db;

-- 1) Verificar que la tabla tickets existe
SELECT 'VERIFICANDO TABLA TICKETS...' AS paso;
SHOW TABLES LIKE 'tickets';

-- 2) Verificar que la columna tipo_asunto existe
SELECT 'VERIFICANDO COLUMNA TIPO_ASUNTO...' AS paso;
SHOW COLUMNS FROM tickets LIKE 'tipo_asunto';

-- 3) Verificar estructura completa de tickets
SELECT 'ESTRUCTURA COMPLETA DE TICKETS:' AS paso;
DESCRIBE tickets;

-- 4) Contar tickets existentes
SELECT 'TICKETS EN LA BASE DE DATOS:' AS paso;
SELECT COUNT(*) as total_tickets FROM tickets;

-- 5) Verificar tickets con TipoAsunto (si existen)
SELECT 'TICKETS CON TIPO_ASUNTO:' AS paso;
SELECT id, folio, tipo_asunto, estado 
FROM tickets 
LIMIT 5;

-- 6) Verificar tipos de asunto únicos
SELECT 'TIPOS DE ASUNTO ÚNICOS:' AS paso;
SELECT DISTINCT tipo_asunto, COUNT(*) as cantidad 
FROM tickets 
GROUP BY tipo_asunto;

-- 7) Verificar tabla usuarios
SELECT 'VERIFICANDO USUARIOS:' AS paso;
SELECT COUNT(*) as total_usuarios FROM usuarios;

-- 8) Verificar tabla tecnicos
SELECT 'VERIFICANDO TECNICOS:' AS paso;
SELECT COUNT(*) as total_tecnicos FROM tecnicos;

SELECT 'VERIFICACIÓN COMPLETADA' AS resultado;