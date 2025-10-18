-- Script para limpiar tickets con safe mode desactivado
-- Fecha: 17 de octubre de 2025

USE swgroi_db;

-- Desactivar safe mode temporalmente
SET SQL_SAFE_UPDATES = 0;

-- Limpiar tickets existentes con "Sin especificar"
DELETE FROM tickets WHERE tipo_asunto = 'Sin especificar' OR tipo_asunto IS NULL;

-- Insertar tickets de prueba con tipo_asunto válido
INSERT INTO tickets (Folio, tipo_asunto, Descripcion, Estado, Responsable, FechaRegistro)
VALUES 
('TEST-001', 'CCTV', 'Este es un ticket de prueba para verificar que tipo_asunto se muestra correctamente en la tabla', 'Abierto', 'admin', NOW()),
('TEST-002', 'Mant. Preventivo Panel', 'Segundo ticket de prueba con mantenimiento preventivo', 'En Proceso', 'admin', NOW());

-- Reactivar safe mode
SET SQL_SAFE_UPDATES = 1;

-- Verificar los datos
SELECT Folio, tipo_asunto, Estado FROM tickets ORDER BY id DESC LIMIT 5;