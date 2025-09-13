using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using MySql.Data.MySqlClient;
using SWGROI_Server.DB;
using SWGROI_Server.Infrastructure;
using SWGROI_Server.Security;
using Authz = SWGROI_Server.Security.Authorization;
using SWGROI_Server.Utils;

namespace SWGROI_Server.Controllers
{
    public static class DocumentosController
    {
        private static readonly HashSet<string> AllowedMime = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "application/pdf",
            "image/png",
            "image/jpeg",
            "text/plain",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        };

        private const int MaxUploadBytes = 10 * 1024 * 1024; // 10 MB

        public static void Manejar(HttpListenerContext ctx)
        {
            var req = ctx.Request;
            var path = (req.Url?.AbsolutePath ?? "/").TrimEnd('/').ToLowerInvariant();
            // /api/documentos[/...]

            // Límite de tasa para POST/PUT
            if (req.HttpMethod == "POST" || req.HttpMethod == "PUT")
            {
                string ip = req.RemoteEndPoint?.Address?.ToString() ?? "-";
                if (RateLimiter.IsLimited($"docs:{ip}", GetInt("DOCS_RATE_MAX", 20), TimeSpan.FromSeconds(GetInt("DOCS_RATE_WINDOW", 60))))
                { Json(ctx.Response, 429, "{\"ok\":false,\"code\":\"rate_limited\"}"); return; }
            }

            if (path == "/api/documentos")
            {
                if (req.HttpMethod == "GET") { if (!Authz.RequireLogin(ctx)) return; Listar(ctx); return; }
                if (req.HttpMethod == "POST") { if (!Authz.RequireRoles(ctx, "Supervisor", "Mesa de Control")) return; if (!SessionManager.ValidateCsrf(ctx)) { Csrf(ctx); return; } SubirNuevo(ctx); return; }
            }
            else if (path.StartsWith("/api/documentos/"))
            {
                var seg = path.Split('/');
                if (seg.Length >= 3 && int.TryParse(seg[3], out int id))
                {
                    if (seg.Length == 4)
                    {
                        if (req.HttpMethod == "GET") { if (!Authz.RequireLogin(ctx)) return; Detalle(ctx, id); return; }
                        if (req.HttpMethod == "PUT") { if (!Authz.RequireRoles(ctx, "Supervisor", "Mesa de Control")) return; if (!SessionManager.ValidateCsrf(ctx)) { Csrf(ctx); return; } Actualizar(ctx, id); return; }
                        if (req.HttpMethod == "DELETE") { if (!Authz.RequireRoles(ctx, "Supervisor", "Mesa de Control")) return; if (!SessionManager.ValidateCsrf(ctx)) { Csrf(ctx); return; } BajaLogica(ctx, id); return; }
                    }
                    else if (seg.Length == 5 && seg[4] == "descargar")
                    {
                        // Lectura autorizada (Operador, Supervisor, Mesa de Control)
                        if (!Authz.RequireLogin(ctx)) return;
                        Descargar(ctx, id); return;
                    }
                }
            }

            Json(ctx.Response, 404, "{\"ok\":false,\"error\":\"not_found\"}");
        }

        private static void Listar(HttpListenerContext ctx)
        {
            var q = ctx.Request.QueryString;
            string buscar = (q["buscar"] ?? string.Empty).Trim();
            string categoria = (q["categoria"] ?? string.Empty).Trim();
            int? activo = null; if (int.TryParse(q["activo"], out int a)) activo = a;
            int page = ParseInt(q["page"], 1); int size = Clamp(ParseInt(q["pageSize"], 10), 5, 100);

            using var cn = new MySqlConnection(ConexionBD.CadenaConexion); cn.Open();

            var where = new List<string>();
            if (!string.IsNullOrEmpty(buscar)) where.Add("NombreArchivo LIKE @b");
            if (!string.IsNullOrEmpty(categoria)) where.Add("Categoria = @c");
            if (activo.HasValue) where.Add("IsActivo = @a");
            string whereSql = where.Count > 0 ? (" WHERE " + string.Join(" AND ", where)) : string.Empty;

            long total = 0;
            using (var cmdC = new MySqlCommand($"SELECT COUNT(*) FROM Documentos{whereSql}", cn))
            {
                if (!string.IsNullOrEmpty(buscar)) cmdC.Parameters.AddWithValue("@b", "%" + buscar + "%");
                if (!string.IsNullOrEmpty(categoria)) cmdC.Parameters.AddWithValue("@c", categoria);
                if (activo.HasValue) cmdC.Parameters.AddWithValue("@a", activo.Value);
                total = Convert.ToInt64(cmdC.ExecuteScalar() ?? 0);
            }

            var items = new List<string>();
            using (var cmd = new MySqlCommand($"SELECT DocumentoID, NombreArchivo, MimeType, TamanoBytes, Categoria, Etiquetas, VersionActual, IsActivo, FechaCreacion FROM Documentos{whereSql} ORDER BY FechaCreacion DESC LIMIT @off,@sz", cn))
            {
                if (!string.IsNullOrEmpty(buscar)) cmd.Parameters.AddWithValue("@b", "%" + buscar + "%");
                if (!string.IsNullOrEmpty(categoria)) cmd.Parameters.AddWithValue("@c", categoria);
                if (activo.HasValue) cmd.Parameters.AddWithValue("@a", activo.Value);
                cmd.Parameters.AddWithValue("@off", (page - 1) * size);
                cmd.Parameters.AddWithValue("@sz", size);
                using var rd = cmd.ExecuteReader();
                while (rd.Read())
                {
                    items.Add("{" +
                        "\"id\":" + rd["DocumentoID"] + "," +
                        "\"nombre\":\"" + Esc(rd["NombreArchivo"]?.ToString()) + "\"," +
                        "\"mime\":\"" + Esc(rd["MimeType"]?.ToString()) + "\"," +
                        "\"tam\":" + (Convert.ToInt64(rd["TamanoBytes"])) + "," +
                        "\"cat\":\"" + Esc(rd["Categoria"]?.ToString()) + "\"," +
                        "\"tags\":\"" + Esc(rd["Etiquetas"]?.ToString()) + "\"," +
                        "\"ver\":" + rd["VersionActual"] + "," +
                        "\"activo\":" + (Convert.ToInt32(rd["IsActivo"])==1?"true":"false") + "," +
                        "\"creado\":\"" + Esc(Convert.ToDateTime(rd["FechaCreacion"]).ToString("s")) + "\"}" );
                }
            }

            Json(ctx.Response, 200, "{" +
                "\"ok\":true," +
                "\"total\":" + total + "," +
                "\"items\":[" + string.Join(",", items) + "]}" );
        }

        private static void Detalle(HttpListenerContext ctx, int id)
        {
            using var cn = new MySqlConnection(ConexionBD.CadenaConexion); cn.Open();
            string meta = null;
            using (var cmd = new MySqlCommand("SELECT DocumentoID, NombreArchivo, MimeType, TamanoBytes, Categoria, Etiquetas, VersionActual, IsActivo FROM Documentos WHERE DocumentoID=@id LIMIT 1", cn))
            { cmd.Parameters.AddWithValue("@id", id); using var rd = cmd.ExecuteReader(); if (rd.Read()) { meta = "{" +
                "\"id\":" + rd["DocumentoID"] + "," +
                "\"nombre\":\"" + Esc(rd["NombreArchivo"]?.ToString()) + "\"," +
                "\"mime\":\"" + Esc(rd["MimeType"]?.ToString()) + "\"," +
                "\"tam\":" + (Convert.ToInt64(rd["TamanoBytes"])) + "," +
                "\"cat\":\"" + Esc(rd["Categoria"]?.ToString()) + "\"," +
                "\"tags\":\"" + Esc(rd["Etiquetas"]?.ToString()) + "\"," +
                "\"ver\":" + rd["VersionActual"] + "," +
                "\"activo\":" + ((Convert.ToInt32(rd["IsActivo"])==1)?"true":"false") + "}"; } }
            if (meta == null) { Json(ctx.Response, 404, "{\"ok\":false}"); return; }

            var vers = new List<string>();
            using (var cmd = new MySqlCommand("SELECT VersionID, NumeroVersion, RutaArchivo, HashSHA256, FechaCreacion FROM DocumentoVersiones WHERE DocumentoID=@id ORDER BY NumeroVersion DESC", cn))
            { cmd.Parameters.AddWithValue("@id", id); using var rd = cmd.ExecuteReader(); while (rd.Read()) { vers.Add("{" +
                "\"vid\":" + rd["VersionID"] + "," +
                "\"n\":" + rd["NumeroVersion"] + "," +
                "\"ruta\":\"" + Esc(rd["RutaArchivo"].ToString()) + "\"," +
                "\"sha\":\"" + Esc(rd["HashSHA256"].ToString()) + "\"," +
                "\"fecha\":\"" + Esc(Convert.ToDateTime(rd["FechaCreacion"]).ToString("s")) + "\"}"); } }

            Json(ctx.Response, 200, "{" + "\"ok\":true,\"meta\":" + meta + ",\"versiones\":[" + string.Join(",", vers) + "]}" );
        }

        private static void SubirNuevo(HttpListenerContext ctx)
        {
            var req = ctx.Request;
            if ((req.ContentLength64 > MaxUploadBytes) || (req.ContentLength64 <= 0))
            { Json(ctx.Response, 400, "{\"ok\":false,\"code\":\"invalid_size\"}"); return; }
            var mp = Multipart.Read(req, MaxUploadBytes);
            if (mp == null || mp.File == null || string.IsNullOrEmpty(mp.File.FileName) || mp.File.Data == null)
            { Json(ctx.Response, 400, "{\"ok\":false,\"code\":\"file_required\"}"); return; }

            string categoria = Limit(mp.Get("categoria"), 100);
            string etiquetas = Limit(mp.Get("etiquetas"), 255);
            string notas = Limit(mp.Get("notas"), 500);

            if (string.IsNullOrWhiteSpace(categoria)) { Json(ctx.Response, 400, "{\"ok\":false,\"code\":\"categoria_required\"}"); return; }
            string mime = mp.File.ContentType ?? "application/octet-stream";
            if (!AllowedMime.Contains(mime)) { Json(ctx.Response, 415, "{\"ok\":false,\"code\":\"mime_not_allowed\"}"); return; }
            var (safeName, ext) = SafeName(mp.File.FileName);

            var (pathRel, pathAbs, hash, size) = SaveVersion(mp.File.Data, ext);

            int? idUser = AuditLogger.TryResolveUserId(SessionManager.GetUser(req)?.user);

            using var cn = new MySqlConnection(ConexionBD.CadenaConexion); cn.Open();
            int id;
            using (var cmd = new MySqlCommand(@"INSERT INTO Documentos (NombreArchivo, AlmacenamientoRuta, MimeType, TamanoBytes, Categoria, Etiquetas, VersionActual, CreadoPor, IsActivo)
VALUES (@n,@r,@m,@t,@c,@e,1,@u,1);
SELECT LAST_INSERT_ID();", cn))
            {
                cmd.Parameters.AddWithValue("@n", safeName + ext);
                cmd.Parameters.AddWithValue("@r", pathRel);
                cmd.Parameters.AddWithValue("@m", mime);
                cmd.Parameters.AddWithValue("@t", size);
                cmd.Parameters.AddWithValue("@c", categoria);
                cmd.Parameters.AddWithValue("@e", (object)etiquetas ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@u", (object)idUser ?? DBNull.Value);
                id = Convert.ToInt32(cmd.ExecuteScalar());
            }
            using (var cmd = new MySqlCommand(@"INSERT INTO DocumentoVersiones (DocumentoID, NumeroVersion, RutaArchivo, HashSHA256, Notas, CreadoPor)
VALUES (@d,1,@r,@h,@no,@u)", cn))
            {
                cmd.Parameters.AddWithValue("@d", id);
                cmd.Parameters.AddWithValue("@r", pathRel);
                cmd.Parameters.AddWithValue("@h", hash);
                cmd.Parameters.AddWithValue("@no", (object)notas ?? DBNull.Value);
                cmd.Parameters.AddWithValue("@u", (object)idUser ?? DBNull.Value);
                cmd.ExecuteNonQuery();
            }

            Audit("DOC_UPLOAD", ctx, id.ToString());
            Json(ctx.Response, 200, $"{{\"ok\":true,\"id\":{id}}}");
        }

        private static void Actualizar(HttpListenerContext ctx, int id)
        {
            var req = ctx.Request;
            var mp = Multipart.Read(req, MaxUploadBytes);
            string categoria = Limit(mp?.Get("categoria"), 100);
            string etiquetas = Limit(mp?.Get("etiquetas"), 255);
            string notas = Limit(mp?.Get("notas"), 500);

            using var cn = new MySqlConnection(ConexionBD.CadenaConexion); cn.Open();

            // Leer versión actual y hash
            string prevHash = null; int verActual = 0; string prevRuta = null;
            using (var cmd = new MySqlCommand(@"SELECT d.VersionActual, dv.HashSHA256, dv.RutaArchivo
FROM Documentos d JOIN DocumentoVersiones dv ON dv.DocumentoID=d.DocumentoID AND dv.NumeroVersion=d.VersionActual
WHERE d.DocumentoID=@id LIMIT 1", cn))
            {
                cmd.Parameters.AddWithValue("@id", id);
                using var rd = cmd.ExecuteReader();
                if (rd.Read()) { verActual = Convert.ToInt32(rd["VersionActual"]); prevHash = Convert.ToString(rd["HashSHA256"]); prevRuta = Convert.ToString(rd["RutaArchivo"]); }
                else { Json(ctx.Response, 404, "{\"ok\":false}"); return; }
            }

            int? idUser = AuditLogger.TryResolveUserId(SessionManager.GetUser(req)?.user);

            if (mp?.File?.Data != null && mp.File.Data.Length > 0)
            {
                string mime = mp.File.ContentType ?? "application/octet-stream";
                if (!AllowedMime.Contains(mime)) { Json(ctx.Response, 415, "{\"ok\":false,\"code\":\"mime_not_allowed\"}"); return; }
                var (safeName, ext) = SafeName(mp.File.FileName);
                var (pathRel, pathAbs, hash, size) = SaveVersion(mp.File.Data, ext);
                if (string.Equals(hash, prevHash, StringComparison.OrdinalIgnoreCase))
                { Json(ctx.Response, 409, "{\"ok\":false,\"code\":\"duplicate_version\"}"); return; }

                using (var tx = cn.BeginTransaction())
                {
                    using (var cmd = new MySqlCommand("UPDATE Documentos SET AlmacenamientoRuta=@r, MimeType=@m, TamanoBytes=@t, VersionActual=@va, Categoria=COALESCE(@c, Categoria), Etiquetas=@e WHERE DocumentoID=@id", cn, tx))
                    {
                        cmd.Parameters.AddWithValue("@r", pathRel);
                        cmd.Parameters.AddWithValue("@m", mime);
                        cmd.Parameters.AddWithValue("@t", mp.File.Data.LongLength);
                        cmd.Parameters.AddWithValue("@va", verActual + 1);
                        cmd.Parameters.AddWithValue("@c", (object)categoria ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("@e", (object)etiquetas ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("@id", id);
                        cmd.ExecuteNonQuery();
                    }
                    using (var cmd = new MySqlCommand("INSERT INTO DocumentoVersiones (DocumentoID, NumeroVersion, RutaArchivo, HashSHA256, Notas, CreadoPor) VALUES (@d,@n,@r,@h,@no,@u)", cn, tx))
                    {
                        cmd.Parameters.AddWithValue("@d", id);
                        cmd.Parameters.AddWithValue("@n", verActual + 1);
                        cmd.Parameters.AddWithValue("@r", pathRel);
                        cmd.Parameters.AddWithValue("@h", hash);
                        cmd.Parameters.AddWithValue("@no", (object)notas ?? DBNull.Value);
                        cmd.Parameters.AddWithValue("@u", (object)idUser ?? DBNull.Value);
                        cmd.ExecuteNonQuery();
                    }
                    tx.Commit();
                }
                Audit("DOC_VERSION", ctx, id.ToString());
                Json(ctx.Response, 200, "{\"ok\":true,\"versioned\":true}");
                return;
            }
            else
            {
                using (var cmd = new MySqlCommand("UPDATE Documentos SET Categoria=COALESCE(@c, Categoria), Etiquetas=@e WHERE DocumentoID=@id", cn))
                {
                    cmd.Parameters.AddWithValue("@c", (object)categoria ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@e", (object)etiquetas ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@id", id);
                    cmd.ExecuteNonQuery();
                }
                Audit("DOC_UPDATE_META", ctx, id.ToString());
                Json(ctx.Response, 200, "{\"ok\":true,\"updated\":true}");
            }
        }

        private static void BajaLogica(HttpListenerContext ctx, int id)
        {
            using var cn = new MySqlConnection(ConexionBD.CadenaConexion); cn.Open();
            using (var cmd = new MySqlCommand("UPDATE Documentos SET IsActivo=0 WHERE DocumentoID=@id", cn))
            { cmd.Parameters.AddWithValue("@id", id); cmd.ExecuteNonQuery(); }
            Audit("DOC_SOFT_DELETE", ctx, id.ToString());
            Json(ctx.Response, 200, "{\"ok\":true}");
        }

        private static void Descargar(HttpListenerContext ctx, int id)
        {
            using var cn = new MySqlConnection(ConexionBD.CadenaConexion); cn.Open();
            string pathRel = null, nombre = null, mime = null; long tam = 0;
            using (var cmd = new MySqlCommand(@"SELECT NombreArchivo, AlmacenamientoRuta, MimeType, TamanoBytes FROM Documentos WHERE DocumentoID=@id AND IsActivo=1 LIMIT 1", cn))
            {
                cmd.Parameters.AddWithValue("@id", id);
                using var rd = cmd.ExecuteReader();
                if (rd.Read())
                {
                    nombre = Convert.ToString(rd["NombreArchivo"]) ?? ("archivo_" + id);
                    pathRel = Convert.ToString(rd["AlmacenamientoRuta"]);
                    mime = Convert.ToString(rd["MimeType"]) ?? "application/octet-stream";
                    tam = Convert.ToInt64(rd["TamanoBytes"]);
                }
            }
            if (pathRel == null) { Json(ctx.Response, 404, "{\"ok\":false}"); return; }
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string abs = Path.Combine(baseDir, pathRel.Replace('/', Path.DirectorySeparatorChar));
            if (!File.Exists(abs)) { Json(ctx.Response, 410, "{\"ok\":false,\"code\":\"missing_file\"}"); return; }

            Audit("DOC_DOWNLOAD", ctx, id.ToString());
            var res = ctx.Response;
            res.StatusCode = 200;
            res.ContentType = mime;
            res.Headers["Content-Disposition"] = "attachment; filename=\"" + nombre.Replace("\"", "'") + "\"";
            res.ContentLength64 = new FileInfo(abs).Length;
            using (var fs = File.OpenRead(abs)) { fs.CopyTo(res.OutputStream); }
            res.OutputStream.Close();
        }

        // Helpers
        private static void Json(HttpListenerResponse res, int status, string json)
        { res.StatusCode = status; Http.JsonNoStore(res); var b = Encoding.UTF8.GetBytes(json); res.ContentLength64 = b.Length; res.OutputStream.Write(b, 0, b.Length); res.OutputStream.Close(); }
        private static void Csrf(HttpListenerContext ctx) => Json(ctx.Response, 403, "{\"ok\":false,\"code\":\"csrf_invalid\"}");
        private static int ParseInt(string s, int d) => int.TryParse(s, out var v) ? v : d;
        private static int Clamp(int v, int min, int max) => v < min ? min : (v > max ? max : v);
        private static string Esc(string s) { if (s == null) return string.Empty; return s.Replace("\\", "\\\\").Replace("\"", "\\\""); }
        private static string Limit(string s, int n) { if (string.IsNullOrEmpty(s)) return s; return s.Length <= n ? s : s.Substring(0, n); }
        private static int GetInt(string key, int def) { try { var v1 = System.Configuration.ConfigurationManager.AppSettings[key]; if (!string.IsNullOrEmpty(v1) && int.TryParse(v1, out var n1)) return n1; } catch { } try { var v2 = Environment.GetEnvironmentVariable(key); if (!string.IsNullOrEmpty(v2) && int.TryParse(v2, out var n2)) return n2; } catch { } return def; }

        private static (string safeName, string ext) SafeName(string fileName)
        {
            fileName = fileName ?? "archivo";
            string ext = Path.GetExtension(fileName);
            string name = Path.GetFileNameWithoutExtension(fileName);
            name = name.ToLowerInvariant();
            var sb = new StringBuilder(name.Length);
            foreach (char c in name)
            {
                if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) sb.Append(c);
                else sb.Append('-');
            }
            string slug = sb.ToString().Trim('-'); if (string.IsNullOrEmpty(slug)) slug = "archivo";
            return (slug, string.IsNullOrEmpty(ext) ? "" : ext.ToLowerInvariant());
        }

        private static (string rel, string abs, string sha256, long size) SaveVersion(byte[] data, string ext)
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string store = Path.Combine(baseDir, "storage", "documents");
            Directory.CreateDirectory(store);
            string stamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss", CultureInfo.InvariantCulture);
            string guid = Guid.NewGuid().ToString("n").Substring(0, 12);
            string name = $"{stamp}_{guid}{ext}";
            string abs = Path.Combine(store, name);
            File.WriteAllBytes(abs, data);
            string sha;
            using (var sha256 = SHA256.Create())
            { sha = BitConverter.ToString(sha256.ComputeHash(data)).Replace("-", string.Empty); }
            string rel = $"storage/documents/{name}".Replace('\\','/');
            return (rel, abs, sha, data.LongLength);
        }

        private class Multipart
        {
            public class FilePart { public string FileName; public string ContentType; public byte[] Data; }
            private readonly Dictionary<string, string> _vals = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            public FilePart File { get; set; }
            public string Get(string name) => _vals.TryGetValue(name, out var v) ? v : null;

            public static Multipart Read(HttpListenerRequest req, int maxBytes)
            {
                string ct = req.Headers["Content-Type"] ?? req.ContentType ?? string.Empty;
                if (!ct.StartsWith("multipart/form-data", StringComparison.OrdinalIgnoreCase)) return new Multipart();
                var bpos = ct.IndexOf("boundary=", StringComparison.OrdinalIgnoreCase);
                if (bpos < 0) return null;
                string boundary = "--" + ct.Substring(bpos + 9).Trim().Trim('"');

                using var ms = new MemoryStream();
                req.InputStream.CopyTo(ms);
                if (ms.Length <= 0 || ms.Length > maxBytes) return null;
                byte[] raw = ms.ToArray();
                byte[] b = Encoding.ASCII.GetBytes(boundary);
                int idx = 0;
                // iterate parts
                var mp = new Multipart();
                while (true)
                {
                    int start = IndexOf(raw, b, idx);
                    if (start < 0) break;
                    start += b.Length;
                    // end?
                    if (start + 2 <= raw.Length && raw[start] == (byte)'-' && raw[start+1] == (byte)'-') break;
                    // skip CRLF
                    if (start + 2 <= raw.Length && raw[start] == (byte)'\r' && raw[start+1] == (byte)'\n') start += 2;
                    // headers until CRLFCRLF
                    int headerEnd = IndexOf(raw, Encoding.ASCII.GetBytes("\r\n\r\n"), start);
                    if (headerEnd < 0) break;
                    string headers = Encoding.UTF8.GetString(raw, start, headerEnd - start);
                    int contentStart = headerEnd + 4;
                    int nextBoundary = IndexOf(raw, b, contentStart) - 2; // exclude CRLF
                    if (nextBoundary < 0) break;
                    int contentLen = Math.Max(0, nextBoundary - contentStart);
                    byte[] content = new byte[contentLen]; Array.Copy(raw, contentStart, content, 0, contentLen);

                    // parse headers
                    string name = null; string filename = null; string hct = null;
                    foreach (var line in headers.Split(new[] {"\r\n"}, StringSplitOptions.None))
                    {
                        var l = line.Trim();
                        if (l.StartsWith("Content-Disposition", StringComparison.OrdinalIgnoreCase))
                        {
                            // name="x"; filename="y"
                            foreach (var seg in l.Split(';'))
                            {
                                var t = seg.Trim();
                                if (t.StartsWith("name=", StringComparison.OrdinalIgnoreCase)) name = t.Substring(5).Trim('"');
                                else if (t.StartsWith("filename=", StringComparison.OrdinalIgnoreCase)) filename = t.Substring(9).Trim('"');
                            }
                        }
                        else if (l.StartsWith("Content-Type", StringComparison.OrdinalIgnoreCase))
                        {
                            var parts = l.Split(':'); if (parts.Length == 2) hct = parts[1].Trim();
                        }
                    }

                    if (!string.IsNullOrEmpty(filename) && !string.IsNullOrEmpty(name))
                    {
                        if (content.Length > 0)
                            mp.File = new FilePart { FileName = filename, ContentType = hct, Data = content };
                    }
                    else if (!string.IsNullOrEmpty(name))
                    {
                        var val = Encoding.UTF8.GetString(content);
                        mp._vals[name] = val;
                    }

                    idx = nextBoundary + 2 + b.Length;
                }

                return mp;
            }

            private static string GetVal(Multipart mp, string key) => (mp != null && mp._vals.TryGetValue(key, out var v)) ? v : null;

            private static int IndexOf(byte[] haystack, byte[] needle, int start)
            {
                for (int i = start; i <= haystack.Length - needle.Length; i++)
                {
                    bool ok = true;
                    for (int j = 0; j < needle.Length; j++)
                    { if (haystack[i + j] != needle[j]) { ok = false; break; } }
                    if (ok) return i;
                }
                return -1;
            }
        }

        private static void Audit(string accion, HttpListenerContext ctx, string clave)
        {
            var user = SessionManager.GetUser(ctx.Request);
            int? idUser = AuditLogger.TryResolveUserId(user?.user);
            var (ip, ua) = AuditLogger.Client(ctx.Request);
            AuditLogger.LogAsync(idUser, ctx.Request.HttpMethod, ctx.Request.Url?.AbsolutePath, "Documentos", accion, clave, "OK", null, ip, ua);
        }
    }
}
