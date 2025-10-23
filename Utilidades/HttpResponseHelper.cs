using System;
using System.Net;
using System.Text;
using System.Text.Json;

namespace SWGROI_Server.Utils
{
    public static class HttpResponseHelper
    {
        /// <summary>
        /// Cierra correctamente una respuesta HTTP garantizando la liberación de recursos
        /// </summary>
        public static void CloseResponse(HttpListenerContext context)
        {
            if (context?.Response == null) return;
            
            try
            {
                context.Response.OutputStream?.Close();
                context.Response.Close();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Warning] Error cerrando respuesta HTTP: {ex.Message}");
            }
        }
        
        /// <summary>
        /// Establece headers para evitar caché en respuestas HTML/dinámicas
        /// </summary>
        public static void SetNoCacheHeaders(HttpListenerResponse response)
        {
            if (response == null) return;
            
            response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
            response.Headers["Pragma"] = "no-cache";
            response.Headers["Expires"] = "0";
        }
        
        /// <summary>
        /// Envía una respuesta de error JSON y cierra la conexión correctamente
        /// </summary>
        public static void SendErrorResponse(HttpListenerContext context, int statusCode, string message)
        {
            if (context?.Response == null) return;
            
            try
            {
                context.Response.StatusCode = statusCode;
                context.Response.ContentType = "application/json; charset=utf-8";
                SetNoCacheHeaders(context.Response);
                
                var errorObject = new { error = message, code = statusCode };
                string jsonResponse = JsonSerializer.Serialize(errorObject);
                byte[] buffer = Encoding.UTF8.GetBytes(jsonResponse);
                context.Response.ContentLength64 = buffer.Length;
                
                using (var output = context.Response.OutputStream)
                {
                    output.Write(buffer, 0, buffer.Length);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Error] Enviando respuesta de error: {ex.Message}");
            }
        }

        /// <summary>
        /// Envía una respuesta de éxito JSON y cierra la conexión correctamente
        /// </summary>
        public static void SendSuccessResponse(HttpListenerContext context, object data, int statusCode = 200)
        {
            if (context?.Response == null) return;
            
            try
            {
                context.Response.StatusCode = statusCode;
                context.Response.ContentType = "application/json; charset=utf-8";
                SetNoCacheHeaders(context.Response);
                
                string jsonResponse = JsonSerializer.Serialize(data);
                byte[] buffer = Encoding.UTF8.GetBytes(jsonResponse);
                context.Response.ContentLength64 = buffer.Length;
                
                using (var output = context.Response.OutputStream)
                {
                    output.Write(buffer, 0, buffer.Length);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Error] Enviando respuesta de éxito: {ex.Message}");
            }
        }

        /// <summary>
        /// Envía una respuesta JSON genérica con status code personalizable
        /// </summary>
        public static void SendJsonResponse(HttpListenerContext context, object data, int statusCode = 200)
        {
            if (context?.Response == null) return;
            
            try
            {
                context.Response.StatusCode = statusCode;
                context.Response.ContentType = "application/json; charset=utf-8";
                SetNoCacheHeaders(context.Response);
                
                string jsonResponse = JsonSerializer.Serialize(data);
                byte[] buffer = Encoding.UTF8.GetBytes(jsonResponse);
                context.Response.ContentLength64 = buffer.Length;
                
                using (var output = context.Response.OutputStream)
                {
                    output.Write(buffer, 0, buffer.Length);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Error] Enviando respuesta JSON: {ex.Message}");
            }
        }

        /// <summary>
        /// Envía una respuesta de validación de error con detalles específicos
        /// </summary>
        public static void SendValidationErrorResponse(HttpListenerContext context, string field, string message)
        {
            var validationError = new 
            { 
                error = "Datos inválidos",
                code = 400,
                validation = new { field = field, message = message }
            };
            
            SendJsonResponse(context, validationError, 400);
        }
    }
}