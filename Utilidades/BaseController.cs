using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using System.Text.Json;

namespace SWGROI_Server.Utils
{
    /// <summary>
    /// Clase base para controladores con métodos comunes reutilizables
    /// </summary>
    public abstract class BaseController
    {
        /// <summary>
        /// Envía una respuesta JSON al cliente
        /// </summary>
        protected static void Json(HttpListenerResponse res, int status, object obj)
        {
            res.StatusCode = status;
            res.ContentType = "application/json";
            try
            {
                string json = JsonSerializer.Serialize(obj, new JsonSerializerOptions 
                { 
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                });
                byte[] buffer = Encoding.UTF8.GetBytes(json);
                res.ContentLength64 = buffer.Length;
                res.OutputStream.Write(buffer, 0, buffer.Length);
            }
            catch (Exception ex)
            {
                Logger.Error($"Enviando JSON: {ex.Message}");
            }
            finally
            {
                res.OutputStream.Close();
            }
        }

        /// <summary>
        /// Lee y parsea datos de formulario URL-encoded del body
        /// </summary>
        protected static Dictionary<string, string> ParsearDatos(string body)
        {
            var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (string.IsNullOrWhiteSpace(body)) return result;

            try
            {
                var parts = body.Split('&');
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
            }
            catch (Exception ex)
            {
                Logger.Error($"Parseando datos: {ex.Message}");
            }

            return result;
        }

        /// <summary>
        /// Lee el cuerpo de la petición HTTP
        /// </summary>
        protected static string LeerBody(HttpListenerRequest request)
        {
            if (!request.HasEntityBody) return string.Empty;

            try
            {
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding ?? Encoding.UTF8))
                {
                    return reader.ReadToEnd();
                }
            }
            catch (Exception ex)
            {
                Logger.Error($"Leyendo body: {ex.Message}");
                return string.Empty;
            }
        }

        /// <summary>
        /// Obtiene un valor de un diccionario con valor por defecto
        /// </summary>
        protected static string GetValue(Dictionary<string, string> dict, string key, string defaultValue = "")
        {
            return dict != null && dict.TryGetValue(key, out var value) ? value : defaultValue;
        }

        /// <summary>
        /// Valida que los campos requeridos estén presentes
        /// </summary>
        protected static bool ValidarCamposRequeridos(Dictionary<string, string> datos, params string[] campos)
        {
            if (datos == null) return false;
            
            foreach (var campo in campos)
            {
                if (!datos.ContainsKey(campo) || string.IsNullOrWhiteSpace(datos[campo]))
                {
                    return false;
                }
            }
            return true;
        }

        /// <summary>
        /// Envía una respuesta de error estandarizada
        /// </summary>
        protected static void EnviarError(HttpListenerResponse res, int status, string mensaje)
        {
            Json(res, status, new { error = true, message = mensaje });
        }

        /// <summary>
        /// Envía una respuesta de éxito estandarizada
        /// </summary>
        protected static void EnviarExito(HttpListenerResponse res, object data = null)
        {
            Json(res, 200, new { success = true, data });
        }
    }
}
