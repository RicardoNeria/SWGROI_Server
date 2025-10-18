-- Script para agregar campo TipoAsunto a la tabla tickets
-- Fecha: 17 de octubre de 2025

USE swgroi_db;

-- Agregar campo TipoAsunto después del campo folio
ALTER TABLE tickets 
ADD COLUMN tipo_asunto VARCHAR(100) NOT NULL DEFAULT 'Sin especificar' 
AFTER folio;

-- Verificar la estructura de la tabla
DESCRIBE tickets;