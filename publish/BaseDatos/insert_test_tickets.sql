-- Script para limpiar y crear tickets de prueba con tipo_asunto correcto
-- Fecha: 17 de octubre de 2025

USE swgroi_db;

-- PASO 1: Limpiar tickets existentes con "Sin especificar"
DELETE FROM tickets WHERE tipo_asunto = 'Sin especificar' OR tipo_asunto IS NULL;

-- PASO 2: Insertar un ticket de prueba con tipo_asunto válido
INSERT INTO tickets (Folio, tipo_asunto, Descripcion, Estado, Responsable, FechaRegistro)
VALUES 
('TEST-001', 'CCTV', 'Este es un ticket de prueba para verificar que tipo_asunto se muestra correctamente en la tabla', 'Abierto', 'admin', NOW()),
('TEST-002', 'Mant. Preventivo Panel', 'Segundo ticket de prueba con mantenimiento preventivo', 'En Proceso', 'admin', NOW());

-- PASO 3: Verificar los datos insertados
SELECT id, Folio, tipo_asunto, Descripcion, Estado, Responsable 
FROM tickets 
WHERE Folio LIKE 'TEST-%'
ORDER BY id DESC;

-- PASO 4: Ver todos los tickets actuales
SELECT COUNT(*) as total_tickets FROM tickets;
SELECT Folio, tipo_asunto, Estado FROM tickets ORDER BY id DESC LIMIT 5;