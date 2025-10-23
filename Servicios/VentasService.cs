using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Linq;
using ClosedXML.Excel;
using MySql.Data.MySqlClient;
using SWGROI_Server.DB;
using SWGROI_Server.Models;
using SWGROI_Server.Utils;

namespace SWGROI_Server.Services
{
    public static class VentasService
    {
        private static string DictGet(Dictionary<string, string> d, string key)
            => d != null && d.TryGetValue(key, out var v) ? v : null;

        private static Dictionary<string, string> LeerJson(HttpListenerContext ctx)
        {
            using var r = new StreamReader(ctx.Request.InputStream);
            var body = r.ReadToEnd();
            return string.IsNullOrWhiteSpace(body) ? new Dictionary<string, string>() :
                (JsonSerializer.Deserialize<Dictionary<string, string>>(body) ?? new Dictionary<string, string>());
        }

        public static void ConsultarTicket(HttpListenerContext ctx)
        {
            string folio = GetQuery(ctx.Request.Url.Query, "folio");
            if (string.IsNullOrWhiteSpace(folio)) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="bad_request", message="folio requerido" }, 400); return; }
            var ticket = ObtenerDatosTicketPorFolio(folio);
            if (ticket == null) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="not_found", message="folio no encontrado en tickets" }, 404); return; }
            HttpResponseHelper.SendJsonResponse(ctx, ticket);
        }

        public static void PorTicket(HttpListenerContext ctx)
        {
            string folio = GetQuery(ctx.Request.Url.Query, "folio");
            string ov = GetQuery(ctx.Request.Url.Query, "ovsr3");
            using var cn = new MySqlConnection(ConexionBD.CadenaConexion);
            cn.Open();

                        if (!string.IsNullOrWhiteSpace(ov))
                        {
                                const string byOv = @"
SELECT v.OVSR3, t.Folio, v.Monto, ec.Nombre AS Estado,
         v.EstadoOVSR3 AS EstadoOVSR3,
             v.Cuenta, v.RazonSocial, v.Domicilio, v.FechaAtencion,
             v.AgenteResponsable, v.Descripcion, v.ComentariosCotizacion
FROM ventasdetalle v
JOIN cotizaciones c ON v.CotizacionID=c.CotizacionID
JOIN tickets t       ON c.TicketID=t.Id
LEFT JOIN estadoscotizacion ec ON c.EstadoCotizacionID=ec.EstadoCotizacionID
WHERE v.OVSR3=@ov
ORDER BY v.CotizacionID DESC, v.Fecha DESC
LIMIT 1";
                using var cmd = new MySqlCommand(byOv, cn);
                cmd.Parameters.AddWithValue("@ov", ov);
                using var rd = cmd.ExecuteReader();
                if (!rd.Read()) { HttpResponseHelper.SendJsonResponse(ctx, new { }); return; }
                HttpResponseHelper.SendJsonResponse(ctx, new
                {
                    ovsr3 = rd["OVSR3"]?.ToString() ?? "",
                    folioTicket = rd["Folio"]?.ToString() ?? "",
                    monto = rd["Monto"] == DBNull.Value ? 0m : Convert.ToDecimal(rd["Monto"]),
                    estado = rd["Estado"]?.ToString() ?? "",
                    estadoOvsr3 = rd["EstadoOVSR3"]?.ToString() ?? "",
                    cuenta = rd["Cuenta"]?.ToString() ?? "",
                    razonSocial = rd["RazonSocial"]?.ToString() ?? "",
                    domicilio = rd["Domicilio"]?.ToString() ?? "",
                    fechaAtencion = rd["FechaAtencion"] == DBNull.Value ? "" : Convert.ToDateTime(rd["FechaAtencion"]).ToString("yyyy-MM-dd"),
                    agenteResponsable = rd["AgenteResponsable"] == DBNull.Value ? "" : rd["AgenteResponsable"].ToString(),
                    descripcion = rd["Descripcion"] == DBNull.Value ? "" : rd["Descripcion"].ToString(),
                    comentariosCotizacion = rd["ComentariosCotizacion"] == DBNull.Value ? "" : rd["ComentariosCotizacion"].ToString()
                });
                return;
            }

            if (string.IsNullOrWhiteSpace(folio)) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="bad_request", message="folio u ovsr3 requerido" }, 400); return; }

                        const string sql = @"
SELECT v.OVSR3, v.Monto, ec.Nombre AS Estado,
         v.EstadoOVSR3 AS EstadoOVSR3,
             v.Cuenta, v.RazonSocial, v.Domicilio, v.FechaAtencion,
             v.AgenteResponsable, v.Descripcion, v.ComentariosCotizacion
FROM ventasdetalle v
JOIN cotizaciones c ON v.CotizacionID=c.CotizacionID
JOIN tickets t       ON c.TicketID=t.Id
LEFT JOIN estadoscotizacion ec ON c.EstadoCotizacionID=ec.EstadoCotizacionID
WHERE t.Folio=@f
ORDER BY v.CotizacionID DESC, v.Fecha DESC
LIMIT 1";
            using var cmd2 = new MySqlCommand(sql, cn);
            cmd2.Parameters.AddWithValue("@f", folio);
            using var rd2 = cmd2.ExecuteReader();
            if (!rd2.Read()) { HttpResponseHelper.SendJsonResponse(ctx, new { }); return; }
            HttpResponseHelper.SendJsonResponse(ctx, new
            {
                ovsr3 = rd2["OVSR3"]?.ToString() ?? "",
                folioTicket = folio,
                monto = rd2["Monto"] == DBNull.Value ? 0m : Convert.ToDecimal(rd2["Monto"]),
                estado = rd2["Estado"]?.ToString() ?? "",
                estadoOvsr3 = rd2["EstadoOVSR3"]?.ToString() ?? "",
                cuenta = rd2["Cuenta"]?.ToString() ?? "",
                razonSocial = rd2["RazonSocial"]?.ToString() ?? "",
                domicilio = rd2["Domicilio"]?.ToString() ?? "",
                fechaAtencion = rd2["FechaAtencion"] == DBNull.Value ? "" : Convert.ToDateTime(rd2["FechaAtencion"]).ToString("yyyy-MM-dd"),
                agenteResponsable = rd2["AgenteResponsable"] == DBNull.Value ? "" : rd2["AgenteResponsable"].ToString(),
                descripcion = rd2["Descripcion"] == DBNull.Value ? "" : rd2["Descripcion"].ToString(),
                comentariosCotizacion = rd2["ComentariosCotizacion"] == DBNull.Value ? "" : rd2["ComentariosCotizacion"].ToString()
            });
        }

        public static void Guardar(HttpListenerContext ctx)
        {
            string body;
            using (var r = new StreamReader(ctx.Request.InputStream)) body = r.ReadToEnd();
            var d = JsonSerializer.Deserialize<Dictionary<string, string>>(body) ?? new Dictionary<string, string>();

            string folio = (DictGet(d, "folioTicket") ?? "").Trim();
            string ovsr3 = (DictGet(d, "ovsr3") ?? "").Trim();
            string estado = (DictGet(d, "estado") ?? "").Trim();
            string sMonto = DictGet(d, "monto") ?? "0";
            string sFechaAt = DictGet(d, "fechaAtencion") ?? "";
            string cuenta = (DictGet(d, "cuenta") ?? "").Trim();
            string razon = (DictGet(d, "razonSocial") ?? "").Trim();
            string domicilio = (DictGet(d, "domicilio") ?? "").Trim();
            string comentarios = DictGet(d, "comentariosCotizacion");
            string statusPago = (DictGet(d, "statusPago") ?? "Pendiente").Trim();

            if (string.IsNullOrWhiteSpace(folio) || string.IsNullOrWhiteSpace(ovsr3)) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="bad_request", message="Folio y OVSR3 son requeridos." }, 400); return; }
            if (!ExisteFolioEnTickets(folio)) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="invalid_folio", message="El folio no existe en tickets." }, 400); return; }
            if (!ValidOVSR3(ovsr3)) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="invalid_ovsr3", message="OVSR3 inválido." }, 400); return; }
            if (string.IsNullOrWhiteSpace(estado)) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="bad_request", message="Estado requerido." }, 400); return; }
            if (!decimal.TryParse(sMonto, NumberStyles.Any, CultureInfo.InvariantCulture, out var monto) || monto <= 0m) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="invalid_amount", message="Monto debe ser numérico y mayor a 0." }, 400); return; }
            if (!DateTime.TryParse(sFechaAt, out var fechaAt)) fechaAt = DateTime.Now.Date;

            var totalConIva = monto * 1.16m; _ = totalConIva;
            var comisionSobreIva = totalConIva * 1.03m;

            using var cn = new MySqlConnection(ConexionBD.CadenaConexion);
            cn.Open();
            using var tx = cn.BeginTransaction();
            try
            {
                int cotizacionID = InsertarCotizacion(cn, tx, folio, estado, monto);
                InsertarOrdenVenta(cn, tx, cotizacionID, ovsr3, comisionSobreIva);
                InsertarDetalleVenta(cn, tx, cotizacionID, ovsr3, folio, monto, estado,
                    cuenta, razon, domicilio, fechaAt, comentarios, statusPago, estado);
                tx.Commit();
                HttpResponseHelper.SendJsonResponse(ctx, new { ok = true }, 200);
            }
            catch (MySqlException ex) when (ex.Number == 1062)
            {
                try { tx.Rollback(); } catch { }
                HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="duplicate", message="No se puede registrar el ticket porque el OVSR3 ya existe." }, 409);
            }
            catch (Exception ex)
            {
                try { tx.Rollback(); } catch { }
                HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="tx_error", message = "No se pudo registrar la venta: "+ex.Message }, 500);
            }
        }

        public static void Listar(HttpListenerContext ctx)
        {
            string folio = GetQuery(ctx.Request.Url.Query, "folio");
            string estado = GetQuery(ctx.Request.Url.Query, "estado");
            string ovsr3 = GetQuery(ctx.Request.Url.Query, "ovsr3");
            string sMin = GetQuery(ctx.Request.Url.Query, "min");
            string sMax = GetQuery(ctx.Request.Url.Query, "max");
            string sPage = GetQuery(ctx.Request.Url.Query, "page");
            string sSize = GetQuery(ctx.Request.Url.Query, "pageSize");

            decimal? min = decimal.TryParse(sMin, out var tmin) ? (decimal?)tmin : null;
            decimal? max = decimal.TryParse(sMax, out var tmax) ? (decimal?)tmax : null;
            int page = int.TryParse(sPage, out var p) && p > 0 ? p : 1;
            int size = int.TryParse(sSize, out var s) && s > 0 && s <= 200 ? s : 100;

            int total;
            var result = ObtenerVentas(folio, estado, ovsr3, min, max, page, size, out total);

            decimal sumMonto = 0m, sumIva = 0m, sumIvaCom = 0m;
            using (var cn = new MySqlConnection(ConexionBD.CadenaConexion))
            {
                cn.Open();
                var where = new List<string>();
                if (!string.IsNullOrWhiteSpace(folio)) where.Add("t.Folio LIKE @folio");
                if (!string.IsNullOrWhiteSpace(estado)) where.Add("LOWER(ec.Nombre) = LOWER(@estado)");
                if (!string.IsNullOrWhiteSpace(ovsr3)) where.Add("v.OVSR3 LIKE @ovsr3");
                if (min.HasValue) where.Add("(v.Monto * 1.16 * 1.03) >= @min");
                if (max.HasValue) where.Add("(v.Monto * 1.16 * 1.03) <= @max");
                string whereSql = where.Count > 0 ? ("WHERE " + string.Join(" AND ", where)) : "";

                string baseSelect = @"
FROM ventasdetalle v
JOIN cotizaciones c       ON v.CotizacionID = c.CotizacionID
LEFT JOIN tickets t       ON c.TicketID     = t.Id
LEFT JOIN estadoscotizacion ec ON c.EstadoCotizacionID = ec.EstadoCotizacionID";

                                string sqlSum = $@"
SELECT 
    COALESCE(SUM(v.Monto),0)                 AS SumMonto,
    COALESCE(SUM(v.Monto*1.16),0)            AS SumIva,
    COALESCE(SUM(v.Monto*1.16*1.03),0)       AS SumIvaCom
{baseSelect}
{whereSql}";
                using var cmd = new MySqlCommand(sqlSum, cn);
                if (!string.IsNullOrWhiteSpace(folio)) cmd.Parameters.AddWithValue("@folio", $"%{folio}%");
                if (!string.IsNullOrWhiteSpace(estado)) cmd.Parameters.AddWithValue("@estado", estado);
                if (!string.IsNullOrWhiteSpace(ovsr3)) cmd.Parameters.AddWithValue("@ovsr3", $"%{ovsr3}%");
                if (min.HasValue) cmd.Parameters.AddWithValue("@min", min.Value);
                if (max.HasValue) cmd.Parameters.AddWithValue("@max", max.Value);

                using var rd = cmd.ExecuteReader();
                if (rd.Read())
                {
                    sumMonto = rd["SumMonto"] == DBNull.Value ? 0m : Convert.ToDecimal(rd["SumMonto"]);
                    sumIva = rd["SumIva"] == DBNull.Value ? 0m : Convert.ToDecimal(rd["SumIva"]);
                    sumIvaCom = rd["SumIvaCom"] == DBNull.Value ? 0m : Convert.ToDecimal(rd["SumIvaCom"]);
                }
            }

            HttpResponseHelper.SendJsonResponse(ctx, new { items = result, total = total, page = page, pageSize = size, sumMonto, sumIva, sumIvaCom });
        }

        public static void Cancelar(HttpListenerContext ctx)
        {
            var d = LeerJson(ctx);
            var ov = DictGet(d, "ovsr3");
            var motivo = DictGet(d, "motivo") ?? "";
            var usuario = DictGet(d, "usuario") ?? "";
            if (string.IsNullOrWhiteSpace(ov)) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="bad_request", message="OVSR3 requerido" }, 400); return; }
            if (string.IsNullOrWhiteSpace(motivo)) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="bad_request", message="Motivo requerido." }, 400); return; }

            bool ok = CancelarVenta(ov, motivo, usuario);
            if (!ok) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="not_found", message="OVSR3 no encontrado." }, 404); return; }
            HttpResponseHelper.SendJsonResponse(ctx, new { ok = true, status = "Cancelado" });
        }

        public static void Activar(HttpListenerContext ctx)
        {
            var d = LeerJson(ctx);
            var ov = DictGet(d, "ovsr3");
            if (string.IsNullOrWhiteSpace(ov)) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="bad_request", message="OVSR3 requerido" }, 400); return; }

            int? ticketId = ObtenerTicketIdPorOVSR3(ov);
            if (ticketId == null) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="not_found", message="OVSR3 no encontrado." }, 404); return; }
            if (ExisteVentaActivaMismoTicketExcepto(ticketId.Value, ov))
            {
                HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="conflict", message="Elimina o cancela las otras ventas del mismo folio antes de activar." }, 409);
                return;
            }
            bool ok = ReactivarVenta(ov);
            if (!ok) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="not_found", message="No encontrado o ya activo." }, 404); return; }
            HttpResponseHelper.SendJsonResponse(ctx, new { ok = true, status = "Reactivado" });
        }

        public static void ActualizarStatusPago(HttpListenerContext ctx)
        {
            var d = LeerJson(ctx);
            var ov = DictGet(d, "ovsr3");
            var sp = (DictGet(d, "statusPago") ?? "").Trim();
            if (string.IsNullOrWhiteSpace(ov)) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="bad_request", message="OVSR3 requerido" }, 400); return; }
            if (string.IsNullOrWhiteSpace(sp)) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="bad_request", message="StatusPago requerido" }, 400); return; }
            var permitidos = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Pendiente", "Promesa de pago", "Pagado" };
            if (!permitidos.Contains(sp)) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="invalid_status", message="Valor no permitido." }, 400); return; }

            const string sql = @"UPDATE ventasdetalle SET StatusPago=@s WHERE OVSR3=@ov AND (StatusPago IS NULL OR UPPER(StatusPago) <> 'CANCELADO')";
            using var cn = new MySqlConnection(ConexionBD.CadenaConexion);
            cn.Open();
            using var cmd = new MySqlCommand(sql, cn);
            cmd.Parameters.AddWithValue("@s", sp);
            cmd.Parameters.AddWithValue("@ov", ov);
            int n = cmd.ExecuteNonQuery();
            if (n <= 0) { HttpResponseHelper.SendJsonResponse(ctx, new { ok=false, code="not_found", message="OVSR3 no encontrado o cancelado." }, 404); return; }
            HttpResponseHelper.SendJsonResponse(ctx, new { ok = true, statusPago = sp });
        }

        public static void Reporte(HttpListenerContext ctx)
        {
            string accept = ctx.Request.Headers["Accept"] ?? "";
            string query = ctx.Request.Url.Query ?? "";
            bool quiereHtml = (accept.IndexOf("text/html", StringComparison.OrdinalIgnoreCase) >= 0)
                              || (query.ToLowerInvariant().IndexOf("format=html", StringComparison.Ordinal) >= 0);

            int _;
            var ventas = ObtenerVentas(null, null, null, null, null, 1, 10000, out _);

            if (quiereHtml)
            {
                string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "ventas_reporte.html");
                if (File.Exists(path))
                {
                    ctx.Response.ContentType = "text/html; charset=utf-8";
                    using var fs = File.OpenRead(path);
                    fs.CopyTo(ctx.Response.OutputStream);
                    ctx.Response.OutputStream.Close();
                    return;
                }
                string html = ObtenerReporteHtml(ventas);
                ctx.Response.ContentEncoding = Encoding.UTF8;
                ctx.Response.ContentType = "text/html; charset=utf-8";
                using var output = new StreamWriter(ctx.Response.OutputStream, Encoding.UTF8);
                output.Write(html);
                return;
            }
            else
            {
                string texto = ObtenerReporteTextoPlano(ventas);
                ctx.Response.ContentEncoding = Encoding.UTF8;
                ctx.Response.ContentType = "text/plain; charset=utf-8";
                using var output = new StreamWriter(ctx.Response.OutputStream, Encoding.UTF8);
                output.Write(texto);
                return;
            }
        }

        public static void VerificarOVSR3(HttpListenerContext ctx)
        {
            string ov = GetQuery(ctx.Request.Url.Query, "ovsr3");
            if (string.IsNullOrWhiteSpace(ov)) { HttpResponseHelper.SendJsonResponse(ctx, new { exists = false, ok = false, code = "bad_request", message = "ovsr3 requerido" }, 400); return; }
            using var cn = new MySqlConnection(ConexionBD.CadenaConexion);
            cn.Open();
            using var cmd = new MySqlCommand("SELECT COUNT(*) FROM ventasdetalle WHERE OVSR3 = @ov", cn);
            cmd.Parameters.AddWithValue("@ov", ov);
            int n = Convert.ToInt32(cmd.ExecuteScalar());
            HttpResponseHelper.SendJsonResponse(ctx, new { exists = n > 0 });
        }

        public static void Exportar(HttpListenerContext ctx)
        {
            // Reusar la implementación existente del controlador; mantener contratos
            // Para mantener breve, delegamos a VentasController.ExportarExcel si es muy específica,
            // pero aquí replicamos la ruta principal de selección de formato ya que depende de ClosedXML.

            // Como el método es largo en el controlador, y ya usa ClosedXML correctamente,
            // por ahora dejamos la exportación en el controlador para evitar duplicación.
            // Este servicio se centra en JSON y operaciones de negocio.
            HttpResponseHelper.SendErrorResponse(ctx, 501, "Exportar desde servicio no implementado (controlador maneja exportación)");
        }

        // ===== Helpers de datos (copiados del controlador para mantener contratos) =====
        private static bool ValidOVSR3(string v)
        {
            if (string.IsNullOrWhiteSpace(v)) return false;
            if (v.Length < 3 || v.Length > 32) return false;
            foreach (char c in v)
                if (!(char.IsLetterOrDigit(c) || c == '-' || c == '_')) return false;
            return true;
        }

        private static bool ExisteFolioEnTickets(string folio)
        {
            using var conn = new MySqlConnection(ConexionBD.CadenaConexion);
            conn.Open();
            using var cmd = new MySqlCommand("SELECT COUNT(*) FROM tickets WHERE Folio = @f", conn);
            cmd.Parameters.AddWithValue("@f", folio);
            return Convert.ToInt32(cmd.ExecuteScalar()) > 0;
        }

        private static Dictionary<string, string> ObtenerDatosTicketPorFolio(string folio)
        {
            const string query = @"\
SELECT Cuenta, RazonSocial, Domicilio, FechaAtencion, \
       Responsable AS AgenteResponsable, Descripcion\
FROM tickets WHERE Folio = @folio";
            using var conn = new MySqlConnection(ConexionBD.CadenaConexion);
            conn.Open();
            using var cmd = new MySqlCommand(query, conn);
            cmd.Parameters.AddWithValue("@folio", folio);
            using var reader = cmd.ExecuteReader();
            if (!reader.Read()) return null;

            string fecha = reader["FechaAtencion"] == DBNull.Value ? "" : Convert.ToDateTime(reader["FechaAtencion"]).ToString("yyyy-MM-dd");

            var dic = new Dictionary<string, string>();
            dic["Cuenta"] = reader["Cuenta"] == DBNull.Value ? "" : reader["Cuenta"].ToString();
            dic["RazonSocial"] = reader["RazonSocial"] == DBNull.Value ? "" : reader["RazonSocial"].ToString();
            dic["Domicilio"] = reader["Domicilio"] == DBNull.Value ? "" : reader["Domicilio"].ToString();
            dic["FechaAtencion"] = fecha;
            dic["AgenteResponsable"] = reader["AgenteResponsable"] == DBNull.Value ? "" : reader["AgenteResponsable"].ToString();
            dic["Descripcion"] = reader["Descripcion"] == DBNull.Value ? "" : reader["Descripcion"].ToString();
            return dic;
        }

        private static int InsertarCotizacion(MySqlConnection cn, MySqlTransaction tx, string folio, string estado, decimal monto)
        {
            const string query = @"
INSERT INTO cotizaciones (TicketID, EstadoCotizacionID, FechaEnvio, Monto) 
VALUES (
    (SELECT Id FROM tickets WHERE Folio = @folio), 
    (SELECT EstadoCotizacionID FROM estadoscotizacion WHERE LOWER(Nombre) = LOWER(@estado) LIMIT 1), 
    CURDATE(), @monto
);
SELECT LAST_INSERT_ID();";
            using var cmd = new MySqlCommand(query, cn, tx);
            cmd.Parameters.AddWithValue("@folio", folio);
            cmd.Parameters.AddWithValue("@estado", estado);
            cmd.Parameters.AddWithValue("@monto", monto);
            object o = cmd.ExecuteScalar();
            return Convert.ToInt32(o);
        }

        private static void InsertarOrdenVenta(MySqlConnection cn, MySqlTransaction tx, int cotizacionID, string ovsr3, decimal comisionTotal)
        {
            const string query = @"INSERT INTO ordenesventa (OVSR3, CotizacionID, FechaVenta, Comision) 
                                   VALUES (@ovsr3, @cid, CURDATE(), @comision)";
            using var cmd = new MySqlCommand(query, cn, tx);
            cmd.Parameters.AddWithValue("@ovsr3", ovsr3);
            cmd.Parameters.AddWithValue("@cid", cotizacionID);
            cmd.Parameters.AddWithValue("@comision", comisionTotal);
            cmd.ExecuteNonQuery();
        }

        private static void InsertarDetalleVenta(
            MySqlConnection cn, MySqlTransaction tx,
            int cotizacionID, string ovsr3, string folio, decimal monto, string estado,
            string cuenta, string razonSocial, string domicilio, DateTime fechaAtencion, string comentariosCot, string statusPago, string estadoOvsr3)
        {
            const string query = @"
INSERT INTO ventasdetalle (
    CotizacionID, OVSR3, Fecha, 
    Cuenta, RazonSocial, Regional, Domicilio,
    Descripcion, FechaAtencion, AgenteResponsable, 
    Monto, StatusPago, EstadoOVSR3, ConstanciaDe, ComentariosCotizacion
)
SELECT @cid, @ovsr3, NOW(),
       @cuenta, @razon, NULL, @domicilio,
       t.Descripcion, @fechaAtencion, t.Responsable,
       @monto, @status, @estadoOvsr3, NULL, @comentarios
FROM tickets t WHERE Folio = @folio";
            using var cmd = new MySqlCommand(query, cn, tx);
            cmd.Parameters.AddWithValue("@cid", cotizacionID);
            cmd.Parameters.AddWithValue("@ovsr3", ovsr3);
            cmd.Parameters.AddWithValue("@folio", folio);
            cmd.Parameters.AddWithValue("@cuenta", (object)cuenta ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@razon", (object)razonSocial ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@domicilio", (object)domicilio ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@fechaAtencion", fechaAtencion);
            cmd.Parameters.AddWithValue("@monto", monto);
            cmd.Parameters.AddWithValue("@comentarios", (object)comentariosCot ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@status", string.IsNullOrWhiteSpace(statusPago) ? "Pendiente" : statusPago);
            cmd.Parameters.AddWithValue("@estadoOvsr3", (object)estadoOvsr3 ?? DBNull.Value);
            cmd.ExecuteNonQuery();
        }

        private static bool CancelarVenta(string ovsr3, string motivo, string usuario)
        {
            const string sql = @"
UPDATE ventasdetalle
SET StatusPago = 'Cancelado',
    FechaCancelacion = NOW(),
    MotivoCancelacion = @m,
    UsuarioCancelacion = @u
WHERE OVSR3 = @ov";
            using var cn = new MySqlConnection(ConexionBD.CadenaConexion);
            cn.Open();
            using var cmd = new MySqlCommand(sql, cn);
            cmd.Parameters.AddWithValue("@ov", ovsr3);
            cmd.Parameters.AddWithValue("@m", motivo ?? "");
            cmd.Parameters.AddWithValue("@u", usuario ?? "");
            return cmd.ExecuteNonQuery() > 0;
        }

        private static int? ObtenerTicketIdPorOVSR3(string ovsr3)
        {
            const string sql = @"
SELECT c.TicketID
FROM ventasdetalle v
JOIN cotizaciones c ON v.CotizacionID = c.CotizacionID
WHERE v.OVSR3 = @ov
LIMIT 1";
            using var cn = new MySqlConnection(ConexionBD.CadenaConexion);
            cn.Open();
            using var cmd = new MySqlCommand(sql, cn);
            cmd.Parameters.AddWithValue("@ov", ovsr3);
            object o = cmd.ExecuteScalar();
            if (o == null || o == DBNull.Value) return null;
            return Convert.ToInt32(o);
        }

        private static bool ExisteVentaActivaMismoTicketExcepto(int ticketId, string excluirOV)
        {
                        const string sql = @"
SELECT COUNT(*)
FROM ventasdetalle v
JOIN cotizaciones c ON v.CotizacionID = c.CotizacionID
WHERE c.TicketID = @t
    AND v.OVSR3 <> @ov
    AND (v.StatusPago IS NULL OR UPPER(v.StatusPago) <> 'CANCELADO')";
            using var cn = new MySqlConnection(ConexionBD.CadenaConexion);
            cn.Open();
            using var cmd = new MySqlCommand(sql, cn);
            cmd.Parameters.AddWithValue("@t", ticketId);
            cmd.Parameters.AddWithValue("@ov", excluirOV);
            int n = Convert.ToInt32(cmd.ExecuteScalar());
            return n > 0;
        }

        private static bool ReactivarVenta(string ovsr3)
        {
                        const string sql = @"
UPDATE ventasdetalle
SET StatusPago = 'Pendiente',
        FechaCancelacion = NULL,
        MotivoCancelacion = NULL,
        UsuarioCancelacion = NULL
WHERE OVSR3 = @ov
    AND UPPER(IFNULL(StatusPago,'Pendiente')) = 'CANCELADO'";
            using var cn = new MySqlConnection(ConexionBD.CadenaConexion);
            cn.Open();
            using var cmd = new MySqlCommand(sql, cn);
            cmd.Parameters.AddWithValue("@ov", ovsr3);
            return cmd.ExecuteNonQuery() > 0;
        }

        private static List<VentaDetalleEntidad> ObtenerVentas(
            string folio, string estado, string ovsr3, decimal? min, decimal? max, int page, int size, out int total)
        {
            var where = new List<string>();
            if (!string.IsNullOrWhiteSpace(folio)) where.Add("t.Folio LIKE @folio");
            if (!string.IsNullOrWhiteSpace(estado)) where.Add("LOWER(ec.Nombre) = LOWER(@estado)");
            if (!string.IsNullOrWhiteSpace(ovsr3)) where.Add("v.OVSR3 LIKE @ovsr3");
            if (min.HasValue) where.Add("(v.Monto * 1.16 * 1.03) >= @min");
            if (max.HasValue) where.Add("(v.Monto * 1.16 * 1.03) <= @max");
            string whereSql = where.Count > 0 ? ("WHERE " + string.Join(" AND ", where)) : "";

            string baseSelect = @"
FROM ventasdetalle v
JOIN cotizaciones c       ON v.CotizacionID = c.CotizacionID
LEFT JOIN tickets t       ON c.TicketID     = t.Id
LEFT JOIN ordenesventa o  ON o.OVSR3        = v.OVSR3
LEFT JOIN estadoscotizacion ec ON c.EstadoCotizacionID = ec.EstadoCotizacionID";

            string sqlCount = $"SELECT COUNT(*) {baseSelect} {whereSql}";
            string sql = $@"
            SELECT 
                v.OVSR3,
                t.Folio,
                v.Monto,
                ec.Nombre AS EstadoCotizacion,
                v.EstadoOVSR3 AS EstadoOVSR3,
                t.Estado AS EstadoTicket,
                o.Comision,
                v.Cuenta, v.RazonSocial, v.Domicilio, v.FechaAtencion, v.AgenteResponsable, 
                v.Descripcion, v.ComentariosCotizacion, v.StatusPago, v.FechaCancelacion, 
                v.MotivoCancelacion, v.UsuarioCancelacion
    {baseSelect}
    {whereSql}
    ORDER BY v.Fecha DESC
    LIMIT @limit OFFSET @offset";

            var lista = new List<VentaDetalleEntidad>();
            using var conn = new MySqlConnection(ConexionBD.CadenaConexion);
            conn.Open();

            using (var cmdC = new MySqlCommand(sqlCount, conn))
            {
                if (!string.IsNullOrWhiteSpace(folio)) cmdC.Parameters.AddWithValue("@folio", $"%{folio}%");
                if (!string.IsNullOrWhiteSpace(estado)) cmdC.Parameters.AddWithValue("@estado", estado);
                if (!string.IsNullOrWhiteSpace(ovsr3)) cmdC.Parameters.AddWithValue("@ovsr3", $"%{ovsr3}%");
                if (min.HasValue) cmdC.Parameters.AddWithValue("@min", min.Value);
                if (max.HasValue) cmdC.Parameters.AddWithValue("@max", max.Value);
                total = Convert.ToInt32(cmdC.ExecuteScalar());
            }

            using (var cmd = new MySqlCommand(sql, conn))
            {
                if (!string.IsNullOrWhiteSpace(folio)) cmd.Parameters.AddWithValue("@folio", $"%{folio}%");
                if (!string.IsNullOrWhiteSpace(estado)) cmd.Parameters.AddWithValue("@estado", estado);
                if (!string.IsNullOrWhiteSpace(ovsr3)) cmd.Parameters.AddWithValue("@ovsr3", $"%{ovsr3}%");
                if (min.HasValue) cmd.Parameters.AddWithValue("@min", min.Value);
                if (max.HasValue) cmd.Parameters.AddWithValue("@max", max.Value);
                cmd.Parameters.AddWithValue("@limit", size);
                cmd.Parameters.AddWithValue("@offset", (page - 1) * size);

                using var reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    var v = new VentaDetalleEntidad
                    {
                        OVSR3 = reader["OVSR3"] == DBNull.Value ? "" : reader["OVSR3"].ToString(),
                        Folio = reader["Folio"] == DBNull.Value ? "" : reader["Folio"].ToString(),
                        Monto = reader["Monto"] == DBNull.Value ? 0m : Convert.ToDecimal(reader["Monto"]),
                        Estado = reader["EstadoTicket"] == DBNull.Value ? "" : reader["EstadoTicket"].ToString(),
                        EstadoOVSR3 = reader["EstadoOVSR3"] == DBNull.Value ? "" : reader["EstadoOVSR3"].ToString(),
                        EstadoTicket = reader["EstadoTicket"] == DBNull.Value ? "" : reader["EstadoTicket"].ToString(),
                        EstadoCotizacion = reader["EstadoCotizacion"] == DBNull.Value ? "" : reader["EstadoCotizacion"].ToString(),
                        Comision = reader["Comision"] == DBNull.Value ? (decimal?)null : Convert.ToDecimal(reader["Comision"]),
                        Cuenta = reader["Cuenta"] == DBNull.Value ? "" : reader["Cuenta"].ToString(),
                        RazonSocial = reader["RazonSocial"] == DBNull.Value ? "" : reader["RazonSocial"].ToString(),
                        Domicilio = reader["Domicilio"] == DBNull.Value ? "" : reader["Domicilio"].ToString(),
                        FechaAtencion = reader["FechaAtencion"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["FechaAtencion"]),
                        AgenteResponsable = reader["AgenteResponsable"] == DBNull.Value ? "" : reader["AgenteResponsable"].ToString(),
                        Descripcion = reader["Descripcion"] == DBNull.Value ? "" : reader["Descripcion"].ToString(),
                        ComentariosCotizacion = reader["ComentariosCotizacion"] == DBNull.Value ? "" : reader["ComentariosCotizacion"].ToString(),
                        StatusPago = reader["StatusPago"] == DBNull.Value ? "" : reader["StatusPago"].ToString(),
                        FechaCancelacion = reader["FechaCancelacion"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["FechaCancelacion"]),
                        MotivoCancelacion = reader["MotivoCancelacion"] == DBNull.Value ? "" : reader["MotivoCancelacion"].ToString(),
                        UsuarioCancelacion = reader["UsuarioCancelacion"] == DBNull.Value ? "" : reader["UsuarioCancelacion"].ToString()
                    };
                    lista.Add(v);
                }
            }
            return lista;
        }

        private static string ObtenerReporteTextoPlano(List<VentaDetalleEntidad> ventas)
        {
            var sb = new StringBuilder();
            sb.AppendLine("Folio\tOVSR3\tEstado\tMonto\tIVA\tIVA+Comisión\tCuenta\tRazón Social\tAgente\tStatusPago");
            foreach (var v in ventas)
            {
                decimal iva = v.Monto * 1.16m;
                decimal ivacom = iva * 1.03m;
                sb.AppendLine(string.Join("\t", new[]{
                    v.Folio, v.OVSR3, ToTitleCase(v.Estado),
                    v.Monto.ToString("0.00", CultureInfo.InvariantCulture),
                    iva.ToString("0.00", CultureInfo.InvariantCulture),
                    ivacom.ToString("0.00", CultureInfo.InvariantCulture),
                    v.Cuenta, v.RazonSocial, v.AgenteResponsable, v.StatusPago
                }));
            }
            return sb.ToString();
        }

        private static string ObtenerReporteHtml(List<VentaDetalleEntidad> ventas)
        {
            var sb = new StringBuilder();
            sb.Append(@"<!doctype html><html lang='es'><head><meta charset='utf-8'><title>Reporte Ventas</title>");
            sb.Append("</head><body>");
            sb.Append("<h2>Reporte de Ventas</h2>");
            sb.Append("<table><thead><tr><th>Folio</th><th>OVSR3</th><th>Estado</th><th>Monto</th><th>IVA</th><th>IVA+Comisión</th><th>Cuenta</th><th>Razón Social</th><th>Agente</th><th>Status</th></tr></thead><tbody>");
            foreach (var v in ventas)
            {
                decimal iva = v.Monto * 1.16m;
                decimal ivacom = iva * 1.03m;
                sb.Append("<tr>");
                sb.Append($"<td>{Esc(v.Folio)}</td>");
                sb.Append($"<td>{Esc(v.OVSR3)}</td>");
                sb.Append($"<td>{Esc(ToTitleCase(v.Estado))}</td>");
                sb.Append($"<td>{v.Monto:0.00}</td>");
                sb.Append($"<td>{iva:0.00}</td>");
                sb.Append($"<td>{ivacom:0.00}</td>");
                sb.Append($"<td>{Esc(v.Cuenta)}</td>");
                sb.Append($"<td>{Esc(v.RazonSocial)}</td>");
                sb.Append($"<td>{Esc(v.AgenteResponsable)}</td>");
                sb.Append($"<td>{Esc(v.StatusPago)}</td>");
                sb.Append("</tr>");
            }
            sb.Append("</tbody></table></body></html>");
            return sb.ToString();
        }

        private static string GetQuery(string query, string key)
        {
            if (string.IsNullOrEmpty(query)) return null;
            foreach (var kv in query.TrimStart('?').Split('&'))
            {
                int ix = kv.IndexOf('=');
                if (ix > 0)
                {
                    var k = kv.Substring(0, ix);
                    if (k.Equals(key, StringComparison.OrdinalIgnoreCase))
                        return Uri.UnescapeDataString(kv.Substring(ix + 1));
                }
            }
            return null;
        }

        private static string ToTitleCase(string s)
        {
            if (string.IsNullOrWhiteSpace(s)) return s ?? string.Empty;
            try {
                var culture = new CultureInfo("es-ES");
                return culture.TextInfo.ToTitleCase(s.ToLowerInvariant());
            } catch {
                var lower = (s ?? string.Empty).ToLowerInvariant();
                return string.Join(" ", lower.Split(new[]{' '}, StringSplitOptions.RemoveEmptyEntries)
                    .Select(w => char.ToUpperInvariant(w[0]) + (w.Length>1 ? w.Substring(1) : string.Empty)));
            }
        }

        private static string Esc(string s) => WebUtility.HtmlEncode(s ?? "");
    }
}
