# 🔄 GUÍA DE REFACTORIZACIÓN OPCIONAL

Esta guía proporciona pasos opcionales para continuar mejorando el sistema SWGROI utilizando las nuevas clases compartidas (`BaseController` y `ServiceHelper`).

---

## 📋 TABLA DE CONTENIDOS

1. [Refactorizar Controladores](#1-refactorizar-controladores)
2. [Refactorizar Servicios](#2-refactorizar-servicios)
3. [Ejemplos de Antes y Después](#3-ejemplos-de-antes-y-después)
4. [Beneficios](#4-beneficios)

---

## 1. Refactorizar Controladores

### Paso 1: Heredar de BaseController

**Antes**:
```csharp
public class TicketsController
{
    private static void Json(HttpListenerResponse res, int status, object obj)
    {
        // Código duplicado en cada controlador
        res.StatusCode = status;
        res.ContentType = "application/json";
        // ... más código
    }
}
```

**Después**:
```csharp
public class TicketsController : BaseController
{
    // Ya no necesitas el método Json, úsalo directamente
    public static void Procesar(HttpListenerContext context)
    {
        // Usar Json heredado de BaseController
        Json(context.Response, 200, new { success = true });
    }
}
```

### Paso 2: Usar Métodos Compartidos

#### Reemplazar ParsearDatos duplicado:

**Antes**:
```csharp
private static Dictionary<string, string> ParsearDatos(string body)
{
    var result = new Dictionary<string, string>();
    // ... código duplicado
    return result;
}
```

**Después**:
```csharp
// Simplemente usar el método heredado
var datos = ParsearDatos(body);
```

#### Reemplazar validaciones manuales:

**Antes**:
```csharp
if (string.IsNullOrWhiteSpace(datos["titulo"]) || 
    string.IsNullOrWhiteSpace(datos["descripcion"]))
{
    Json(res, 400, new { error = "Campos requeridos" });
    return;
}
```

**Después**:
```csharp
if (!ValidarCamposRequeridos(datos, "titulo", "descripcion"))
{
    EnviarError(context.Response, 400, "Faltan campos requeridos");
    return;
}
```

---

## 2. Refactorizar Servicios

### Paso 1: Usar ServiceHelper

**Antes**:
```csharp
public static class VentasService
{
    private static string DictGet(Dictionary<string, string> d, string key)
    {
        // Código duplicado
        return d != null && d.TryGetValue(key, out var v) ? v : "";
    }

    private static Dictionary<string, string> LeerJson(HttpListenerContext ctx)
    {
        // Código duplicado
        using (var reader = new StreamReader(ctx.Request.InputStream))
        {
            // ... más código
        }
    }
}
```

**Después**:
```csharp
using SWGROI_Server.Utils;

public static class VentasService
{
    public static void ConsultarTicket(HttpListenerContext ctx)
    {
        // Usar métodos compartidos directamente
        var datos = ServiceHelper.LeerJson(ctx);
        string ticketId = ServiceHelper.DictGet(datos, "ticketId");
        
        // Validar campos
        if (!ServiceHelper.ValidarCamposRequeridos(datos, out string campo, "ticketId"))
        {
            ServiceHelper.EnviarError(ctx, 400, $"Campo requerido: {campo}");
            return;
        }
        
        // ... lógica del servicio
        
        ServiceHelper.EnviarExito(ctx, resultado);
    }
}
```

---

## 3. Ejemplos de Antes y Después

### Ejemplo 1: Controlador de Tickets

#### Antes (con duplicación):
```csharp
public class TicketsController
{
    public static void Procesar(HttpListenerContext context)
    {
        var body = "";
        using (var reader = new StreamReader(context.Request.InputStream))
        {
            body = reader.ReadToEnd();
        }
        
        var datos = new Dictionary<string, string>();
        var parts = body.Split('&');
        foreach (var part in parts)
        {
            var kv = part.Split('=');
            if (kv.Length == 2)
            {
                datos[Uri.UnescapeDataString(kv[0])] = Uri.UnescapeDataString(kv[1]);
            }
        }
        
        if (string.IsNullOrWhiteSpace(datos.ContainsKey("titulo") ? datos["titulo"] : ""))
        {
            context.Response.StatusCode = 400;
            context.Response.ContentType = "application/json";
            var json = JsonSerializer.Serialize(new { error = "Título requerido" });
            var buffer = Encoding.UTF8.GetBytes(json);
            context.Response.OutputStream.Write(buffer, 0, buffer.Length);
            context.Response.Close();
            return;
        }
        
        // ... más código
    }
}
```

#### Después (optimizado):
```csharp
public class TicketsController : BaseController
{
    public static void Procesar(HttpListenerContext context)
    {
        string body = LeerBody(context.Request);
        var datos = ParsearDatos(body);
        
        if (!ValidarCamposRequeridos(datos, "titulo"))
        {
            EnviarError(context.Response, 400, "Título requerido");
            return;
        }
        
        // ... más código
    }
}
```

**Reducción de código**: ~60%  
**Legibilidad**: ⭐⭐⭐⭐⭐

---

### Ejemplo 2: Servicio de Ventas

#### Antes (con duplicación):
```csharp
public static class VentasService
{
    public static void Guardar(HttpListenerContext ctx)
    {
        Dictionary<string, string> datos;
        using (var reader = new StreamReader(ctx.Request.InputStream))
        {
            string json = reader.ReadToEnd();
            datos = JsonSerializer.Deserialize<Dictionary<string, string>>(json);
        }
        
        string ticketId = datos.ContainsKey("ticketId") ? datos["ticketId"] : "";
        string monto = datos.ContainsKey("monto") ? datos["monto"] : "";
        
        if (string.IsNullOrWhiteSpace(ticketId) || string.IsNullOrWhiteSpace(monto))
        {
            ctx.Response.StatusCode = 400;
            ctx.Response.ContentType = "application/json";
            var json = JsonSerializer.Serialize(new { error = "Datos incompletos" });
            var buffer = Encoding.UTF8.GetBytes(json);
            ctx.Response.OutputStream.Write(buffer, 0, buffer.Length);
            ctx.Response.Close();
            return;
        }
        
        // ... más código
    }
}
```

#### Después (optimizado):
```csharp
public static class VentasService
{
    public static void Guardar(HttpListenerContext ctx)
    {
        var datos = ServiceHelper.LeerJson(ctx);
        
        if (!ServiceHelper.ValidarCamposRequeridos(datos, out string campo, "ticketId", "monto"))
        {
            ServiceHelper.EnviarError(ctx, 400, $"Campo requerido: {campo}");
            return;
        }
        
        string ticketId = ServiceHelper.DictGet(datos, "ticketId");
        string monto = ServiceHelper.DictGet(datos, "monto");
        
        // ... más código
    }
}
```

**Reducción de código**: ~50%  
**Legibilidad**: ⭐⭐⭐⭐⭐

---

## 4. Beneficios

### ✅ Ventajas de la Refactorización

1. **Menos Código**:
   - Reducción de ~50-60% en código repetitivo
   - Menos líneas = menos bugs

2. **Mantenimiento Centralizado**:
   - Cambios en un solo lugar afectan a todo el sistema
   - Fácil agregar logging, métricas, etc.

3. **Código Más Limpio**:
   - Más legible y entendible
   - Mejor para nuevos desarrolladores

4. **Estandarización**:
   - Todas las respuestas JSON iguales
   - Mismo manejo de errores en todos lados

5. **Testing Más Fácil**:
   - Métodos compartidos = tests compartidos
   - Mayor cobertura de código

6. **Performance**:
   - Código optimizado una vez
   - Beneficia a todo el sistema

---

## 📝 Checklist de Refactorización

### Controladores

- [ ] `AdminController.cs` → Heredar de `BaseController`
- [ ] `AsignacionesController.cs` → Heredar de `BaseController`
- [ ] `AuditoriaController.cs` → Heredar de `BaseController`
- [ ] `AvisosController.cs` → Heredar de `BaseController`
- [ ] `CotizacionesController.cs` → Heredar de `BaseController`
- [ ] `DocumentosController.cs` → Heredar de `BaseController`
- [ ] `LoginController.cs` → Heredar de `BaseController`
- [ ] `LogoutController.cs` → Heredar de `BaseController`
- [ ] `MenuController.cs` → Heredar de `BaseController`
- [ ] `MetricasController.cs` → Heredar de `BaseController`
- [ ] `RecuperarController.cs` → Heredar de `BaseController`
- [ ] `ReportesController.cs` → Heredar de `BaseController`
- [ ] `RetroalimentacionController.cs` → Heredar de `BaseController`
- [ ] `SeguimientoController.cs` → Heredar de `BaseController`
- [ ] `SesionController.cs` → Heredar de `BaseController`
- [ ] `TecnicosController.cs` → Heredar de `BaseController`
- [ ] `TicketsController.cs` → Heredar de `BaseController`
- [ ] `VentasController.cs` → Heredar de `BaseController`

### Servicios

- [ ] `AdminService.cs` → Usar `ServiceHelper`
- [ ] `AvisosService.cs` → Usar `ServiceHelper`
- [ ] `DocumentosService.cs` → Usar `ServiceHelper`
- [ ] `RetroalimentacionService.cs` → Usar `ServiceHelper`
- [ ] `TecnicosService.cs` → Usar `ServiceHelper`
- [ ] `TicketsService.cs` → Usar `ServiceHelper`
- [ ] `VentasService.cs` → Usar `ServiceHelper`

---

## ⚠️ Precauciones

1. **Testing**: Probar cada cambio antes de avanzar
2. **Gradual**: Refactorizar un archivo a la vez
3. **Git**: Hacer commit después de cada archivo exitoso
4. **Backup**: Mantener backup antes de empezar
5. **Verificación**: Compilar después de cada cambio

---

## 🎯 Orden Recomendado

1. **Semana 1**: Refactorizar 3 controladores pequeños
2. **Semana 2**: Refactorizar 3 servicios pequeños
3. **Semana 3**: Refactorizar controladores medianos
4. **Semana 4**: Refactorizar servicios medianos
5. **Semana 5**: Refactorizar controladores grandes
6. **Semana 6**: Testing completo y ajustes finales

**Tiempo estimado total**: 6 semanas (trabajando parte del tiempo)  
**Esfuerzo**: Bajo-Medio  
**Riesgo**: Bajo (si se hace gradualmente)  
**Beneficio**: Alto

---

## 📚 Recursos Adicionales

- [BaseController.cs](Utilidades/BaseController.cs) - Código fuente
- [ServiceHelper.cs](Utilidades/ServiceHelper.cs) - Código fuente
- [C# Inheritance](https://docs.microsoft.com/dotnet/csharp/programming-guide/classes-and-structs/inheritance)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)

---

**Nota**: Esta refactorización es **OPCIONAL**. El sistema ya funciona perfectamente como está. Esta guía es solo para mejorar aún más la calidad del código si deseas invertir el tiempo.

**¿Preguntas?** Abre un issue en GitHub.
