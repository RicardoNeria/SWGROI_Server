# Instrucciones para aplicar cambios de tipificación de asunto

## Cambios realizados

### 1. Funcionalidad "Leer más" corregida
- ✅ Funciones definidas globalmente en `window.abrirModalLeerMas` y `window.cerrarModalLeerMas`
- ✅ Event listeners actualizados para usar las funciones globales
- ✅ Índices de columnas actualizados para la nueva estructura de tabla

### 2. Campo de tipificación de asunto agregado
- ✅ Campo HTML agregado en `tickets.html` con 17 opciones de tipificación
- ✅ Validación agregada en JavaScript
- ✅ Controlador actualizado en `TicketsController.cs` para incluir validación y persistencia
- ✅ Entidad `TicketEntidad.cs` actualizada
- ✅ Consultas SQL actualizadas en `ReportesController.cs`
- ✅ Tabla HTML actualizada con nueva columna "Tipo Asunto"
- ✅ Exportación CSV actualizada para incluir el campo

## ACCIÓN REQUERIDA: Actualizar base de datos

Ejecutar el siguiente script SQL en la base de datos:

```sql
USE swgroi_db;

-- Agregar campo TipoAsunto después del campo folio
ALTER TABLE tickets 
ADD COLUMN tipo_asunto VARCHAR(100) NOT NULL DEFAULT 'Sin especificar' 
AFTER folio;

-- Verificar la estructura de la tabla
DESCRIBE tickets;
```

## Tipos de asunto disponibles:
1. Mant. Correctivo Panel
2. Mant. Preventivo Panel  
3. CCTV
4. Cerca Eléctrica
5. Fallo en la comunicación
6. Gestión de claves
7. Capacitación y Asesoría
8. Levantamiento de necesidades
9. Desmonte de Equipo
10. Instalación Nueva
11. Migración
12. Centralización
13. Reemplazo de Equipo
14. Cambio de Equipo
15. Reemplazo de Pilas o Baterías
16. Reemplazo de Dispositivo
17. Reemplazo de Componente general

## Pruebas a realizar:
- [x] Compilación exitosa
- [ ] Verificar funcionalidad "Leer más" en tabla de tickets
- [ ] Probar registro de nuevo ticket con tipificación
- [ ] Verificar validación de campo obligatorio
- [ ] Probar edición de ticket existente
- [ ] Verificar exportación CSV con nueva columna