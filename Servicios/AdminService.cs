using System;
using System.Collections.Generic;
using System.Data;
using MySql.Data.MySqlClient;
using SWGROI_Server.DB;

namespace SWGROI_Server.Services
{
    // Servicio de dominio para Administración de Usuarios
    // Encapsula la lógica de datos usada por AdminController
    public static class AdminService
    {
        public static int CountUsuarios(string filtroTexto, string filtroRol)
        {
            using var conexion = new MySqlConnection(ConexionBD.CadenaConexion);
            conexion.Open();
            var wheres = new List<string>();
            if (!string.IsNullOrWhiteSpace(filtroTexto)) wheres.Add("(NombreCompleto LIKE @txt OR Usuario LIKE @txt)");
            if (!string.IsNullOrWhiteSpace(filtroRol)) wheres.Add("Rol = @rol");
            var whereSql = wheres.Count > 0 ? (" WHERE " + string.Join(" AND ", wheres)) : string.Empty;
            using var cmd = new MySqlCommand("SELECT COUNT(*) FROM usuarios" + whereSql, conexion);
            if (!string.IsNullOrWhiteSpace(filtroTexto)) cmd.Parameters.AddWithValue("@txt", "%" + filtroTexto + "%");
            if (!string.IsNullOrWhiteSpace(filtroRol)) cmd.Parameters.AddWithValue("@rol", filtroRol);
            var o = cmd.ExecuteScalar();
            return Convert.ToInt32(o);
        }

        public static IDataReader GetUsuarios(string filtroTexto, string filtroRol, int page, int size)
        {
            var conexion = new MySqlConnection(ConexionBD.CadenaConexion);
            conexion.Open();
            var wheres = new List<string>();
            if (!string.IsNullOrWhiteSpace(filtroTexto)) wheres.Add("(NombreCompleto LIKE @txt OR Usuario LIKE @txt)");
            if (!string.IsNullOrWhiteSpace(filtroRol)) wheres.Add("Rol = @rol");
            var whereSql = wheres.Count > 0 ? (" WHERE " + string.Join(" AND ", wheres)) : string.Empty;
            int offset = (page - 1) * size;
            var cmd = new MySqlCommand("SELECT * FROM usuarios" + whereSql + " ORDER BY IdUsuario LIMIT @size OFFSET @offset", conexion);
            if (!string.IsNullOrWhiteSpace(filtroTexto)) cmd.Parameters.AddWithValue("@txt", "%" + filtroTexto + "%");
            if (!string.IsNullOrWhiteSpace(filtroRol)) cmd.Parameters.AddWithValue("@rol", filtroRol);
            cmd.Parameters.AddWithValue("@size", size);
            cmd.Parameters.AddWithValue("@offset", offset);
            // El caller es responsable de cerrar reader y conexión
            return cmd.ExecuteReader(CommandBehavior.CloseConnection);
        }
    }
}
