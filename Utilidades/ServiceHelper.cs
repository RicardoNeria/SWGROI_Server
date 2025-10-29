using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using System.Text.Json;

namespace SWGROI_Server.Utils
{
    /// <summary>
    /// Clase de utilidades para servicios con métodos comunes reutilizables
    /// </summary>
    public static class ServiceHelper
    {
        /// <summary>
        /// Obtiene un valor de un diccionario de forma segura
        /// </summary>
        public static string DictGet(Dictionary<string, string> dict, string key, string defaultValue = "")
        {
            return dict != null && dict.TryGetValue(key, out var value) ? value : defaultValue;
        }

        /// <summary>
        /// Lee y parsea JSON del body de la petición
        /// </summary>
        public static Dictionary<string, string> LeerJson(HttpListenerContext ctx)
        {
            try
            {
                using (var reader = new StreamReader(ctx.Request.InputStream, ctx.Request.ContentEncoding ?? Encoding.UTF8))
                {
                    string json = reader.ReadToEnd();
                    if (string.IsNullOrWhiteSpace(json))
                        return new Dictionary<string, string>();

                    return JsonSerializer.Deserialize<Dictionary<string, string>>(json) 
                           ?? new Dictionary<string, string>();
                }
            }
            catch (Exception ex)
            {
                Logger.Error($"Leyendo JSON: {ex.Message}");
                return new Dictionary<string, string>();
            }
        }

        /// <summary>
        /// Envía una respuesta JSON al cliente
        /// </summary>
        public static void EnviarJson(HttpListenerContext ctx, int statusCode, object data)
        {
            ctx.Response.StatusCode = statusCode;
            ctx.Response.ContentType = "application/json; charset=utf-8";
            
            try
            {
                string json = JsonSerializer.Serialize(data, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                });

                byte[] buffer = Encoding.UTF8.GetBytes(json);
                ctx.Response.ContentLength64 = buffer.Length;
                ctx.Response.OutputStream.Write(buffer, 0, buffer.Length);
            }
            catch (Exception ex)
            {
                Logger.Error($"Enviando JSON: {ex.Message}");
            }
            finally
            {
                ctx.Response.OutputStream.Close();
            }
        }

        /// <summary>
        /// Envía una respuesta de error estandarizada
        /// </summary>
        public static void EnviarError(HttpListenerContext ctx, int statusCode, string mensaje)
        {
            EnviarJson(ctx, statusCode, new { error = true, message = mensaje });
        }

        /// <summary>
        /// Envía una respuesta de éxito estandarizada
        /// </summary>
        public static void EnviarExito(HttpListenerContext ctx, object data = null)
        {
            EnviarJson(ctx, 200, new { success = true, data });
        }

        /// <summary>
        /// Valida que los campos requeridos estén presentes en el diccionario
        /// </summary>
        public static bool ValidarCamposRequeridos(Dictionary<string, string> datos, out string campoFaltante, params string[] campos)
        {
            campoFaltante = null;
            
            if (datos == null)
            {
                campoFaltante = "datos";
                return false;
            }

            foreach (var campo in campos)
            {
                if (!datos.ContainsKey(campo) || string.IsNullOrWhiteSpace(datos[campo]))
                {
                    campoFaltante = campo;
                    return false;
                }
            }
            
            return true;
        }

        /// <summary>
        /// Parsea parámetros de query string
        /// </summary>
        public static Dictionary<string, string> ParsearQueryString(string query)
        {
            var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            
            if (string.IsNullOrWhiteSpace(query))
                return result;

            query = query.TrimStart('?');
            var parts = query.Split('&');

            foreach (var part in parts)
            {
                var kv = part.Split('=');
                if (kv.Length == 2)
                {
                    string key = Uri.UnescapeDataString(kv[0]);
                    string value = Uri.UnescapeDataString(kv[1]);
                    result[key] = value;
                }
            }

            return result;
        }
    }
}
