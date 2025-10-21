using System;
using MySql.Data.MySqlClient;
using SWGROI_Server.DB;

namespace SWGROI_Server.Utils
{
    public static class DataSeeder
    {
        public static void SeedAvisos()
        {
            Console.WriteLine("=== Insertando datos de prueba para avisos ===");
            
            try
            {
                using (var conexion = new MySqlConnection(ConexionBD.CadenaConexion))
                {
                    conexion.Open();
                    Console.WriteLine("Conexión a base de datos exitosa");
                    
                    // Verificar si ya hay datos
                    string countQuery = "SELECT COUNT(*) FROM avisos";
                    using (var countCmd = new MySqlCommand(countQuery, conexion))
                    {
                        int count = Convert.ToInt32(countCmd.ExecuteScalar());
                        Console.WriteLine($"Avisos existentes: {count}");
                        
                        if (count > 0)
                        {
                            Console.WriteLine("Ya existen avisos, no insertando datos de prueba");
                            return;
                        }
                    }
                    
                    // Insertar datos de prueba
                    string insertQuery = @"
                        INSERT INTO avisos (Asunto, Mensaje) VALUES 
                        ('Bienvenidos al Sistema SWGROI', 'Este es el primer aviso del sistema. ¡Bienvenidos a nuestra plataforma de gestión!'),
                        ('Mantenimiento Programado', 'Se realizará mantenimiento programado el próximo domingo de 2:00 AM a 6:00 AM. El sistema estará temporalmente no disponible.'),
                        ('Nueva Funcionalidad Disponible', 'Hemos agregado nuevas funcionalidades al módulo de tickets y reportes. Consulte la documentación para más detalles.'),
                        ('Aviso Importante de Seguridad', 'Se han implementado nuevas medidas de seguridad. Todos los usuarios deben actualizar sus contraseñas.'),
                        ('Capacitación Programada', 'Se llevará a cabo una sesión de capacitación el viernes 29 de septiembre a las 10:00 AM.');
                    ";
                    
                    using (var insertCmd = new MySqlCommand(insertQuery, conexion))
                    {
                        int affected = insertCmd.ExecuteNonQuery();
                        Console.WriteLine($"Avisos insertados: {affected}");
                    }
                    
                    // Verificar inserción
                    using (var verifyCmd = new MySqlCommand("SELECT COUNT(*) FROM avisos", conexion))
                    {
                        int newCount = Convert.ToInt32(verifyCmd.ExecuteScalar());
                        Console.WriteLine($"Total avisos después de inserción: {newCount}");
                    }
                }
                
                Console.WriteLine("=== Datos de prueba insertados exitosamente ===");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Advertencia: No se pudo conectar a la base de datos: {ex.Message}");
                Console.WriteLine("El servidor continuará funcionando sin datos de prueba");
            }
        }
    }
}