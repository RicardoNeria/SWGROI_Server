-- Script para actualizar o eliminar tickets con "Sin especificar" en tipo_asunto
-- Fecha: 17 de octubre de 2025

USE swgroi_db;

-- OPCIÓN 1: Eliminar tickets con "Sin especificar" (si son tickets de prueba)
-- Descomenta la siguiente línea si quieres eliminar estos tickets:
-- DELETE FROM tickets WHERE tipo_asunto = 'Sin especificar';

-- OPCIÓN 2: Actualizar a un tipo válido (ejemplo: "Mantenimiento Preventivo Panel")
-- Descomenta y modifica según tus necesidades:
-- UPDATE tickets 
-- SET tipo_asunto = 'Mantenimiento Preventivo Panel' 
-- WHERE tipo_asunto = 'Sin especificar';

-- Verificar tickets actuales
SELECT id, Folio, tipo_asunto, LEFT(Descripcion, 50) as Descripcion_Corta 
FROM tickets 
ORDER BY id DESC 
LIMIT 10;
