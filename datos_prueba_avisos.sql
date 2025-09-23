-- Script para insertar datos de prueba en avisos
USE swgroi_db;

INSERT INTO avisos (Asunto, Mensaje) VALUES 
('Bienvenidos al Sistema SWGROI', 'Este es el primer aviso del sistema. ¡Bienvenidos a nuestra plataforma de gestión!'),
('Mantenimiento Programado', 'Se realizará mantenimiento programado el próximo domingo de 2:00 AM a 6:00 AM. El sistema estará temporalmente no disponible.'),
('Nueva Funcionalidad Disponible', 'Hemos agregado nuevas funcionalidades al módulo de tickets y reportes. Consulte la documentación para más detalles.'),
('Aviso Importante de Seguridad', 'Se han implementado nuevas medidas de seguridad. Todos los usuarios deben actualizar sus contraseñas.'),
('Capacitación Programada', 'Se llevará a cabo una sesión de capacitación el viernes 29 de septiembre a las 10:00 AM.');

-- Verificar que se insertaron los datos
SELECT COUNT(*) as total_avisos FROM avisos;
SELECT * FROM avisos ORDER BY Fecha DESC;