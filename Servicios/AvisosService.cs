using System;
using System.Collections.Generic;
using System.Net;
using System.Text;
using MySql.Data.MySqlClient;
using SWGROI_Server.DB;
using SWGROI_Server.Models;
using SWGROI_Server.Utils;
using SWGROI_Server.Infrastructure;

namespace SWGROI_Server.Services
{
    /// <summary>
    /// Servicio de negocio para el módulo de Avisos.
    /// Encapsula lógica de acceso a datos, validaciones y armado de respuestas.
    /// </summary>
    public static class AvisosService
    {
        // Límites de validación
        private const int MaxAsunto = 255;
        private const int MaxMensaje = 2000;

        // ==========================
        // LISTAR
        // ==========================
        public static void Listar(HttpListenerContext context)
        {
            try
            {
                var avisos = new List<AvisoEntidad>();

                string filtroFecha = context.Request.QueryString["fecha"] ?? string.Empty; // legado
                string filtroAsunto = context.Request.QueryString["asunto"] ?? string.Empty;
                string desde = context.Request.QueryString["desde"] ?? string.Empty;
                string hasta = context.Request.QueryString["hasta"] ?? string.Empty;

                int page = ParseInt(context.Request.QueryString["page"], 1);
                int pageSize = Clamp(ParseInt(context.Request.QueryString["pageSize"], 10), 5, 100);
                string sort = (context.Request.QueryString["sort"] ?? "Fecha").Trim();
                string dir = (context.Request.QueryString["dir"] ?? "DESC").Trim().ToUpperInvariant();
                bool exportCsv = string.Equals(context.Request.QueryString["export"], "csv", StringComparison.OrdinalIgnoreCase);

                string orderBy = MapSort(sort) + (dir == "ASC" ? " ASC" : " DESC");

                long total;
                using var conexion = new MySqlConnection(ConexionBD.CadenaConexion);
                conexion.Open();

                // WHERE dinámico
                var where = new List<string>();
                if (!string.IsNullOrWhiteSpace(filtroFecha)) where.Add("DATE(Fecha) = @Fecha");
                if (!string.IsNullOrWhiteSpace(filtroAsunto)) where.Add("Asunto LIKE @Asunto");
                if (!string.IsNullOrWhiteSpace(desde)) where.Add("DATE(Fecha) >= @Desde");
                if (!string.IsNullOrWhiteSpace(hasta)) where.Add("DATE(Fecha) <= @Hasta");
                string whereSql = where.Count > 0 ? (" WHERE " + string.Join(" AND ", where)) : string.Empty;

                // Total
                using (var cmdCount = new MySqlCommand($"SELECT COUNT(*) FROM avisos{whereSql}", conexion))
                {
                    if (!string.IsNullOrWhiteSpace(filtroFecha)) cmdCount.Parameters.AddWithValue("@Fecha", filtroFecha);
                    if (!string.IsNullOrWhiteSpace(filtroAsunto)) cmdCount.Parameters.AddWithValue("@Asunto", "%" + filtroAsunto + "%");
                    if (!string.IsNullOrWhiteSpace(desde)) cmdCount.Parameters.AddWithValue("@Desde", desde);
                    if (!string.IsNullOrWhiteSpace(hasta)) cmdCount.Parameters.AddWithValue("@Hasta", hasta);
                    total = Convert.ToInt64(cmdCount.ExecuteScalar());
                }

                int offset = Math.Max(0, (page - 1) * pageSize);
                string sql = $"SELECT Id, Fecha, Asunto, Mensaje FROM avisos{whereSql} ORDER BY {orderBy} LIMIT {pageSize} OFFSET {offset}";
                using (var cmd = new MySqlCommand(sql, conexion))
                {
                    if (!string.IsNullOrWhiteSpace(filtroFecha)) cmd.Parameters.AddWithValue("@Fecha", filtroFecha);
                    if (!string.IsNullOrWhiteSpace(filtroAsunto)) cmd.Parameters.AddWithValue("@Asunto", "%" + filtroAsunto + "%");
                    if (!string.IsNullOrWhiteSpace(desde)) cmd.Parameters.AddWithValue("@Desde", desde);
                    if (!string.IsNullOrWhiteSpace(hasta)) cmd.Parameters.AddWithValue("@Hasta", hasta);

                    using var rdr = cmd.ExecuteReader();
                    while (rdr.Read())
                    {
                        avisos.Add(new AvisoEntidad
                        {
                            Id = Convert.ToInt32(rdr["Id"]),
                            Fecha = Convert.ToDateTime(rdr["Fecha"]).ToString("yyyy-MM-dd HH:mm"),
                            Asunto = rdr["Asunto"].ToString(),
                            Mensaje = rdr["Mensaje"].ToString()
                        });
                    }
                }

                if (exportCsv)
                {
                    ExportarCsv(context, avisos);
                    return;
                }

                int requestedPageSize = Clamp(ParseInt(context.Request.QueryString["pageSize"], 0), 0, 100);
                int pageOut, pageSizeOut;
                if (requestedPageSize == 0)
                {
                    pageOut = 1; pageSizeOut = avisos.Count;
                }
                else
                {
                    pageOut = page; pageSizeOut = pageSize;
                }

                var resultado = new { items = avisos, total = total, page = pageOut, pageSize = pageSizeOut };
                HttpResponseHelper.SendSuccessResponse(context, resultado);
            }
            catch (Exception ex)
            {
                Logger.Error($"Error listando avisos: {ex.Message}");
                HttpResponseHelper.SendErrorResponse(context, 500, "Error interno al listar avisos");
            }
        }

        private static void ExportarCsv(HttpListenerContext context, List<AvisoEntidad> avisos)
        {
            var sbCsv = new StringBuilder();
            sbCsv.AppendLine("Id,Fecha,Asunto,Mensaje");
            foreach (var a in avisos)
            {
                sbCsv.Append(a.Id).Append(',')
                     .Append('"').Append((a.Fecha ?? string.Empty).Replace("\"", "\"\"")).Append('"').Append(',')
                     .Append('"').Append((a.Asunto ?? string.Empty).Replace("\"", "\"\"")).Append('"').Append(',')
                     .Append('"').Append((a.Mensaje ?? string.Empty).Replace("\"", "\"\"")).Append('"').Append('\n');
            }
            string csv = sbCsv.ToString();
            context.Response.StatusCode = 200;
            context.Response.ContentType = "text/csv; charset=utf-8";
            byte[] buffer = Encoding.UTF8.GetBytes(csv);
            context.Response.ContentLength64 = buffer.Length;
            context.Response.OutputStream.Write(buffer, 0, buffer.Length);
            context.Response.OutputStream.Close();
        }

        // ==========================
        // CREAR
        // ==========================
        public static void Crear(HttpListenerContext context, Dictionary<string, string> campos)
        {
            try
            {
                string asunto = (Obtener(campos, "asunto") ?? string.Empty).Trim();
                string mensaje = (Obtener(campos, "mensaje") ?? string.Empty).Trim();

                if (!ValidarAviso(context, asunto, mensaje)) return;

                int nuevoId;
                using var conexion = new MySqlConnection(ConexionBD.CadenaConexion);
                conexion.Open();
                try { var user = Security.SessionManager.GetUser(context.Request); AuditContext.ApplyAuditContext(conexion, user?.user ?? "", context.Request.RemoteEndPoint?.Address?.ToString()); } catch {}
                using (var cmd = new MySqlCommand("INSERT INTO avisos (Fecha, Asunto, Mensaje) VALUES (NOW(), @Asunto, @Mensaje); SELECT LAST_INSERT_ID();", conexion))
                {
                    cmd.Parameters.AddWithValue("@Asunto", asunto);
                    cmd.Parameters.AddWithValue("@Mensaje", mensaje);
                    nuevoId = Convert.ToInt32(cmd.ExecuteScalar());
                }

                try { var u = Security.SessionManager.GetUser(context.Request); int? idU = u.HasValue?Infrastructure.AuditLogger.TryResolveUserId(u.Value.user):(int?)null; var c = Infrastructure.AuditLogger.Client(context.Request); _=Infrastructure.AuditLogger.LogAsync(idU, context.Request.HttpMethod, "/avisos", "avisos", "Crear", nuevoId.ToString(), "OK", "Alta de aviso", c.ip, c.ua);} catch {}
                HttpResponseHelper.SendSuccessResponse(context, new { mensaje = "Aviso publicado correctamente", id = nuevoId }, 201);
            }
            catch (Exception ex)
            {
                Logger.Error($"Error creando aviso: {ex.Message}");
                HttpResponseHelper.SendErrorResponse(context, 500, "Error interno al crear aviso");
            }
        }

        // ==========================
        // ACTUALIZAR
        // ==========================
        public static void Actualizar(HttpListenerContext context, int id, Dictionary<string, string> campos)
        {
            try
            {
                string asunto = (Obtener(campos, "asunto") ?? string.Empty).Trim();
                string mensaje = (Obtener(campos, "mensaje") ?? string.Empty).Trim();
                if (!ValidarAviso(context, asunto, mensaje)) return;

                int afectadas;
                using var conexion = new MySqlConnection(ConexionBD.CadenaConexion);
                conexion.Open();
                try { var user = Security.SessionManager.GetUser(context.Request); AuditContext.ApplyAuditContext(conexion, user?.user ?? "", context.Request.RemoteEndPoint?.Address?.ToString()); } catch {}
                using (var cmd = new MySqlCommand("UPDATE avisos SET Asunto=@Asunto, Mensaje=@Mensaje WHERE Id=@Id", conexion))
                {
                    cmd.Parameters.AddWithValue("@Asunto", asunto);
                    cmd.Parameters.AddWithValue("@Mensaje", mensaje);
                    cmd.Parameters.AddWithValue("@Id", id);
                    afectadas = cmd.ExecuteNonQuery();
                }

                if (afectadas > 0)
                {
                    try { var u = Security.SessionManager.GetUser(context.Request); int? idU = u.HasValue?Infrastructure.AuditLogger.TryResolveUserId(u.Value.user):(int?)null; var c = Infrastructure.AuditLogger.Client(context.Request); _=Infrastructure.AuditLogger.LogAsync(idU, context.Request.HttpMethod, "/avisos", "avisos", "Actualizar", id.ToString(), "OK", "Actualización de aviso", c.ip, c.ua);} catch {}
                    HttpResponseHelper.SendSuccessResponse(context, new { mensaje = "Aviso actualizado" }, 200);
                }
                else
                {
                    HttpResponseHelper.SendErrorResponse(context, 404, "Aviso no encontrado");
                }
            }
            catch (Exception ex)
            {
                Logger.Error($"Error actualizando aviso: {ex.Message}");
                HttpResponseHelper.SendErrorResponse(context, 500, "Error interno al actualizar aviso");
            }
        }

        // ==========================
        // ELIMINAR
        // ==========================
        public static void Eliminar(HttpListenerContext context, int id)
        {
            try
            {
                using var conexion = new MySqlConnection(ConexionBD.CadenaConexion);
                conexion.Open();
                try { var user = Security.SessionManager.GetUser(context.Request); AuditContext.ApplyAuditContext(conexion, user?.user ?? "", context.Request.RemoteEndPoint?.Address?.ToString()); } catch {}
                int afectadas;
                using (var cmd = new MySqlCommand("DELETE FROM avisos WHERE Id = @Id", conexion))
                {
                    cmd.Parameters.AddWithValue("@Id", id);
                    afectadas = cmd.ExecuteNonQuery();
                }

                if (afectadas > 0)
                {
                    try { var u = Security.SessionManager.GetUser(context.Request); int? idU = u.HasValue?Infrastructure.AuditLogger.TryResolveUserId(u.Value.user):(int?)null; var c = Infrastructure.AuditLogger.Client(context.Request); _=Infrastructure.AuditLogger.LogAsync(idU, context.Request.HttpMethod, "/avisos", "avisos", "Eliminar", id.ToString(), "OK", "Eliminación de aviso", c.ip, c.ua);} catch {}
                    HttpResponseHelper.SendSuccessResponse(context, new { mensaje = "Aviso eliminado" }, 200);
                }
                else
                {
                    HttpResponseHelper.SendErrorResponse(context, 404, "Aviso no encontrado");
                }
            }
            catch (Exception ex)
            {
                Logger.Error($"Error eliminando aviso: {ex.Message}");
                HttpResponseHelper.SendErrorResponse(context, 500, "Error interno al eliminar aviso");
            }
        }

        // ==========================
        // HELPERS
        // ==========================
        private static bool ValidarAviso(HttpListenerContext context, string asunto, string mensaje)
        {
            if (string.IsNullOrWhiteSpace(asunto) || string.IsNullOrWhiteSpace(mensaje))
            {
                HttpResponseHelper.SendErrorResponse(context, 400, "Asunto y Mensaje son obligatorios");
                return false;
            }
            if (asunto.Length > MaxAsunto || mensaje.Length > MaxMensaje)
            {
                HttpResponseHelper.SendErrorResponse(context, 400, $"Límites superados: Asunto({MaxAsunto}), Mensaje({MaxMensaje})");
                return false;
            }
            return true;
        }

        private static int ParseInt(string s, int def) => int.TryParse(s, out var v) ? v : def;
        private static int Clamp(int v, int min, int max) => v < min ? min : (v > max ? max : v);
        private static string MapSort(string sort)
        {
            switch ((sort ?? "").Trim().ToLowerInvariant())
            {
                case "id": return "Id";
                case "asunto": return "Asunto";
                case "fecha": default: return "Fecha";
            }
        }
        private static string Obtener(Dictionary<string, string> d, string key)
        {
            if (d == null) return null;
            return d.TryGetValue(key, out var v) ? v : null;
        }
    }
}
