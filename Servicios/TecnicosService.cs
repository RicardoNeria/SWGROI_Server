using System;
using System.Collections.Generic;
using System.Data;
using MySql.Data.MySqlClient;
using SWGROI_Server.DB;

namespace SWGROI_Server.Servicios
{
    public static class TecnicosService
    {
        public static List<Dictionary<string, object>> ListarTickets(MySqlConnection conexion)
        {
            var lista = new List<Dictionary<string, object>>();
            string query = @"SELECT Folio, Descripcion, TipoAsunto, Estado, Responsable, Comentario, FechaRegistro, FechaActualizacion FROM tickets ORDER BY FechaRegistro DESC";
            using var cmd = new MySqlCommand(query, conexion);
            using var rdr = cmd.ExecuteReader();
            while (rdr.Read())
            {
                var ticket = new Dictionary<string, object>
                {
                    ["Folio"] = rdr["Folio"].ToString() ?? "",
                    ["Descripcion"] = rdr["Descripcion"].ToString() ?? "",
                    ["TipoAsunto"] = rdr["TipoAsunto"] == DBNull.Value ? "" : rdr["TipoAsunto"].ToString(),
                    ["Estado"] = rdr["Estado"].ToString() ?? "",
                    ["Responsable"] = rdr["Responsable"].ToString() ?? "",
                    ["Comentario"] = rdr["Comentario"] == DBNull.Value ? "" : rdr["Comentario"].ToString(),
                    ["FechaRegistro"] = rdr["FechaRegistro"] == DBNull.Value ? "" : ((DateTime)rdr["FechaRegistro"]).ToString("yyyy-MM-dd HH:mm:ss"),
                    ["FechaActualizacion"] = rdr["FechaActualizacion"] == DBNull.Value ? "" : ((DateTime)rdr["FechaActualizacion"]).ToString("yyyy-MM-dd HH:mm:ss")
                };
                lista.Add(ticket);
            }
            return lista;
        }

        public static Dictionary<string, object> ObtenerTicketPorFolio(MySqlConnection conexion, string folio)
        {
            string query = @"SELECT Folio, Descripcion, Comentario, TipoAsunto, Estado, Responsable, FechaRegistro, FechaActualizacion FROM tickets WHERE Folio=@Folio LIMIT 1";
            using var cmd = new MySqlCommand(query, conexion);
            cmd.Parameters.AddWithValue("@Folio", folio);
            using var rdr = cmd.ExecuteReader();
            if (!rdr.Read()) return null;
            return new Dictionary<string, object>
            {
                ["Folio"] = rdr["Folio"].ToString() ?? "",
                ["Descripcion"] = rdr["Descripcion"].ToString() ?? "",
                ["Comentario"] = rdr["Comentario"] == DBNull.Value ? "" : rdr["Comentario"].ToString(),
                ["TipoAsunto"] = rdr["TipoAsunto"] == DBNull.Value ? "" : rdr["TipoAsunto"].ToString(),
                ["Estado"] = rdr["Estado"].ToString() ?? "",
                ["Responsable"] = rdr["Responsable"].ToString() ?? "",
                ["FechaRegistro"] = rdr["FechaRegistro"] == DBNull.Value ? "" : ((DateTime)rdr["FechaRegistro"]).ToString("yyyy-MM-dd HH:mm:ss"),
                ["FechaActualizacion"] = rdr["FechaActualizacion"] == DBNull.Value ? "" : ((DateTime)rdr["FechaActualizacion"]).ToString("yyyy-MM-dd HH:mm:ss")
            };
        }

        public static int ActualizarEstado(MySqlConnection conexion, string folio, string estado, string comentario)
        {
            string sql = @"UPDATE tickets SET Estado=@Estado, Comentario=@Comentario, FechaActualizacion=NOW() WHERE Folio=@Folio";
            using var cmd = new MySqlCommand(sql, conexion);
            cmd.Parameters.AddWithValue("@Estado", estado);
            cmd.Parameters.AddWithValue("@Comentario", comentario ?? "");
            cmd.Parameters.AddWithValue("@Folio", folio);
            return cmd.ExecuteNonQuery();
        }
    }
}
