using System;
using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using MySql.Data.MySqlClient;
using SWGROI_Server.DB;
using SWGROI_Server.Security;
using SWGROI_Server.Utils;
using SWGROI_Server.Infrastructure;

namespace SWGROI_Server.Services
{
    /// <summary>
    /// Servicio de negocio para el módulo de retroalimentación
    /// Contiene toda la lógica de negocio y validaciones críticas
    /// </summary>
    public static class RetroalimentacionService
    {
        // ================================
        // CONSTANTES DE VALIDACIÓN
        // ================================
        
        private const int MAX_COMMENT_LENGTH = 1000;
        private const int MIN_SCALE_VALUE = 1;
        private const int MAX_SCALE_VALUE = 5;
        
        // ================================
        // OBTENER FORMULARIO
        // ================================
        
        /// <summary>
        /// Obtiene el formulario de retroalimentación por token
        /// </summary>
        public static void ObtenerFormulario(HttpListenerContext context, string token)
        {
            try
            {
                // Validación crítica del token
                if (string.IsNullOrWhiteSpace(token))
                {
                    HttpResponseHelper.SendErrorResponse(context, 400, "Token requerido para acceder al formulario");
                    return;
                }

                using var conn = new MySqlConnection(ConexionBD.CadenaConexion);
                conn.Open();
                
                string sql = @"SELECT r.RetroID, r.Cliente, t.Folio,
                              (SELECT COUNT(*) FROM respuestas_retroalimentacion rr WHERE rr.RetroID = r.RetroID) > 0 as Contestada
                              FROM retroalimentacion r
                              LEFT JOIN tickets t ON t.Id = r.TicketID
                              WHERE r.EnlaceUnico = @token";
                
                using var cmd = new MySqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@token", token);
                
                using var reader = cmd.ExecuteReader();
                if (!reader.Read())
                {
                    HttpResponseHelper.SendErrorResponse(context, 404, "Enlace inválido o expirado");
                    return;
                }

                var respuesta = new {
                    retroId = reader.GetInt32("RetroID"),
                    cliente = reader["Cliente"]?.ToString() ?? "Cliente",
                    folio = reader["Folio"]?.ToString() ?? "Sin folio",
                    contestada = reader.GetBoolean("Contestada"),
                    preguntas = new[]
                    {
                        new { numero = 1, texto = "¿Cómo califica la atención brindada por nuestro operador CCC?", tipo = "escala" },
                        new { numero = 2, texto = "¿Cómo evalúa el tiempo de respuesta a su solicitud?", tipo = "escala" },
                        new { numero = 3, texto = "¿La solución brindada resolvió completamente su necesidad?", tipo = "escala" },
                        new { numero = 4, texto = "¿Recomendaría nuestro servicio CCC a otras personas?", tipo = "escala" },
                        new { numero = 5, texto = "Comentarios adicionales para mejorar nuestro servicio:", tipo = "texto" }
                    }
                };

                HttpResponseHelper.SendSuccessResponse(context, respuesta);
            }
            catch (Exception ex)
            {
                Logger.Error($"Error obteniendo formulario de retroalimentación: {ex.Message}");
                HttpResponseHelper.SendErrorResponse(context, 500, "Error interno al cargar el formulario");
            }
        }

        // ================================
        // GUARDAR RESPUESTAS
        // ================================
        
        /// <summary>
        /// Guarda las respuestas de retroalimentación
        /// </summary>
        public static void GuardarRespuestas(HttpListenerContext context, string token, Dictionary<string, string> respuestas)
        {
            try
            {
                // Validación crítica del token
                if (string.IsNullOrWhiteSpace(token))
                {
                    HttpResponseHelper.SendErrorResponse(context, 400, "Token requerido para enviar respuestas");
                    return;
                }

                // Validación crítica de respuestas
                if (respuestas == null || respuestas.Count == 0)
                {
                    HttpResponseHelper.SendErrorResponse(context, 400, "Respuestas requeridas");
                    return;
                }

                // Validar contenido de respuestas
                if (!ValidarRespuestas(context, respuestas))
                {
                    return; // El método ya envió la respuesta de error
                }

                using var conn = new MySqlConnection(ConexionBD.CadenaConexion);
                conn.Open();
                
                // Obtener ID de retroalimentación
                int retroId = 0;
                string sql1 = "SELECT RetroID FROM retroalimentacion WHERE EnlaceUnico = @token";
                using (var cmd1 = new MySqlCommand(sql1, conn))
                {
                    cmd1.Parameters.AddWithValue("@token", token);
                    var result = cmd1.ExecuteScalar();
                    if (result == null)
                    {
                        HttpResponseHelper.SendErrorResponse(context, 404, "Token inválido o enlace expirado");
                        return;
                    }
                    retroId = Convert.ToInt32(result);
                }

                // Verificar si ya fue contestada
                string sql2 = "SELECT COUNT(*) FROM respuestas_retroalimentacion WHERE RetroID = @retroId";
                using (var cmd2 = new MySqlCommand(sql2, conn))
                {
                    cmd2.Parameters.AddWithValue("@retroId", retroId);
                    int count = Convert.ToInt32(cmd2.ExecuteScalar());
                    if (count > 0)
                    {
                        HttpResponseHelper.SendErrorResponse(context, 409, "Esta encuesta ya fue contestada anteriormente");
                        return;
                    }
                }

                // Insertar respuestas
                string sql3 = @"INSERT INTO respuestas_retroalimentacion 
                               (RetroID, Pregunta1_Atencion_Operador, Pregunta2_Tiempo_Respuesta, 
                                Pregunta3_Solucion_Brindada, Pregunta4_Recomendacion, Pregunta5_Comentarios, FechaRespuesta)
                               VALUES (@retroId, @r1, @r2, @r3, @r4, @r5, NOW())";
                
                using var cmd3 = new MySqlCommand(sql3, conn);
                cmd3.Parameters.AddWithValue("@retroId", retroId);
                cmd3.Parameters.AddWithValue("@r1", ObtenerValorSeguro(respuestas, "r1"));
                cmd3.Parameters.AddWithValue("@r2", ObtenerValorSeguro(respuestas, "r2"));
                cmd3.Parameters.AddWithValue("@r3", ObtenerValorSeguro(respuestas, "r3"));
                cmd3.Parameters.AddWithValue("@r4", ObtenerValorSeguro(respuestas, "r4"));
                cmd3.Parameters.AddWithValue("@r5", ObtenerValorSeguro(respuestas, "r5"));
                
                int filasAfectadas = cmd3.ExecuteNonQuery();
                
                if (filasAfectadas > 0)
                {
                    // Registrar actividad de auditoría
                    var (ip, ua) = AuditLogger.Client(context.Request);
                    _ = Task.Run(() => AuditLogger.LogAsync(null, "POST", "/retroalimentacion", 
                        "respuestas_retroalimentacion", "INSERT", $"RetroID:{retroId}", 
                        "SUCCESS", "Respuestas guardadas exitosamente", ip, ua));
                    
                    HttpResponseHelper.SendSuccessResponse(context, new { 
                        mensaje = "Respuestas guardadas exitosamente",
                        retroId = retroId,
                        fecha = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")
                    }, 201);
                }
                else
                {
                    HttpResponseHelper.SendErrorResponse(context, 500, "No se pudieron guardar las respuestas");
                }
            }
            catch (Exception ex)
            {
                Logger.Error($"Error guardando respuestas de retroalimentación: {ex.Message}");
                HttpResponseHelper.SendErrorResponse(context, 500, "Error interno al guardar respuestas");
            }
        }

        // ================================
        // GENERAR ENLACE
        // ================================
        
        /// <summary>
        /// Genera enlace de retroalimentación para un ticket
        /// </summary>
        public static void GenerarEnlace(HttpListenerContext context, string folio, string baseUrl, int? usuarioId)
        {
            try
            {
                // Validación crítica del folio
                if (string.IsNullOrWhiteSpace(folio))
                {
                    HttpResponseHelper.SendErrorResponse(context, 400, "Folio de ticket requerido para generar enlace");
                    return;
                }

                using var conn = new MySqlConnection(ConexionBD.CadenaConexion);
                conn.Open();

                // Verificar que el ticket existe
                int ticketId = 0;
                string cliente = "";
                string sql1 = "SELECT Id, COALESCE(RazonSocial, Cuenta, 'Cliente') AS Cliente FROM tickets WHERE Folio = @folio";
                using (var cmd1 = new MySqlCommand(sql1, conn))
                {
                    cmd1.Parameters.AddWithValue("@folio", folio);
                    using var reader = cmd1.ExecuteReader();
                    if (!reader.Read())
                    {
                        HttpResponseHelper.SendErrorResponse(context, 404, $"No se encontró el ticket con folio: {folio}");
                        return;
                    }
                    ticketId = reader.GetInt32("Id");
                    cliente = reader["Cliente"]?.ToString() ?? "Cliente";
                }

                // Verificar si ya existe enlace
                string enlaceExistente = null;
                bool contestada = false;
                string sql2 = @"SELECT r.EnlaceUnico, 
                               (SELECT COUNT(*) FROM respuestas_retroalimentacion rr WHERE rr.RetroID = r.RetroID) > 0 as Contestada
                               FROM retroalimentacion r WHERE r.TicketID = @ticketId";
                
                using (var cmd2 = new MySqlCommand(sql2, conn))
                {
                    cmd2.Parameters.AddWithValue("@ticketId", ticketId);
                    using var reader = cmd2.ExecuteReader();
                    if (reader.Read())
                    {
                        enlaceExistente = reader["EnlaceUnico"]?.ToString();
                        contestada = reader.GetBoolean("Contestada");
                    }
                }

                string token;
                if (enlaceExistente != null)
                {
                    token = enlaceExistente;
                }
                else
                {
                    token = GenerarTokenSeguro();
                    
                    string sql3 = @"INSERT INTO retroalimentacion (Cliente, EnlaceUnico, UsuarioID, TicketID, FechaCreacion, Estado)
                                   VALUES (@cliente, @token, @usuarioId, @ticketId, NOW(), 'Pendiente')";
                    
                    using var cmd3 = new MySqlCommand(sql3, conn);
                    cmd3.Parameters.AddWithValue("@cliente", cliente);
                    cmd3.Parameters.AddWithValue("@token", token);
                    cmd3.Parameters.AddWithValue("@usuarioId", usuarioId.HasValue ? (object)usuarioId.Value : DBNull.Value);
                    cmd3.Parameters.AddWithValue("@ticketId", ticketId);
                    
                    cmd3.ExecuteNonQuery();
                    
                    // Registrar actividad de auditoría
                    var (ip, ua) = AuditLogger.Client(context.Request);
                    _ = Task.Run(() => AuditLogger.LogAsync(null, "POST", "/retroalimentacion/generar-enlace", 
                        "tickets", "UPDATE", $"Folio:{folio}", 
                        "SUCCESS", $"Enlace generado para ticket: {folio}", ip, ua));
                }

                string enlaceCompleto = $"{baseUrl}/retroalimentacion.html?t={Uri.EscapeDataString(token)}";

                HttpResponseHelper.SendSuccessResponse(context, new { 
                    link = enlaceCompleto, 
                    contestada = contestada,
                    folio = folio,
                    cliente = cliente,
                    token = token
                });
            }
            catch (Exception ex)
            {
                Logger.Error($"Error generando enlace de retroalimentación: {ex.Message}");
                HttpResponseHelper.SendErrorResponse(context, 500, "Error interno al generar enlace");
            }
        }

        // ================================
        // BUSCAR RESPUESTAS
        // ================================
        
        /// <summary>
        /// Busca respuestas de retroalimentación por folio de ticket
        /// </summary>
        public static void BuscarRespuestas(HttpListenerContext context, string folio)
        {
            try
            {
                // Validación crítica del folio
                if (string.IsNullOrWhiteSpace(folio))
                {
                    HttpResponseHelper.SendErrorResponse(context, 400, "Folio de ticket requerido para buscar respuestas");
                    return;
                }

                using var conn = new MySqlConnection(ConexionBD.CadenaConexion);
                conn.Open();

                string sql = @"SELECT r.Cliente, r.EnlaceUnico, t.Folio,
                              rr.Pregunta1_Atencion_Operador, rr.Pregunta2_Tiempo_Respuesta,
                              rr.Pregunta3_Solucion_Brindada, rr.Pregunta4_Recomendacion,
                              rr.Pregunta5_Comentarios, rr.FechaRespuesta
                              FROM retroalimentacion r
                              LEFT JOIN tickets t ON t.Id = r.TicketID
                              LEFT JOIN respuestas_retroalimentacion rr ON rr.RetroID = r.RetroID
                              WHERE t.Folio = @folio";

                using var cmd = new MySqlCommand(sql, conn);
                cmd.Parameters.AddWithValue("@folio", folio);

                using var reader = cmd.ExecuteReader();
                if (!reader.Read())
                {
                    HttpResponseHelper.SendErrorResponse(context, 404, $"No se encontraron datos de retroalimentación para el ticket: {folio}");
                    return;
                }

                var respuesta = new
                {
                    folio = folio,
                    cliente = reader["Cliente"]?.ToString() ?? "Cliente",
                    enlace = reader["EnlaceUnico"]?.ToString() ?? "",
                    fechaRespuesta = reader["FechaRespuesta"] == DBNull.Value ? null : 
                                   ((DateTime)reader["FechaRespuesta"]).ToString("yyyy-MM-dd HH:mm"),
                    r1 = reader["Pregunta1_Atencion_Operador"]?.ToString() ?? "",
                    r2 = reader["Pregunta2_Tiempo_Respuesta"]?.ToString() ?? "",
                    r3 = reader["Pregunta3_Solucion_Brindada"]?.ToString() ?? "",
                    r4 = reader["Pregunta4_Recomendacion"]?.ToString() ?? "",
                    r5 = reader["Pregunta5_Comentarios"]?.ToString() ?? ""
                };

                HttpResponseHelper.SendSuccessResponse(context, respuesta);
            }
            catch (Exception ex)
            {
                Logger.Error($"Error buscando respuestas de retroalimentación: {ex.Message}");
                HttpResponseHelper.SendErrorResponse(context, 500, "Error interno al buscar respuestas");
            }
        }

        // ================================
        // MÉTODOS AUXILIARES PRIVADOS
        // ================================
        
        /// <summary>
        /// Valida las respuestas antes de guardarlas
        /// </summary>
        private static bool ValidarRespuestas(HttpListenerContext context, Dictionary<string, string> respuestas)
        {
            // Validar preguntas obligatorias (1-4)
            for (int i = 1; i <= 4; i++)
            {
                string key = $"r{i}";
                if (!respuestas.ContainsKey(key) || string.IsNullOrWhiteSpace(respuestas[key]))
                {
                    HttpResponseHelper.SendValidationErrorResponse(context, key, $"La pregunta {i} es obligatoria");
                    return false;
                }

                // Validar rango de valores (1-5)
                if (!int.TryParse(respuestas[key], out int valor) || valor < MIN_SCALE_VALUE || valor > MAX_SCALE_VALUE)
                {
                    HttpResponseHelper.SendValidationErrorResponse(context, key, $"La respuesta de la pregunta {i} debe ser un valor entre {MIN_SCALE_VALUE} y {MAX_SCALE_VALUE}");
                    return false;
                }
            }

            // Validar comentarios (opcional pero con límites)
            if (respuestas.ContainsKey("r5") && !string.IsNullOrWhiteSpace(respuestas["r5"]))
            {
                string comentarios = respuestas["r5"];
                if (comentarios.Length > MAX_COMMENT_LENGTH)
                {
                    HttpResponseHelper.SendValidationErrorResponse(context, "r5", $"Los comentarios no pueden exceder {MAX_COMMENT_LENGTH} caracteres");
                    return false;
                }

                // Validar contenido peligroso
                if (ContieneContenidoPeligroso(comentarios))
                {
                    HttpResponseHelper.SendValidationErrorResponse(context, "r5", "Los comentarios contienen contenido no permitido");
                    return false;
                }
            }

            return true;
        }

        /// <summary>
        /// Obtiene un valor de manera segura del diccionario
        /// </summary>
        private static string ObtenerValorSeguro(Dictionary<string, string> dict, string key)
        {
            if (dict != null && dict.TryGetValue(key, out var valor))
            {
                return valor?.Trim() ?? "";
            }
            return "";
        }

        /// <summary>
        /// Genera un token seguro para enlaces
        /// </summary>
        private static string GenerarTokenSeguro()
        {
            return Convert.ToBase64String(Guid.NewGuid().ToByteArray())
                          .TrimEnd('=')
                          .Replace('+', '-')
                          .Replace('/', '_');
        }

        /// <summary>
        /// Verifica si el contenido contiene elementos peligrosos
        /// </summary>
        private static bool ContieneContenidoPeligroso(string contenido)
        {
            if (string.IsNullOrWhiteSpace(contenido)) return false;
            
            // Buscar patrones peligrosos
            string contenidoLower = contenido.ToLowerInvariant();
            
            string[] patronesPeligrosos = {
                "<script", "javascript:", "on\\w+=", "eval(", "expression(",
                "data:text/html", "vbscript:", "<iframe", "<object", "<embed"
            };
            
            foreach (var patron in patronesPeligrosos)
            {
                if (contenidoLower.Contains(patron.ToLowerInvariant()))
                {
                    return true;
                }
            }
            
            return false;
        }
    }
}