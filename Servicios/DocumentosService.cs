using System;
using System.Collections.Generic;
using MySql.Data.MySqlClient;

namespace SWGROI_Server.Servicios
{
    public static class DocumentosService
    {
        // Obtiene documentos desde la vista unificada con filtros básicos (nulos = sin filtrar)
        public static List<Dictionary<string, object>> Listar(MySqlConnection conexion, int? limite = 100, int? offset = 0)
        {
            var lista = new List<Dictionary<string, object>>();
            string sql = "SELECT * FROM vista_documentos_completa ORDER BY FechaModificacion DESC" + (limite.HasValue ? " LIMIT @LIM" : "") + (offset.HasValue ? " OFFSET @OFF" : "");
            using var cmd = new MySqlCommand(sql, conexion);
            if (limite.HasValue) cmd.Parameters.AddWithValue("@LIM", limite.Value);
            if (offset.HasValue) cmd.Parameters.AddWithValue("@OFF", offset.Value);
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                var row = new Dictionary<string, object>();
                for (int i = 0; i < rdr.FieldCount; i++)
                {
                    var name = rdr.GetName(i);
                    var val = rdr.IsDBNull(i) ? null : rdr.GetValue(i);
                    row[name] = val;
                }
                lista.Add(row);
            }
            return lista;
        }

        // Ejecuta el procedimiento de búsqueda avanzada si está instalado
        public static List<Dictionary<string, object>> Buscar(MySqlConnection conexion, string texto, int? categoria, string estado, int? usuarioId, bool? esPublico, DateTime? desde, DateTime? hasta, int? limite, int? offset)
        {
            var lista = new List<Dictionary<string, object>>();
            using var cmd = new MySqlCommand("BuscarDocumentos", conexion) { CommandType = System.Data.CommandType.StoredProcedure };
            cmd.Parameters.AddWithValue("p_texto_busqueda", (object)texto ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_categoria_id", (object)categoria ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_estado", (object)estado ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_usuario_id", (object)usuarioId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_es_publico", (object)esPublico ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_fecha_desde", (object)desde ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_fecha_hasta", (object)hasta ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_limite", (object)limite ?? DBNull.Value);
            cmd.Parameters.AddWithValue("p_offset", (object)offset ?? DBNull.Value);
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                var row = new Dictionary<string, object>();
                for (int i = 0; i < rdr.FieldCount; i++)
                {
                    var name = rdr.GetName(i);
                    var val = rdr.IsDBNull(i) ? null : rdr.GetValue(i);
                    row[name] = val;
                }
                lista.Add(row);
            }
            return lista;
        }
    }
}
