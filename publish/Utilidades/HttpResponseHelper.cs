using System;
using System.Net;

namespace SWGROI_Server_VPS.Utils
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
                context.Response.ContentType = "application/json";
                SetNoCacheHeaders(context.Response);
                
                string jsonResponse = $"{{\"error\":\"{message}\",\"code\":{statusCode}}}";
                byte[] buffer = System.Text.Encoding.UTF8.GetBytes(jsonResponse);
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
    }
}