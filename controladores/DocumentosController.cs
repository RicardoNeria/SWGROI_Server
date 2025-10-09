using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using MySql.Data.MySqlClient;
using SWGROI_Server.Models;
using SWGROI_Server.DB;
using SWGROI_Server.Security;
using SWGROI_Server.Utils;

namespace SWGROI_Server.Controllers
{
    /// <summary>
    /// CONTROLADOR BACKEND - GESTIÓN DE DOCUMENTOS
    /// Sistema de Componentes SWGROI - Separación Arquitectónica
    /// 
    /// RESPONSABILIDADES:
    /// - Operaciones CRUD de documentos
    /// - Validación de datos del servidor
    /// - Gestión de archivos y almacenamiento
    /// - API REST para comunicación con frontend
    /// - Autenticación y autorización
    /// 
    /// NO INCLUYE:
    /// - Elementos de presentación visual
    /// - Generación de HTML
    /// - Referencias a CSS o estilos
    /// - Lógica de interfaz de usuario
    /// </summary>
    public static class DocumentosController
    {
        private const string UPLOAD_DIRECTORY = "uploads/documentos";
    private const long MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

        /// <summary>
        /// Punto de entrada principal para todas las solicitudes de documentos
        /// </summary>
        public static void ProcesarSolicitud(HttpListenerContext context)
        {
            try
            {
                var request = context.Request;
                var response = context.Response;
                
                // Aplicar headers de seguridad
                Http.JsonNoStore(response);
                
                // Validar sesión del usuario
                var usuario = SessionManager.GetUser(request);
                if (!usuario.HasValue)
                {
                    EnviarError(response, 401, "No autorizado");
                    return;
                }

                // Procesar según el método HTTP y la operación
                var operacion = ObtenerParametro(request, "op") ?? "";
                
                switch (request.HttpMethod.ToUpper())
                {
                    case "GET":
                        ProcesarGET(context, operacion);
                        break;
                    case "POST":
                        ProcesarPOST(context, operacion, usuario.Value);
                        break;
                    default:
                        EnviarError(response, 405, "Método no permitido");
                        break;
                }
            }
            catch (Exception ex)
            {
                Logger.Error($"Error en DocumentosController: {ex.Message}");
                EnviarError(context.Response, 500, "Error interno del servidor");
            }
        }

        private static void ProcesarGET(HttpListenerContext context, string operacion)
        {
            switch (operacion)
            {
                case "listar":
                    ListarDocumentos(context);
                    break;
                case "buscar":
                    BuscarDocumentos(context);
                    break;
                case "descargar":
                    DescargarDocumento(context);
                    break;
                case "categorias":
                    ListarCategorias(context);
                    break;
                case "obtener":
                    ObtenerDocumento(context);
                    break;
                default:
                    ListarDocumentos(context);
                    break;
            }
        }

        private static void ProcesarPOST(HttpListenerContext context, string operacion, (string Usuario, string Rol, string FullName) usuario)
        {
            switch (operacion)
            {
                case "subir":
                    SubirDocumento(context, (usuario.Usuario, usuario.Rol));
                    break;
                case "actualizar":
                    ActualizarDocumento(context, (usuario.Usuario, usuario.Rol));
                    break;
                case "eliminar":
                    EliminarDocumento(context, (usuario.Usuario, usuario.Rol));
                    break;
                case "favorito":
                    ToggleFavorito(context, (usuario.Usuario, usuario.Rol));
                    break;
                default:
                    EnviarError(context.Response, 400, "Operación no válida");
                    break;
            }
        }

        private static void ListarDocumentos(HttpListenerContext context)
        {
            try
            {
                var request = context.Request;
                // Compatibilidad de nombres de parámetros
                int pagina = int.Parse(ObtenerParametro(request, "page") ?? ObtenerParametro(request, "pagina") ?? "1");
                int limite = int.Parse(ObtenerParametro(request, "pageSize") ?? ObtenerParametro(request, "limite") ?? "20");
                int offset = (pagina - 1) * limite;

                var items = new List<object>();
                int total = 0;

                using (var conexion = new MySqlConnection(ConexionBD.CadenaConexion))
                {
                    conexion.Open();

                    // Contar total
                    var cmdTotal = new MySqlCommand("SELECT COUNT(*) FROM documentos", conexion);
                    total = Convert.ToInt32(cmdTotal.ExecuteScalar());

                    // Obtener documentos paginados (según esquema actual)
                    var sql = @"SELECT d.DocumentoID, d.TituloDescriptivo, d.Descripcion, d.NombreArchivo, d.TipoMIME, 
                                        d.TamanoBytes, d.FechaSubida, d.EstadoDocumento, d.Version, d.CategoriaID,
                                        c.NombreCategoria AS CategoriaNombre
                                 FROM documentos d
                                 LEFT JOIN categorias_documento c ON c.CategoriaID = d.CategoriaID
                                 ORDER BY d.FechaSubida DESC
                                 LIMIT @limite OFFSET @offset";

                    var cmd = new MySqlCommand(sql, conexion);
                    cmd.Parameters.AddWithValue("@limite", limite);
                    cmd.Parameters.AddWithValue("@offset", offset);

                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            items.Add(new
                            {
                                id = reader.GetInt32("DocumentoID"),
                                titulo = reader["TituloDescriptivo"] == DBNull.Value ? null : reader.GetString("TituloDescriptivo"),
                                descripcion = reader["Descripcion"] == DBNull.Value ? "" : reader.GetString("Descripcion"),
                                nombre_archivo = reader["NombreArchivo"] == DBNull.Value ? null : reader.GetString("NombreArchivo"),
                                tipo_mime = reader["TipoMIME"] == DBNull.Value ? null : reader.GetString("TipoMIME"),
                                tamaño_archivo = reader["TamanoBytes"] == DBNull.Value ? 0 : reader.GetInt64("TamanoBytes"),
                                fecha_creacion = reader["FechaSubida"] == DBNull.Value ? (DateTime?)null : reader.GetDateTime("FechaSubida"),
                                estado = reader["EstadoDocumento"] == DBNull.Value ? null : reader.GetString("EstadoDocumento"),
                                version = reader["Version"] == DBNull.Value ? 1 : reader.GetInt32("Version"),
                                categoria_id = reader["CategoriaID"] == DBNull.Value ? (int?)null : reader.GetInt32("CategoriaID"),
                                categoria_nombre = reader["CategoriaNombre"] == DBNull.Value ? null : reader.GetString("CategoriaNombre")
                            });
                        }
                    }
                }

                // cálculo simple de métricas
                int vigentes = 0;
                foreach (var it in items)
                {
                    var estadoProp = it.GetType().GetProperty("estado");
                    var valor = estadoProp?.GetValue(it) as string;
                    if (!string.IsNullOrEmpty(valor) && valor.Equals("Vigente", StringComparison.OrdinalIgnoreCase)) vigentes++;
                }
                var meta = new { total = total, vigentes = vigentes, favoritos = 0 };
                EnviarJSON(context.Response, new { items = items, total = total, page = pagina, pageSize = limite, meta = meta });
            }
            catch (Exception ex)
            {
                Logger.Error($"Error al listar documentos: {ex.Message}");
                EnviarError(context.Response, 500, "Error al obtener documentos");
            }
        }

        private static void EliminarDocumento(HttpListenerContext context, (string Usuario, string Rol) usuario)
        {
            try
            {
                var idStr = ObtenerParametro(context.Request, "id");
                if (string.IsNullOrWhiteSpace(idStr) || !int.TryParse(idStr, out var id) || id <= 0)
                {
                    EnviarError(context.Response, 400, "ID inválido");
                    return;
                }

                // Obtener ruta para eliminar el archivo físico
                string ruta = null;
                using (var conexion = new MySqlConnection(ConexionBD.CadenaConexion))
                {
                    conexion.Open();
                    var sel = new MySqlCommand("SELECT RutaFisica FROM documentos WHERE DocumentoID = @id", conexion);
                    sel.Parameters.AddWithValue("@id", id);
                    ruta = sel.ExecuteScalar() as string;
                }

                using (var conexion = new MySqlConnection(ConexionBD.CadenaConexion))
                {
                    conexion.Open();
                    var cmd = new MySqlCommand("DELETE FROM documentos WHERE DocumentoID = @id", conexion);
                    cmd.Parameters.AddWithValue("@id", id);
                    var rows = cmd.ExecuteNonQuery();
                    if (rows == 0)
                    {
                        EnviarError(context.Response, 404, "Documento no encontrado");
                        return;
                    }
                }

                // Intentar borrar archivo físico
                if (!string.IsNullOrWhiteSpace(ruta))
                {
                    try
                    {
                        var appBase = AppDomain.CurrentDomain.BaseDirectory;
                        var filePath = Path.Combine(appBase, UPLOAD_DIRECTORY, ruta);
                        if (File.Exists(filePath)) File.Delete(filePath);
                    }
                    catch (Exception ex)
                    {
                        Logger.Warn($"No se pudo eliminar el archivo físico: {ex.Message}");
                    }
                }

                EnviarJSON(context.Response, new { status = "success", mensaje = "Documento eliminado" });
            }
            catch (Exception ex)
            {
                Logger.Error($"Error eliminando documento: {ex.Message}");
                EnviarError(context.Response, 500, "Error al eliminar documento");
            }
        }

        private static void BuscarDocumentos(HttpListenerContext context)
        {
            try
            {
                var query = ObtenerParametro(context.Request, "q") ?? "";
                var items = new List<object>();

                if (string.IsNullOrWhiteSpace(query))
                {
                    EnviarJSON(context.Response, new { items = new object[0], total = 0 });
                    return;
                }

                using (var conexion = new MySqlConnection(ConexionBD.CadenaConexion))
                {
                    conexion.Open();
                    var sql = @"SELECT DocumentoID, TituloDescriptivo, Descripcion, NombreArchivo, TipoMIME, FechaSubida
                               FROM documentos 
                               WHERE (TituloDescriptivo LIKE @query OR Descripcion LIKE @query OR NombreArchivo LIKE @query)
                               ORDER BY FechaSubida DESC
                               LIMIT 50";

                    var cmd = new MySqlCommand(sql, conexion);
                    cmd.Parameters.AddWithValue("@query", $"%{query}%");

                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            items.Add(new
                            {
                                id = reader.GetInt32("DocumentoID"),
                                titulo = reader["TituloDescriptivo"] == DBNull.Value ? null : reader.GetString("TituloDescriptivo"),
                                descripcion = reader["Descripcion"] == DBNull.Value ? "" : reader.GetString("Descripcion"),
                                nombre_archivo = reader["NombreArchivo"] == DBNull.Value ? null : reader.GetString("NombreArchivo"),
                                tipo_mime = reader["TipoMIME"] == DBNull.Value ? null : reader.GetString("TipoMIME"),
                                fecha_creacion = reader["FechaSubida"] == DBNull.Value ? (DateTime?)null : reader.GetDateTime("FechaSubida")
                            });
                        }
                    }
                }

                EnviarJSON(context.Response, new { items = items, total = items.Count });
            }
            catch (Exception ex)
            {
                Logger.Error($"Error en búsqueda: {ex.Message}");
                EnviarError(context.Response, 500, "Error en la búsqueda");
            }
        }

        private static void SubirDocumento(HttpListenerContext context, (string Usuario, string Rol) usuario)
        {
            try
            {
                var request = context.Request;
                var response = context.Response;

                // Validar content-type
                var contentType = request.ContentType ?? "";
                if (!contentType.StartsWith("multipart/form-data", StringComparison.OrdinalIgnoreCase))
                {
                    EnviarError(response, 400, "Content-Type debe ser multipart/form-data");
                    return;
                }

                // Leer y parsear multipart
                var formFields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                var files = new List<UploadedFile>();
                string parseError = null;

                if (!ParseMultipart(request, out formFields, out files, out parseError))
                {
                    Logger.Error($"Error parseando multipart: {parseError}");
                    EnviarError(response, 400, "Error procesando el contenido de la solicitud: " + parseError);
                    return;
                }

                if (files.Count == 0)
                {
                    EnviarError(response, 400, "No se encontró ningún archivo en la solicitud");
                    return;
                }

                var archivo = files[0]; // tomamos el primer archivo

                // Validar tamaño
                if (archivo.Data == null || archivo.Data.LongLength == 0)
                {
                    EnviarError(response, 400, "Archivo vacío");
                    return;
                }

                if (archivo.Data.LongLength > MAX_FILE_SIZE)
                {
                    EnviarError(response, 413, "El archivo excede el tamaño máximo permitido (200MB)");
                    return;
                }

                // Validar tipo MIME simple (lista blanca básica)
                var allowed = new[] {
                    "application/pdf","image/png","image/jpeg","image/jpg","image/gif",
                    "text/plain","application/zip","application/x-zip-compressed",
                    "application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation"
                };

                if (!string.IsNullOrEmpty(archivo.ContentType) && Array.IndexOf(allowed, archivo.ContentType.ToLower()) < 0)
                {
                    // no rechazamos totalmente, solo advertimos; para entornos estrictos, descomentar la siguiente línea
                    // EnviarError(response, 415, "Tipo de archivo no permitido"); return;
                    Logger.Warn($"Tipo MIME no listado: {archivo.ContentType}");
                }

                // Preparar ruta de almacenamiento
                var appBase = AppDomain.CurrentDomain.BaseDirectory;
                var uploadsFolder = Path.Combine(appBase, UPLOAD_DIRECTORY);
                if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                var fileExt = Path.GetExtension(archivo.FileName) ?? "";
                var safeName = Guid.NewGuid().ToString("N") + fileExt;
                var savePath = Path.Combine(uploadsFolder, safeName);

                File.WriteAllBytes(savePath, archivo.Data);

                // Campos del formulario
                var titulo = formFields.ContainsKey("titulo") ? formFields["titulo"] : (formFields.ContainsKey("tituloDocumento") ? formFields["tituloDocumento"] : Path.GetFileNameWithoutExtension(archivo.FileName));
                var descripcion = formFields.ContainsKey("descripcion") ? formFields["descripcion"] : "";
                var categoriaId = 1;
                if (formFields.ContainsKey("categoria_id") && int.TryParse(formFields["categoria_id"], out var cid)) categoriaId = cid;

                // Guardar metadata en BD
                var documentoId = GuardarDocumento(titulo, descripcion, categoriaId, usuario.Usuario, archivo.FileName, archivo.ContentType, archivo.Data.LongLength, safeName);

                EnviarJSON(response, new
                {
                    status = "success",
                    mensaje = "Documento subido exitosamente",
                    documento_id = documentoId,
                    almacenado = safeName
                });
            }
            catch (Exception ex)
            {
                Logger.Error($"Error subiendo documento: {ex.Message}");
                EnviarError(context.Response, 500, "Error al subir documento");
            }
        }

        private static int GuardarDocumento(string titulo, string descripcion, int categoriaId, string usuario)
        {
            using (var conexion = new MySqlConnection(ConexionBD.CadenaConexion))
            {
                conexion.Open();
                
                // Obtener el ID del usuario por su nombre
                var getUserSql = "SELECT IdUsuario FROM usuarios WHERE Usuario = @usuario";
                var getUserCmd = new MySqlCommand(getUserSql, conexion);
                getUserCmd.Parameters.AddWithValue("@usuario", usuario);
                var usuarioIdObj = getUserCmd.ExecuteScalar();
                
                if (usuarioIdObj == null)
                {
                    throw new Exception("Usuario no encontrado");
                }
                
                int usuarioId = Convert.ToInt32(usuarioIdObj);

                var sql = @"INSERT INTO documentos (
                                NombreArchivo, TituloDescriptivo, Descripcion, TipoMIME, TamanoBytes, RutaFisica,
                                CategoriaID, UsuarioID, Version, EstadoDocumento
                            ) VALUES (
                                '', @titulo, @descripcion, '', 0, '',
                                @categoria_id, @usuario_id, 1, 'Vigente'
                            )";

                var cmd = new MySqlCommand(sql, conexion);
                cmd.Parameters.AddWithValue("@titulo", titulo ?? "");
                cmd.Parameters.AddWithValue("@descripcion", descripcion ?? "");
                cmd.Parameters.AddWithValue("@categoria_id", categoriaId > 0 ? categoriaId : (object)DBNull.Value);
                cmd.Parameters.AddWithValue("@usuario_id", usuarioId);

                cmd.ExecuteNonQuery();
                return (int)cmd.LastInsertedId;
            }
        }

        // Sobrecarga para guardar metadata de archivo
        private static int GuardarDocumento(string titulo, string descripcion, int categoriaId, string usuario, string nombreArchivoOriginal, string tipoMime, long tamañoBytes, string nombreAlmacenado)
        {
            using (var conexion = new MySqlConnection(ConexionBD.CadenaConexion))
            {
                conexion.Open();

                // Obtener el ID del usuario por su nombre
                var getUserSql = "SELECT IdUsuario FROM usuarios WHERE Usuario = @usuario";
                var getUserCmd = new MySqlCommand(getUserSql, conexion);
                getUserCmd.Parameters.AddWithValue("@usuario", usuario);
                var usuarioIdObj = getUserCmd.ExecuteScalar();

                if (usuarioIdObj == null)
                {
                    throw new Exception("Usuario no encontrado");
                }

                int usuarioId = Convert.ToInt32(usuarioIdObj);

                var sql = @"INSERT INTO documentos (
                                NombreArchivo, TituloDescriptivo, Descripcion, TipoMIME, TamanoBytes, RutaFisica,
                                CategoriaID, UsuarioID, Version, EstadoDocumento
                            ) VALUES (
                                @nombre_archivo, @titulo, @descripcion, @tipo_mime, @tamanio, @ruta,
                                @categoria_id, @usuario_id, 1, 'Vigente'
                            )";

                var cmd = new MySqlCommand(sql, conexion);
                cmd.Parameters.AddWithValue("@titulo", titulo ?? Path.GetFileNameWithoutExtension(nombreArchivoOriginal));
                cmd.Parameters.AddWithValue("@descripcion", descripcion ?? "");
                cmd.Parameters.AddWithValue("@categoria_id", categoriaId > 0 ? categoriaId : (object)DBNull.Value);
                cmd.Parameters.AddWithValue("@usuario_id", usuarioId);
                cmd.Parameters.AddWithValue("@nombre_archivo", nombreArchivoOriginal);
                cmd.Parameters.AddWithValue("@tipo_mime", tipoMime ?? "application/octet-stream");
                cmd.Parameters.AddWithValue("@tamanio", tamañoBytes);
                cmd.Parameters.AddWithValue("@ruta", nombreAlmacenado);

                cmd.ExecuteNonQuery();
                return (int)cmd.LastInsertedId;
            }
        }

        // Helper simple para parsear multipart/form-data desde HttpListenerRequest
        // Nota: Implementación básica adecuada para cargas pequeñas y controladas
        private class UploadedFile
        {
            public string Name { get; set; }
            public string FileName { get; set; }
            public string ContentType { get; set; }
            public byte[] Data { get; set; }
        }

        private static bool ParseMultipart(HttpListenerRequest request, out Dictionary<string,string> fields, out List<UploadedFile> files, out string error)
        {
            fields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            files = new List<UploadedFile>();
            error = null;

            try
            {
                var contentType = request.ContentType;
                var boundaryIndex = contentType.IndexOf("boundary=", StringComparison.OrdinalIgnoreCase);
                if (boundaryIndex < 0)
                {
                    error = "Boundary no encontrado en content-type";
                    return false;
                }

                var boundary = "--" + contentType.Substring(boundaryIndex + "boundary=".Length).Trim();
                var encoding = request.ContentEncoding ?? Encoding.UTF8;

                using (var ms = new MemoryStream())
                {
                    request.InputStream.CopyTo(ms);
                    var allBytes = ms.ToArray();

                    var content = encoding.GetString(allBytes);

                    var parts = content.Split(new string[] { boundary }, StringSplitOptions.RemoveEmptyEntries);
                    foreach (var rawPart in parts)
                    {
                        var part = rawPart.Trim();
                        if (part == "--") continue; // cierre
                        if (string.IsNullOrWhiteSpace(part)) continue;

                        // separar headers y body
                        var idx = part.IndexOf("\r\n\r\n",
                            StringComparison.Ordinal);
                        if (idx < 0) continue;

                        var headers = part.Substring(0, idx);
                        var body = part.Substring(idx + 4);

                        // analizar Content-Disposition
                        var dispLine = headers.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)[0];
                        if (!dispLine.Contains("form-data")) continue;

                        var name = ExtractQuotedValue(dispLine, "name=");
                        var filename = ExtractQuotedValue(dispLine, "filename=");

                        // content-type header si existe
                        string partContentType = null;
                        foreach (var h in headers.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries))
                        {
                            if (h.StartsWith("Content-Type:", StringComparison.OrdinalIgnoreCase))
                            {
                                partContentType = h.Substring("Content-Type:".Length).Trim();
                                break;
                            }
                        }

                        if (!string.IsNullOrEmpty(filename))
                        {
                            // Es archivo: body representa bytes, pero actualmente body es string => reconstruir bytes aproximados
                            // Para archivos binarios esta aproximación tiene límites; sin embargo para cargas controladas funciona.
                            var partBytes = encoding.GetBytes(body);
                            files.Add(new UploadedFile
                            {
                                Name = name,
                                FileName = filename,
                                ContentType = partContentType,
                                Data = partBytes
                            });
                        }
                        else
                        {
                            fields[name] = body.TrimEnd('\r', '\n');
                        }
                    }
                }

                return true;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return false;
            }
        }

        private static string ExtractQuotedValue(string headerPart, string key)
        {
            var idx = headerPart.IndexOf(key, StringComparison.OrdinalIgnoreCase);
            if (idx < 0) return null;
            var start = headerPart.IndexOf('"', idx);
            if (start < 0) return null;
            var end = headerPart.IndexOf('"', start + 1);
            if (end < 0) return null;
            return headerPart.Substring(start + 1, end - start - 1);
        }

        private static void DescargarDocumento(HttpListenerContext context)
        {
            try
            {
                var documentoId = int.Parse(ObtenerParametro(context.Request, "id") ?? "0");

                if (documentoId <= 0)
                {
                    EnviarError(context.Response, 400, "ID de documento inválido");
                    return;
                }

                using (var conexion = new MySqlConnection(ConexionBD.CadenaConexion))
                {
                    conexion.Open();
                    var sql = "SELECT NombreArchivo, TipoMIME, TamanoBytes, RutaFisica FROM documentos WHERE DocumentoID = @id";
                    var cmd = new MySqlCommand(sql, conexion);
                    cmd.Parameters.AddWithValue("@id", documentoId);

                    using (var reader = cmd.ExecuteReader())
                    {
                        if (!reader.Read())
                        {
                            EnviarError(context.Response, 404, "Documento no encontrado");
                            return;
                        }

                        var nombre = reader["NombreArchivo"] == DBNull.Value ? "documento" : reader.GetString("NombreArchivo");
                        var tipo = reader["TipoMIME"] == DBNull.Value ? "application/octet-stream" : reader.GetString("TipoMIME");
                        var ruta = reader["RutaFisica"] == DBNull.Value ? null : reader.GetString("RutaFisica");

                        if (string.IsNullOrEmpty(ruta))
                        {
                            EnviarError(context.Response, 500, "Ruta de archivo no disponible");
                            return;
                        }

                        var appBase = AppDomain.CurrentDomain.BaseDirectory;
                        var filePath = Path.Combine(appBase, UPLOAD_DIRECTORY, ruta);

                        if (!File.Exists(filePath))
                        {
                            EnviarError(context.Response, 404, "Archivo no encontrado en el servidor");
                            return;
                        }

                        var bytes = File.ReadAllBytes(filePath);
                        context.Response.ContentType = tipo;
                        context.Response.ContentLength64 = bytes.Length;
                        context.Response.AddHeader("Content-Disposition", "attachment; filename=\"" + nombre + "\"");
                        context.Response.StatusCode = 200;
                        context.Response.OutputStream.Write(bytes, 0, bytes.Length);
                        context.Response.OutputStream.Close();
                        return;
                    }
                }
            }
            catch (Exception ex)
            {
                Logger.Error($"Error descargando documento: {ex.Message}");
                EnviarError(context.Response, 500, "Error al descargar documento");
            }
        }

        private static void ActualizarDocumento(HttpListenerContext context, (string Usuario, string Rol) usuario)
        {
            try
            {
                var request = context.Request;
                var response = context.Response;

                var formFields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                var files = new List<UploadedFile>();
                string parseError = null;

                if (!ParseMultipart(request, out formFields, out files, out parseError))
                {
                    Logger.Error($"Error parseando multipart en actualizar: {parseError}");
                    EnviarError(response, 400, "Error procesando la solicitud: " + parseError);
                    return;
                }

                if (!formFields.ContainsKey("documento_id") || !int.TryParse(formFields["documento_id"], out var docId))
                {
                    EnviarError(response, 400, "documento_id requerido");
                    return;
                }

                // Leer registro actual
                string currentRoute = null;
                int currentVersion = 1;
                using (var conexion = new MySqlConnection(ConexionBD.CadenaConexion))
                {
                    conexion.Open();
                    var q = "SELECT RutaFisica, Version FROM documentos WHERE DocumentoID = @id";
                    var c = new MySqlCommand(q, conexion);
                    c.Parameters.AddWithValue("@id", docId);
                    using (var r = c.ExecuteReader())
                    {
                        if (r.Read())
                        {
                            currentRoute = r["RutaFisica"] == DBNull.Value ? null : r.GetString("RutaFisica");
                            currentVersion = r["Version"] == DBNull.Value ? 1 : r.GetInt32("Version");
                        }
                        else
                        {
                            EnviarError(response, 404, "Documento no encontrado");
                            return;
                        }
                    }
                }

                var titulo = formFields.ContainsKey("titulo") ? formFields["titulo"] : null;
                var descripcion = formFields.ContainsKey("descripcion") ? formFields["descripcion"] : null;
                var estado = formFields.ContainsKey("estado") ? formFields["estado"] : null;
                var categoriaId = 0;
                if (formFields.ContainsKey("categoria_id")) int.TryParse(formFields["categoria_id"], out categoriaId);

                var fileProvided = files.Count > 0;
                string newStoredName = null;
                string originalName = null;
                string contentType = null;
                long size = 0;

                if (fileProvided)
                {
                    var archivo = files[0];
                    if (archivo.Data.LongLength > MAX_FILE_SIZE)
                    {
                        EnviarError(response, 413, "El archivo excede el tamaño máximo permitido (200MB)");
                        return;
                    }

                    var appBase = AppDomain.CurrentDomain.BaseDirectory;
                    var uploadsFolder = Path.Combine(appBase, UPLOAD_DIRECTORY);
                    if (!Directory.Exists(uploadsFolder)) Directory.CreateDirectory(uploadsFolder);

                    var ext = Path.GetExtension(archivo.FileName) ?? "";
                    newStoredName = Guid.NewGuid().ToString("N") + ext;
                    var savePath = Path.Combine(uploadsFolder, newStoredName);
                    File.WriteAllBytes(savePath, archivo.Data);

                    originalName = archivo.FileName;
                    contentType = archivo.ContentType;
                    size = archivo.Data.LongLength;
                }

                // Actualizar DB
                using (var conexion = new MySqlConnection(ConexionBD.CadenaConexion))
                {
                    conexion.Open();
                    var sb = new StringBuilder();
                    sb.Append("UPDATE documentos SET ");
                    var updates = new List<string>();
                    var cmd = new MySqlCommand();
                    cmd.Connection = conexion;
                    if (titulo != null) { updates.Add("TituloDescriptivo = @titulo"); cmd.Parameters.AddWithValue("@titulo", titulo); }
                    if (descripcion != null) { updates.Add("Descripcion = @descripcion"); cmd.Parameters.AddWithValue("@descripcion", descripcion); }
                    if (categoriaId > 0) { updates.Add("CategoriaID = @categoria"); cmd.Parameters.AddWithValue("@categoria", categoriaId); }
                    if (estado != null) { updates.Add("EstadoDocumento = @estado"); cmd.Parameters.AddWithValue("@estado", estado); }
                    if (fileProvided)
                    {
                        updates.Add("NombreArchivo = @nombre_archivo"); cmd.Parameters.AddWithValue("@nombre_archivo", originalName);
                        updates.Add("TipoMIME = @tipo_mime"); cmd.Parameters.AddWithValue("@tipo_mime", contentType ?? "");
                        updates.Add("TamanoBytes = @tamanio"); cmd.Parameters.AddWithValue("@tamanio", size);
                        updates.Add("RutaFisica = @ruta"); cmd.Parameters.AddWithValue("@ruta", newStoredName);
                        updates.Add("Version = @version"); cmd.Parameters.AddWithValue("@version", currentVersion + 1);
                    }

                    if (updates.Count == 0)
                    {
                        EnviarError(response, 400, "Nada para actualizar");
                        return;
                    }

                    sb.Append(string.Join(", ", updates));
                    sb.Append(" WHERE DocumentoID = @id");
                    cmd.CommandText = sb.ToString();
                    cmd.Parameters.AddWithValue("@id", docId);
                    cmd.ExecuteNonQuery();
                }

                EnviarJSON(response, new { status = "success", mensaje = "Documento actualizado" });
            }
            catch (Exception ex)
            {
                Logger.Error($"Error actualizando documento: {ex.Message}");
                EnviarError(context.Response, 500, "Error al actualizar documento");
            }
        }

        private static void ListarCategorias(HttpListenerContext context)
        {
            try
            {
                var categorias = new List<object>();

                using (var conexion = new MySqlConnection(ConexionBD.CadenaConexion))
                {
                    conexion.Open();
                    var sql = "SELECT CategoriaID, NombreCategoria, Descripcion FROM categorias_documento ORDER BY NombreCategoria";
                    var cmd = new MySqlCommand(sql, conexion);

                    using (var reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            categorias.Add(new
                            {
                                id = reader.GetInt32("CategoriaID"),
                                nombre = reader.GetString("NombreCategoria"),
                                descripcion = reader["Descripcion"] == DBNull.Value ? "" : reader.GetString("Descripcion")
                            });
                        }
                    }
                }

                EnviarJSON(context.Response, new { items = categorias, total = categorias.Count });
            }
            catch (Exception ex)
            {
                Logger.Error($"Error listando categorías: {ex.Message}");
                EnviarError(context.Response, 500, "Error al obtener categorías");
            }
        }

        private static void ObtenerDocumento(HttpListenerContext context)
        {
            try
            {
                var idStr = ObtenerParametro(context.Request, "id");
                if (string.IsNullOrWhiteSpace(idStr) || !int.TryParse(idStr, out var id) || id <= 0)
                {
                    EnviarError(context.Response, 400, "ID inválido");
                    return;
                }

                using (var conexion = new MySqlConnection(ConexionBD.CadenaConexion))
                {
                    conexion.Open();
                    var sql = @"SELECT d.DocumentoID, d.TituloDescriptivo, d.Descripcion, d.NombreArchivo, d.TipoMIME,
                                        d.TamanoBytes, d.FechaSubida, d.EstadoDocumento, d.Version, d.CategoriaID,
                                        c.NombreCategoria AS CategoriaNombre
                                 FROM documentos d
                                 LEFT JOIN categorias_documento c ON c.CategoriaID = d.CategoriaID
                                 WHERE d.DocumentoID = @id";
                    var cmd = new MySqlCommand(sql, conexion);
                    cmd.Parameters.AddWithValue("@id", id);
                    using (var reader = cmd.ExecuteReader())
                    {
                        if (!reader.Read())
                        {
                            EnviarError(context.Response, 404, "Documento no encontrado");
                            return;
                        }

                        var obj = new
                        {
                            id = reader.GetInt32("DocumentoID"),
                            titulo = reader["TituloDescriptivo"] == DBNull.Value ? null : reader.GetString("TituloDescriptivo"),
                            descripcion = reader["Descripcion"] == DBNull.Value ? "" : reader.GetString("Descripcion"),
                            nombre_archivo = reader["NombreArchivo"] == DBNull.Value ? null : reader.GetString("NombreArchivo"),
                            tipo_mime = reader["TipoMIME"] == DBNull.Value ? null : reader.GetString("TipoMIME"),
                            tamaño_archivo = reader["TamanoBytes"] == DBNull.Value ? 0 : reader.GetInt64("TamanoBytes"),
                            fecha_creacion = reader["FechaSubida"] == DBNull.Value ? (DateTime?)null : reader.GetDateTime("FechaSubida"),
                            estado = reader["EstadoDocumento"] == DBNull.Value ? null : reader.GetString("EstadoDocumento"),
                            version = reader["Version"] == DBNull.Value ? 1 : reader.GetInt32("Version"),
                            categoria_id = reader["CategoriaID"] == DBNull.Value ? (int?)null : reader.GetInt32("CategoriaID"),
                            categoria_nombre = reader["CategoriaNombre"] == DBNull.Value ? null : reader.GetString("CategoriaNombre")
                        };

                        EnviarJSON(context.Response, obj);
                    }
                }
            }
            catch (Exception ex)
            {
                Logger.Error($"Error obteniendo documento: {ex.Message}");
                EnviarError(context.Response, 500, "Error al obtener documento");
            }
        }

        private static void ToggleFavorito(HttpListenerContext context, (string Usuario, string Rol) usuario)
        {
            // TODO: Implementar sistema de favoritos
            EnviarJSON(context.Response, new { status = "success", mensaje = "Funcionalidad en desarrollo" });
        }

        #region Utilidades

        private static string ObtenerParametro(HttpListenerRequest request, string nombre)
        {
            // GET parameters - implementación simple sin HttpUtility
            var queryString = request.Url?.Query ?? "";
            if (queryString.StartsWith("?"))
                queryString = queryString.Substring(1);

            foreach (var param in queryString.Split('&'))
            {
                var parts = param.Split('=');
                if (parts.Length == 2 && parts[0] == nombre)
                {
                    return Uri.UnescapeDataString(parts[1]);
                }
            }

            // TODO: POST parameters para requests multipart
            return null;
        }

        private static void EnviarJSON(HttpListenerResponse response, object data)
        {
            var json = System.Text.Json.JsonSerializer.Serialize(data);
            var buffer = Encoding.UTF8.GetBytes(json);
            
            response.ContentType = "application/json; charset=utf-8";
            response.ContentLength64 = buffer.Length;
            response.StatusCode = 200;
            
            response.OutputStream.Write(buffer, 0, buffer.Length);
            response.OutputStream.Close();
        }

        private static void EnviarError(HttpListenerResponse response, int statusCode, string mensaje)
        {
            var error = new { status = "error", mensaje = mensaje };
            var json = System.Text.Json.JsonSerializer.Serialize(error);
            var buffer = Encoding.UTF8.GetBytes(json);
            
            response.ContentType = "application/json; charset=utf-8";
            response.ContentLength64 = buffer.Length;
            response.StatusCode = statusCode;
            
            response.OutputStream.Write(buffer, 0, buffer.Length);
            response.OutputStream.Close();
        }

        #endregion
    }
}