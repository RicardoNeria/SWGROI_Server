using System;
using System.Collections.Generic;
using MySql.Data.MySqlClient;
using SWGROI_Server.DB;

namespace SWGROI_Server.Servicios
{
    public static class TicketsService
    {
        public static bool ExisteTicket(MySqlConnection conexion, string folio)
        {
            using var cmd = new MySqlCommand("SELECT 1 FROM tickets WHERE Folio=@F LIMIT 1", conexion);
            cmd.Parameters.AddWithValue("@F", folio);
            var r = cmd.ExecuteScalar();
            return r != null;
        }

        public static int InsertarTicket(MySqlConnection conexion, string folio, string descripcion, string tipoAsunto, string responsable, string estado, string comentario)
        {
            string sql = @"INSERT INTO tickets (Folio, Descripcion, TipoAsunto, Responsable, Estado, Comentario, FechaRegistro)
                           VALUES (@Folio,@Descripcion,@TipoAsunto,@Responsable,@Estado,@Comentario,NOW())";
            using var cmd = new MySqlCommand(sql, conexion);
            cmd.Parameters.AddWithValue("@Folio", folio);
            cmd.Parameters.AddWithValue("@Descripcion", descripcion);
            cmd.Parameters.AddWithValue("@TipoAsunto", tipoAsunto);
            cmd.Parameters.AddWithValue("@Responsable", responsable);
            cmd.Parameters.AddWithValue("@Estado", estado);
            cmd.Parameters.AddWithValue("@Comentario", comentario ?? "");
            return cmd.ExecuteNonQuery();
        }

        public static int InsertarTicketCompat(MySqlConnection conexion, string folio, string descripcion, string responsable, string estado, string comentario)
        {
            string alt = @"INSERT INTO tickets (Folio, Descripcion, Responsable, Estado, Comentario, FechaRegistro)
                           VALUES (@Folio,@Descripcion,@Responsable,@Estado,@Comentario,NOW())";
            using var cmd2 = new MySqlCommand(alt, conexion);
            cmd2.Parameters.AddWithValue("@Folio", folio);
            cmd2.Parameters.AddWithValue("@Descripcion", descripcion);
            cmd2.Parameters.AddWithValue("@Responsable", responsable);
            cmd2.Parameters.AddWithValue("@Estado", estado);
            cmd2.Parameters.AddWithValue("@Comentario", comentario ?? "");
            return cmd2.ExecuteNonQuery();
        }

        public static int ActualizarTicket(MySqlConnection conexion, string folio, string descripcion, string tipoAsunto, string responsable, string estado)
        {
            string sql = @"UPDATE tickets SET Descripcion=@Descripcion, TipoAsunto=@TipoAsunto, Responsable=@Responsable, Estado=@Estado, FechaActualizacion=NOW() WHERE Folio=@Folio";
            using var cmd = new MySqlCommand(sql, conexion);
            cmd.Parameters.AddWithValue("@Descripcion", descripcion);
            cmd.Parameters.AddWithValue("@TipoAsunto", tipoAsunto);
            cmd.Parameters.AddWithValue("@Responsable", responsable);
            cmd.Parameters.AddWithValue("@Estado", estado);
            cmd.Parameters.AddWithValue("@Folio", folio);
            return cmd.ExecuteNonQuery();
        }

        public static int ActualizarTicketCompat(MySqlConnection conexion, string folio, string descripcion, string responsable, string estado)
        {
            string sql = @"UPDATE tickets SET Descripcion=@Descripcion, Responsable=@Responsable, Estado=@Estado WHERE Folio=@Folio";
            using var cmd = new MySqlCommand(sql, conexion);
            cmd.Parameters.AddWithValue("@Descripcion", descripcion);
            cmd.Parameters.AddWithValue("@Responsable", responsable);
            cmd.Parameters.AddWithValue("@Estado", estado);
            cmd.Parameters.AddWithValue("@Folio", folio);
            return cmd.ExecuteNonQuery();
        }

        public static int EliminarTicket(MySqlConnection conexion, string folio)
        {
            using var cmd = new MySqlCommand("DELETE FROM tickets WHERE Folio=@Folio LIMIT 1", conexion);
            cmd.Parameters.AddWithValue("@Folio", folio);
            return cmd.ExecuteNonQuery();
        }
    }
}
