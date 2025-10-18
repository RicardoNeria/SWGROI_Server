-- Script para corregir el problema de "Sin especificar" en tipo_asunto
-- Fecha: 17 de octubre de 2025
-- Ejecutar este script después de crear la columna tipo_asunto

USE swgroi_db;

-- PASO 1: Ver los tickets actuales con "Sin especificar"
SELECT COUNT(*) as tickets_sin_especificar 
FROM tickets 
WHERE tipo_asunto = 'Sin especificar';

-- PASO 2: ELIMINAR tickets de prueba con "Sin especificar"
-- Ejecuta esta línea SOLO si quieres eliminar los tickets de prueba:
DELETE FROM tickets WHERE tipo_asunto = 'Sin especificar';

-- PASO 3: Verificar que se eliminaron correctamente
SELECT COUNT(*) as total_tickets FROM tickets;

-- PASO 4: Verificar los tickets restantes
SELECT id, Folio, tipo_asunto, Estado, LEFT(Descripcion, 40) as Descripcion_Preview
FROM tickets 
ORDER BY id DESC 
LIMIT 10;

-- NOTA: A partir de ahora, todos los tickets nuevos DEBEN tener un tipo_asunto válido
-- porque el formulario ya no permite seleccionar "Sin especificar"
