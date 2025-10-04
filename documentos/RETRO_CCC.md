# 📋 Módulo de Retroalimentación CCC

## 🎯 Descripción General

El **Módulo de Retroalimentación CCC** es un sistema completo para la **recopilación y análisis de satisfacción del cliente** desarrollado específicamente para los **Operadores del Centro de Contact Center (CCC)**.

### ✨ Características Principales

- 🔗 **Generación de enlaces únicos** por ticket para formularios personalizados
- 📝 **Formulario de 5 preguntas** enfocadas en mejorar el servicio de atención
- ✅ **Validación obligatoria** para procesos internos (autorización de facturación)
- 🔍 **Historial y búsqueda** completa de respuestas para análisis de tendencias
- 📊 **Métricas automáticas** y reportes de satisfacción
- 🛡️ **Seguridad robusta** con tokens únicos y validaciones

---

## 🗃️ Estructura de Base de Datos

### Tabla Principal: `retroalimentacion`
```sql
CREATE TABLE retroalimentacion (
  RetroID INT AUTO_INCREMENT PRIMARY KEY,
  Cliente VARCHAR(100) NOT NULL,
  EnlaceUnico VARCHAR(255) UNIQUE NOT NULL,
  UsuarioID INT,                     -- Operador CCC que generó
  TicketID INT UNIQUE,               -- Ticket asociado (1 encuesta x ticket)
  FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  Estado ENUM('Pendiente', 'Contestada', 'Expirada') DEFAULT 'Pendiente',
  -- Índices y FK para optimización
  FOREIGN KEY (UsuarioID) REFERENCES usuarios(IdUsuario),
  FOREIGN KEY (TicketID) REFERENCES tickets(Id)
);
```

### Tabla de Respuestas: `respuestas_retroalimentacion`
```sql
CREATE TABLE respuestas_retroalimentacion (
  RetroID INT PRIMARY KEY,
  -- 5 preguntas específicas CCC
  Pregunta1_Atencion_Operador VARCHAR(1000) NOT NULL,    -- Escala 1-5
  Pregunta2_Tiempo_Respuesta VARCHAR(1000) NOT NULL,     -- Escala 1-5
  Pregunta3_Solucion_Brindada VARCHAR(1000) NOT NULL,    -- Escala 1-5
  Pregunta4_Recomendacion VARCHAR(1000) NOT NULL,        -- Escala 1-5
  Pregunta5_Comentarios VARCHAR(1000),                   -- Texto libre
  -- Metadatos de auditoría
  FechaRespuesta DATETIME DEFAULT CURRENT_TIMESTAMP,
  DireccionIP VARCHAR(45),
  UserAgent VARCHAR(500),
  TiempoCompletado INT,                                   -- Segundos
  FOREIGN KEY (RetroID) REFERENCES retroalimentacion(RetroID) ON DELETE CASCADE
);
```

### Tabla de Métricas: `metricas_retroalimentacion`
```sql
CREATE TABLE metricas_retroalimentacion (
  MetricaID INT AUTO_INCREMENT PRIMARY KEY,
  Periodo DATE UNIQUE NOT NULL,
  TotalEncuestasGeneradas INT DEFAULT 0,
  TotalEncuestasContestadas INT DEFAULT 0,
  PromedioSatisfaccion DECIMAL(3,2) DEFAULT 0.00,
  PromedioAtencionOperador DECIMAL(3,2) DEFAULT 0.00,
  PromedioTiempoRespuesta DECIMAL(3,2) DEFAULT 0.00,
  PromedioSolucion DECIMAL(3,2) DEFAULT 0.00,
  PromedioRecomendacion DECIMAL(3,2) DEFAULT 0.00,
  TicketsConEncuesta INT DEFAULT 0,
  TicketsSinEncuesta INT DEFAULT 0,
  FechaActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Vista de Análisis: `vista_satisfaccion_ccc`
```sql
CREATE VIEW vista_satisfaccion_ccc AS
SELECT 
    r.RetroID, r.Cliente, t.Folio,
    t.Descripcion AS DescripcionTicket,
    t.Estado AS EstadoTicket, t.Responsable,
    r.FechaCreacion AS FechaGeneracionEncuesta,
    rr.FechaRespuesta, r.Estado AS EstadoEncuesta,
    -- Calificaciones numéricas
    CAST(rr.Pregunta1_Atencion_Operador AS SIGNED) AS CalificacionAtencion,
    CAST(rr.Pregunta2_Tiempo_Respuesta AS SIGNED) AS CalificacionTiempo,
    CAST(rr.Pregunta3_Solucion_Brindada AS SIGNED) AS CalificacionSolucion,
    CAST(rr.Pregunta4_Recomendacion AS SIGNED) AS CalificacionRecomendacion,
    rr.Pregunta5_Comentarios AS Comentarios,
    -- Promedio automático de satisfacción
    ROUND((CAST(rr.Pregunta1_Atencion_Operador AS SIGNED) + 
           CAST(rr.Pregunta2_Tiempo_Respuesta AS SIGNED) + 
           CAST(rr.Pregunta3_Solucion_Brindada AS SIGNED) + 
           CAST(rr.Pregunta4_Recomendacion AS SIGNED)) / 4.0, 2) AS PromedioSatisfaccion,
    DATEDIFF(IFNULL(rr.FechaRespuesta, NOW()), r.FechaCreacion) AS DiasParaRespuesta,
    u.NombreCompleto AS OperadorGenerador
FROM retroalimentacion r
INNER JOIN tickets t ON r.TicketID = t.Id
LEFT JOIN respuestas_retroalimentacion rr ON r.RetroID = rr.RetroID
LEFT JOIN usuarios u ON r.UsuarioID = u.IdUsuario
ORDER BY r.FechaCreacion DESC;
```

---

## 🛠️ API Endpoints

### 🔓 Endpoints Públicos (Cliente)

#### `GET /retroalimentacion?op=form&token={token}`
**Descripción:** Obtiene las preguntas del formulario y valida el token
```json
// Respuesta
{
  "retroId": 123,
  "cliente": "Empresa ABC",
  "folio": "TCK-00456",
  "contestada": false,
  "preguntas": [
    "¿Cómo calificaría la atención del operador de CCC? (1=Muy mala, 5=Excelente)",
    "¿El tiempo de respuesta fue adecuado? (1-5)",
    "¿La solución brindada resolvió su necesidad? (1-5)",
    "¿Recomendaría nuestro servicio? (1-5)",
    "Comentarios adicionales"
  ]
}
```

#### `POST /retroalimentacion?op=responder&token={token}`
**Descripción:** Guarda las respuestas del cliente
```json
// Request body
{
  "r1": "5",
  "r2": "4", 
  "r3": "5",
  "r4": "5",
  "r5": "Excelente servicio, muy satisfecho con la atención recibida"
}
// Respuesta
{
  "ok": true
}
```

### 🔒 Endpoints Seguros (Staff CCC)

#### `POST /retroalimentacion?op=generar`
**Descripción:** Genera/recupera enlace único por folio de ticket
**Requiere:** Sesión + Token CSRF
```json
// Request body
{
  "ticket": "TCK-00456"
}
// Respuesta
{
  "link": "https://host.com/retroalimentacion.html?t=ABC123XYZ",
  "contestada": false
}
```

#### `GET /retroalimentacion?op=buscar&ticket={folio}`
**Descripción:** Recupera respuestas por folio de ticket
**Requiere:** Sesión válida
```json
// Respuesta
{
  "folio": "TCK-00456",
  "cliente": "Empresa ABC",
  "enlace": "ABC123XYZ",
  "fechaRespuesta": "2025-09-24 14:30",
  "r1": "5",
  "r2": "4",
  "r3": "5", 
  "r4": "5",
  "r5": "Excelente servicio..."
}
```

---

## 🖥️ Interfaces de Usuario

### 👤 Para Clientes: `/retroalimentacion.html`
- **Acceso:** Público con token válido
- **Funciones:**
  - ✅ Validación automática de enlace
  - 📝 Formulario intuitivo con 5 preguntas
  - 🔒 Prevención de respuestas duplicadas
  - 📱 Diseño responsivo
  - ⚡ Carga dinámica por token

### 👨‍💼 Para Staff CCC: `/retro_ccc_admin.html`
- **Acceso:** Requiere sesión de usuario
- **Funciones:**
  - 🔗 Generación de enlaces por folio
  - 🔍 Búsqueda de respuestas existentes
  - 📊 Visualización de resultados
  - 📋 Tabla detallada de respuestas
  - 🎨 Interface profesional y clara

---

## 📊 Preguntas del Formulario

| # | Pregunta | Tipo | Obligatoria |
|---|----------|------|-------------|
| 1 | ¿Cómo calificaría la atención del operador de CCC? | Escala 1-5 | ✅ Sí |
| 2 | ¿El tiempo de respuesta fue adecuado? | Escala 1-5 | ✅ Sí |
| 3 | ¿La solución brindada resolvió su necesidad? | Escala 1-5 | ✅ Sí |
| 4 | ¿Recomendaría nuestro servicio? | Escala 1-5 | ✅ Sí |
| 5 | Comentarios adicionales | Texto libre | ❌ Opcional |

### 📋 Leyenda Obligatoria
> **"Favor de contestar la siguiente encuesta para completar el proceso de su factura"**

---

## 🔒 Seguridad Implementada

### Autenticación y Autorización
- 🔐 **Tokens únicos** generados con `Guid.NewGuid().ToByteArray()`
- 🛡️ **CSRF Protection** en operaciones administrativas
- 🚫 **Rate Limiting** global por IP y ruta
- 🔄 **Validación de sesiones** para staff
- 📱 **Acceso público controlado** solo para formularios

### Validaciones
- ✅ **Sanitización** de todas las entradas
- 🔍 **Verificación de existencia** de tickets
- ❌ **Prevención de duplicados** por ticket
- ⏰ **Control de estados** (Pendiente/Contestada/Expirada)
- 📊 **Límites de longitud** en respuestas (1000 chars)

### Auditoría
- 📝 **Logs automáticos** de todas las operaciones
- 🕐 **Timestamps** precisos en respuestas
- 🌐 **Captura de IP** y User-Agent
- ⏱️ **Tiempo de completado** de encuestas
- 👤 **Trazabilidad** de operadores

---

## 📈 Métricas y Análisis

### Procedimiento Automático: `ActualizarMetricasCCC(fecha)`
```sql
CALL ActualizarMetricasCCC('2025-09-24');
```
**Calcula diariamente:**
- Total de encuestas generadas
- Total de encuestas contestadas  
- Promedios de satisfacción por pregunta
- Tickets con/sin encuesta
- Tendencias temporales

### Reportes Disponibles
```sql
-- Top 10 mejores calificaciones
SELECT Folio, PromedioSatisfaccion, Comentarios
FROM vista_satisfaccion_ccc 
WHERE PromedioSatisfaccion IS NOT NULL
ORDER BY PromedioSatisfaccion DESC LIMIT 10;

-- Encuestas pendientes por más de 7 días
SELECT Folio, Cliente, DiasParaRespuesta
FROM vista_satisfaccion_ccc
WHERE EstadoEncuesta = 'Pendiente' AND DiasParaRespuesta > 7;

-- Promedio mensual de satisfacción
SELECT YEAR(FechaRespuesta) as Año, MONTH(FechaRespuesta) as Mes,
       AVG(PromedioSatisfaccion) as PromedioMes
FROM vista_satisfaccion_ccc
WHERE FechaRespuesta IS NOT NULL
GROUP BY YEAR(FechaRespuesta), MONTH(FechaRespuesta);
```

---

## 🚀 Instalación y Configuración

### 1. Base de Datos
```bash
# Ejecutar el script completo
mysql -u root -p < script_base_de_datos.sql
```

### 2. Archivos del Sistema
- ✅ `controladores/RetroalimentacionController.cs` - Lógica de negocio
- ✅ `wwwroot/retroalimentacion.html` - Formulario cliente  
- ✅ `wwwroot/retro_ccc_admin.html` - Panel administrativo
- ✅ `wwwroot/Scripts/retroalimentacion.js` - JS cliente
- ✅ `wwwroot/Scripts/retro_admin.js` - JS administrativo

### 3. Configuración de Rutas
```csharp
// En RequestRouter.cs ya configurado
case "retroalimentacion":
    RetroalimentacionController.Manejar(context); 
    return;
```

---

## 📘 Manual de Uso

### Para Operadores CCC:

1. **Generar Encuesta:**
   ```
   1. Acceder a /retro_ccc_admin.html
   2. Ingresar folio del ticket: TCK-00123
   3. Clic en "🔗 Generar Enlace"
   4. Copiar enlace generado
   5. Enviarlo al cliente por email/WhatsApp/SMS
   ```

2. **Consultar Respuestas:**
   ```
   1. En la misma página administrativa
   2. Ingresar folio del ticket
   3. Clic en "🔍 Buscar Respuestas"
   4. Revisar tabla con calificaciones completas
   5. Analizar comentarios para mejoras
   ```

### Para Clientes:

1. **Responder Encuesta:**
   ```
   1. Abrir enlace recibido del CCC
   2. Calificar 4 preguntas (escala 1-5)
   3. Agregar comentarios opcionales
   4. Clic en "Enviar respuestas"
   5. Confirmación automática
   ```

---

## 🔧 Mantenimiento

### Tareas Programadas Recomendadas:
```sql
-- Ejecutar diariamente a las 23:59
CALL ActualizarMetricasCCC(CURDATE());

-- Marcar como expiradas encuestas > 30 días
UPDATE retroalimentacion 
SET Estado = 'Expirada' 
WHERE Estado = 'Pendiente' 
  AND DATEDIFF(NOW(), FechaCreacion) > 30;

-- Limpiar tokens muy antiguos (> 1 año)
DELETE FROM retroalimentacion 
WHERE Estado = 'Expirada' 
  AND DATEDIFF(NOW(), FechaCreacion) > 365;
```

### Monitoring Recomendado:
- 📊 Tasa de respuesta semanal (meta: >60%)
- ⭐ Promedio de satisfacción (meta: >4.0/5)
- ⏱️ Tiempo promedio de respuesta (meta: <3 días)
- 🎯 Tickets sin encuesta (meta: <10%)

---

## 🎯 Funcionalidades Adicionales Implementadas

### Extras que Mejoran la Experiencia:

1. **🔄 Reutilización Inteligente:**
   - Un ticket = Un único enlace (evita spam)
   - Reutilización automática de enlaces existentes

2. **📊 Dashboard en Tiempo Real:**
   - Vista completa en panel administrativo
   - Estados visuales claros (Pendiente/Contestada)

3. **🛡️ Protección Avanzada:**
   - Validación de tokens únicos
   - Control anti-spam por ticket
   - Sanitización completa de inputs

4. **📈 Análisis Profundo:**
   - Vista SQL optimizada para reportes
   - Métricas automáticas por períodos
   - Trending de satisfacción

5. **🔧 Administración Amigable:**
   - Interface moderna y responsiva
   - Feedback visual completo
   - Copiado fácil de enlaces

6. **⚡ Performance:**
   - Índices optimizados en BD
   - Consultas eficientes
   - Caching inteligente

---

## 🏆 Beneficios del Sistema

### Para el CCC:
- ✅ **Mejora continua** basada en feedback real
- 📊 **Métricas objetivas** de satisfacción
- 🎯 **Identificación** de áreas problemáticas
- 📈 **Reporting** ejecutivo automatizado

### Para los Clientes:
- 🎨 **Experiencia simple** y profesional
- ⏰ **Proceso rápido** (2-3 minutos)
- 🔒 **Seguridad** y privacidad garantizada
- 💬 **Canal directo** para feedback

### Para la Empresa:
- 💰 **ROI medible** en servicio al cliente
- 🏅 **Certificación** de calidad
- 📋 **Compliance** con procesos internos
- 🚀 **Diferenciación** competitiva

---

**¡El Módulo de Retroalimentación CCC está completamente desarrollado, probado y listo para producción!** 🎉

*Desarrollado con ❤️ para mejorar la experiencia del cliente y la excelencia operacional del CCC.*
