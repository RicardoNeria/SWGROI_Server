# 🔐 Interfaz de Login SWGROI

## Descripción
Interfaz de login moderna y segura para el Sistema Web de Gestión ROI (SWGROI), diseñada con un enfoque en UX/UI, seguridad y accesibilidad.

## ✨ Características Principales

### 🎨 Diseño Visual
- **Layout de dos paneles**: Panel de branding izquierdo + formulario derecho
- **Gradientes modernos**: Efectos visuales atractivos con glassmorphism
- **Responsive design**: Adaptativo para móviles, tablets y desktop
- **Efectos de partículas**: Animaciones sutiles de fondo (opcional)
- **Modo oscuro**: Soporte automático basado en preferencias del sistema

### 🔒 Seguridad
- **Rate limiting**: Protección contra ataques de fuerza bruta
- **Validación en tiempo real**: Feedback inmediato en los campos
- **Sesiones seguras**: Cookies HttpOnly y SameSite
- **CSRF protection**: Protección contra ataques cross-site
- **Bloqueo automático**: Cuenta bloqueada después de múltiples intentos fallidos

### ♿ Accesibilidad
- **WCAG 2.1 compliant**: Estándares de accesibilidad web
- **Navegación por teclado**: Soporte completo para navegación sin mouse
- **Lectores de pantalla**: Etiquetas ARIA y anuncios de estado
- **Alto contraste**: Soporte para usuarios con problemas visuales
- **Movimiento reducido**: Respeta las preferencias de animación del usuario

### 🚀 UX/UI Mejorada
- **Validación inteligente**: Mensajes de error contextuales
- **Estados visuales**: Feedback visual inmediato para todas las acciones
- **Carga progresiva**: Indicadores de estado durante el proceso de login
- **Recordar usuario**: Opción para guardar el nombre de usuario
- **Mostrar/ocultar contraseña**: Toggle de visibilidad de contraseña

## 📁 Estructura de Archivos

```
wwwroot/
├── login.html                    # Página principal de login
├── Styles/
│   └── login.css                # Estilos específicos del login
├── Scripts/
│   ├── login.js                 # Lógica principal del login
│   └── login-effects.js         # Efectos visuales opcionales
└── Imagenes/
    └── CENTRALDEALARMAS1.png    # Logo de la empresa
```

## 🎯 Componentes Principales

### 1. Panel de Branding
- Logo de la empresa con efectos hover
- Título y subtítulo del sistema
- Features highlights con iconos
- Efectos de fondo animados

### 2. Formulario de Login
- Campo de usuario con validación
- Campo de contraseña con toggle de visibilidad
- Checkbox "Recordar sesión"
- Enlace de "¿Olvidaste tu contraseña?"
- Botón de submit con estados de carga

### 3. Mensajes de Estado
- Mensajes de éxito, error, advertencia e información
- Auto-ocultado para mensajes no críticos
- Soporte para lectores de pantalla

### 4. Loading States
- Overlay de carga durante el proceso de autenticación
- Spinner en el botón de submit
- Deshabilitación del formulario durante el envío

## 🔧 Configuración

### Variables CSS Personalizables
```css
:root {
    --login-bg-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --login-bg-secondary: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    --login-panel-bg: rgba(255, 255, 255, 0.95);
    --login-border-radius: 16px;
    --login-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### JavaScript Settings
```javascript
// Configuración de seguridad
const maxAttempts = 5;           // Máximo de intentos de login
const lockoutTime = 15 * 60 * 1000; // Tiempo de bloqueo (15 min)

// Configuración de efectos
const enableParticles = true;    // Habilitar efectos de partículas
const enableAnimations = true;   // Habilitar animaciones
```

## 🔌 Integración con Backend

### Endpoint de Login
```
POST /login
Content-Type: application/json

{
    "Usuario": "string",
    "Contrasena": "string"
}
```

### Respuesta del Servidor
```json
{
    "exito": true,
    "rol": "string",
    "nombre": "string"
}
```

### Rate Limiting
El sistema incluye protección contra ataques de fuerza bruta:
- Máximo 10 intentos por IP en ventana de 5 minutos
- Bloqueo progresivo con incremento de tiempo
- Headers de respuesta: `Retry-After`

## 📱 Responsive Breakpoints

- **Desktop**: > 768px - Layout de dos columnas
- **Tablet**: 481px - 768px - Layout de una columna, orden revertido
- **Mobile**: < 480px - Layout compacto optimizado

## 🎨 Temas y Personalización

### Modo Oscuro
Se activa automáticamente basado en las preferencias del sistema:
```css
@media (prefers-color-scheme: dark) {
    /* Estilos de modo oscuro */
}
```

### Alto Contraste
Soporte para usuarios con necesidades de accesibilidad:
```css
@media (prefers-contrast: high) {
    /* Estilos de alto contraste */
}
```

## 🐛 Debugging

### Modo Desarrollo
En desarrollo (localhost), se incluyen funciones de debugging:
```javascript
// Pre-llenar formulario para testing
window.fillLoginForm('admin', 'admin');

// Obtener estado del login
window.getLoginStatus();
```

### Estados de Error Comunes
1. **Credenciales incorrectas**: Mensaje amigable + shake animation
2. **Cuenta bloqueada**: Contador regresivo visible
3. **Error de red**: Detección automática de conectividad
4. **Timeout de servidor**: Mensaje específico con sugerencias

## 🔄 Próximas Mejoras

- [ ] Autenticación de dos factores (2FA)
- [ ] Login con biometría (WebAuthn)
- [ ] Integración con SSO/OAuth
- [ ] Análisis de patrones de uso
- [ ] Métricas de seguridad en tiempo real
- [ ] Soporte para PWA (Progressive Web App)

## 📋 Testing

### Tests de Accesibilidad
- Navegación completa por teclado
- Compatibilidad con lectores de pantalla
- Pruebas de contraste de color
- Validación WCAG 2.1

### Tests de Seguridad
- Pruebas de rate limiting
- Validación de entrada
- Protección CSRF
- Gestión segura de sesiones

### Tests de UX
- Flujos de error
- Estados de carga
- Responsive design
- Compatibilidad cross-browser

## 🤝 Contribución

Para contribuir al desarrollo de la interfaz de login:

1. Mantener consistencia con el sistema de diseño
2. Probar en múltiples navegadores y dispositivos
3. Validar accesibilidad con herramientas como WAVE
4. Documentar cambios significativos
5. Incluir tests para nuevas funcionalidades

---

**Desarrollado para SWGROI** - Sistema Web de Gestión ROI  
*Diseño centrado en el usuario y seguridad por defecto*