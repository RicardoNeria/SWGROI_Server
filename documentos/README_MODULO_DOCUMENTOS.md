# 📂 Módulo de Gestión Documental - SWGROI

## 📋 Descripción General

El módulo de gestión documental es un sistema completo para centralizar, organizar y controlar documentos dentro del ecosistema SWGROI. Diseñado siguiendo principios de normalización de base de datos y buenas prácticas de desarrollo, proporciona funcionalidades enterprise para el manejo de documentos digitales.

## 🏗️ Arquitectura del Sistema

### 🗄️ Capa de Base de Datos

**Esquema Normalizado (3NF)**
- `categorias_documento`: Gestión jerárquica de categorías
- `documentos`: Tabla principal con metadatos completos  
- `auditoria_documentos`: Trazabilidad completa de acciones
- `permisos_documento`: Control granular de acceso
- `favoritos_documento`: Sistema de marcadores por usuario

**Características Técnicas:**
- ✅ Normalización 3NF con integridad referencial
- ✅ Índices optimizados para búsquedas full-text
- ✅ Versionado automático de documentos
- ✅ Soft delete para recuperación de datos
- ✅ Triggers para auditoría automática
- ✅ Stored procedures para operaciones complejas

### 🔧 Capa de Backend (C#/.NET)

**DocumentosController.cs** - API RESTful completa
- Manejo de sesiones y autenticación
- Validación de archivos y tipos MIME
- Procesamiento de uploads multipart/form-data  
- Gestión de permisos granulares
- Logging y auditoría automática

**Características Técnicas:**
- ✅ Validación de tipos de archivo y tamaños
- ✅ Hash SHA256 para integridad de archivos
- ✅ Rate limiting y protección CSRF
- ✅ Manejo robusto de errores
- ✅ Integración con sistema de sesiones existente

### 🎨 Capa de Frontend (HTML5/CSS3/JS)

**documentos.html** - Interfaz de usuario moderna
- Diseño responsivo mobile-first
- Drag & drop para subida de archivos
- Búsqueda avanzada con filtros múltiples
- Vista de tarjetas y lista intercambiables

**documentos.css** - Sistema de estilos modular
- Variables CSS personalizables
- Componentes reutilizables
- Animaciones y transiciones fluidas
- Compatibilidad cross-browser

**documentos.js** - Lógica de interacción avanzada  
- Manejo asíncrono de APIs
- Validación client-side
- Sistema de notificaciones
- Gestión de estado local

## 🚀 Funcionalidades Implementadas

### 📁 Gestión de Documentos
- ✅ **Subida de archivos** - Drag & drop con validación
- ✅ **Búsqueda avanzada** - Full-text con filtros múltiples
- ✅ **Categorización jerárquica** - Organización flexible
- ✅ **Versionado automático** - Control de cambios
- ✅ **Estados de documento** - Ciclo de vida completo
- ✅ **Sistema de etiquetas** - Taxonomía flexible
- ✅ **Fechas de vigencia** - Control temporal
- ✅ **Favoritos por usuario** - Acceso rápido personalizado

### 🔐 Seguridad y Permisos
- ✅ **Autenticación de sesión** - Integrada con sistema existente
- ✅ **Permisos granulares** - Usuario y rol-based
- ✅ **Validación de archivos** - Tipos MIME y tamaños
- ✅ **Integridad de datos** - Hash SHA256
- ✅ **Auditoría completa** - Trazabilidad de todas las acciones
- ✅ **Rate limiting** - Protección contra ataques

### 📊 Funciones Avanzadas
- ✅ **Paginación eficiente** - Optimizada para grandes volúmenes
- ✅ **Estadísticas en tiempo real** - Métricas de uso
- ✅ **Filtros inteligentes** - Combinación múltiple
- ✅ **Vistas adaptativas** - Grid y lista
- ✅ **Indicadores visuales** - Estados y vigencias
- ✅ **Accesibilidad WCAG** - Navegación por teclado, ARIA labels

## 📂 Estructura de Archivos

```
SWGROI_Server/
├── base_de_datos/
│   └── script_base_de_datos.sql      # 🗄️ Esquema completo de BD
├── controladores/  
│   └── DocumentosController.cs       # 🔧 API REST Controller
├── wwwroot/
│   ├── documentos.html              # 🎨 Interfaz principal
│   ├── Styles/
│   │   └── documentos.css           # 💅 Estilos modulares
│   └── Scripts/
│       └── documentos.js            # ⚡ Lógica de interacción
└── datos_prueba_documentos.sql      # 🧪 Datos de prueba
```

## 🛠️ Guía de Instalación

### 1️⃣ Base de Datos
```sql
-- Ejecutar el script de base de datos
SOURCE script_base_de_datos.sql;

-- Insertar datos de prueba (opcional)
SOURCE datos_prueba_documentos.sql;
```

### 2️⃣ Backend Integration
El controlador ya está integrado en `RequestRouter.cs`:
```csharp
case "documentos":
    if (!Authz.RequireLogin(context)) return;
    DocumentosController.ProcesarSolicitud(context); 
    return;
```

### 3️⃣ Frontend Access
Acceder via navegador: `https://tu-servidor/documentos.html`

## 🔗 API Endpoints

### GET Endpoints
- `GET /documentos?op=listar` - Listar documentos con paginación
- `GET /documentos?op=buscar&q={query}` - Búsqueda de documentos  
- `GET /documentos?op=categorias` - Listar categorías disponibles
- `GET /documentos?op=descargar&id={id}` - Descargar archivo

### POST Endpoints  
- `POST /documentos?op=subir` - Subir nuevo documento
- `POST /documentos?op=favorito` - Toggle favorito

## ⚡ Parámetros de Configuración

```javascript
// documentos.js - Configuración
const DocumentosConfig = {
    MAX_FILE_SIZE: 50 * 1024 * 1024,  // 50MB
    ALLOWED_TYPES: ['pdf', 'doc', 'xls', 'jpg', '...'],
    ITEMS_PER_PAGE: 20,
    DEBOUNCE_DELAY: 500
};
```

## 📱 Características de UX/UI

### 🎯 Responsive Design
- ✅ Mobile-first approach
- ✅ Breakpoints: 480px, 768px, 1024px
- ✅ Touch-friendly interactions
- ✅ Flexible grid layouts

### ♿ Accesibilidad
- ✅ WCAG 2.1 AA compliance
- ✅ Navegación por teclado completa
- ✅ ARIA labels y roles
- ✅ Alto contraste y tipografías legibles
- ✅ Screen reader compatible

### 🚀 Performance
- ✅ Lazy loading de imágenes
- ✅ Debounced search
- ✅ Paginación optimizada  
- ✅ CSS/JS minificados en producción
- ✅ Caching inteligente

## 🧪 Testing y Validación

### ✅ Checklist de Funcionalidades
- [x] Subida de archivos múltiples
- [x] Validación client y server-side
- [x] Búsqueda y filtrado
- [x] Gestión de categorías  
- [x] Sistema de permisos
- [x] Auditoría de acciones
- [x] Interfaz responsiva
- [x] Navegación por teclado
- [x] Manejo de errores

### 🔍 Casos de Prueba
1. **Subida de archivos**: Validar tipos, tamaños, duplicados
2. **Búsqueda**: Texto completo, filtros combinados, resultados vacíos
3. **Permisos**: Acceso denegado, roles diferentes
4. **UI Responsiva**: Mobile, tablet, desktop
5. **Accesibilidad**: Screen readers, navegación por teclado

## 🚀 Roadmap de Mejoras

### 📋 Funcionalidades Pendientes
- [ ] **Preview de documentos** - Visor integrado
- [ ] **Comentarios y anotaciones** - Colaboración
- [ ] **Workflow de aprobación** - Estados avanzados  
- [ ] **OCR y búsqueda en contenido** - Texto extraído
- [ ] **Integración con Office 365** - Edición online
- [ ] **Notificaciones push** - Eventos en tiempo real
- [ ] **API GraphQL** - Queries flexibles
- [ ] **Sincronización offline** - PWA capabilities

### 🔧 Mejoras Técnicas
- [ ] **CDN para archivos** - Delivery optimizado
- [ ] **Compresión automática** - Optimización de storage
- [ ] **Backup automático** - Redundancia de datos
- [ ] **Métricas avanzadas** - Analytics detallado
- [ ] **Tests automatizados** - CI/CD pipeline
- [ ] **Docker containers** - Deployment simplificado

## 📞 Soporte y Documentación

### 🔗 Enlaces Útiles
- **Manual Técnico**: `/documentos/MANUAL_TECNICO.md`
- **API Documentation**: `/documentos/API.md` 
- **Troubleshooting**: `/documentos/FAQ.md`

### 👥 Equipo de Desarrollo
- **Architecture**: Database normalization, REST API design
- **Frontend**: Responsive UI, accessibility compliance  
- **Backend**: Security, performance optimization
- **QA**: Testing, validation, documentation

---

**Versión**: 1.0.0  
**Última actualización**: Septiembre 2025  
**Compatibilidad**: .NET Framework 4.8, MySQL 5.7+, Browsers ES6+