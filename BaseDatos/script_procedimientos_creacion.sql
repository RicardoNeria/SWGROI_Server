-- SCRIPT: PROCEDIMIENTOS DE CREACIÓN (USUARIOS, TICKETS, AVISOS)
-- Extraído desde el antiguo script_comandos_creacion.sql
-- Compatibilidad: MySQL 8+. Usa DROP IF EXISTS + CREATE y DELIMITER.

USE swgroi_db;

DELIMITER $$

-- Crear Usuario
DROP PROCEDURE IF EXISTS CrearUsuario$$
CREATE PROCEDURE CrearUsuario(
    IN p_NombreCompleto VARCHAR(100),
    IN p_Usuario VARCHAR(50),
    IN p_Contrasena VARCHAR(200),
    IN p_Rol VARCHAR(50)
)
BEGIN
    INSERT INTO usuarios (NombreCompleto, Usuario, Contrasena, Rol)
    VALUES (p_NombreCompleto, UPPER(TRIM(p_Usuario)), p_Contrasena, UPPER(TRIM(p_Rol)))
    ON DUPLICATE KEY UPDATE
        NombreCompleto = VALUES(NombreCompleto),
        Contrasena = VALUES(Contrasena),
        Rol = VALUES(Rol);
END$$

-- Crear Ticket
DROP PROCEDURE IF EXISTS CrearTicket$$
CREATE PROCEDURE CrearTicket(
    IN p_Folio VARCHAR(20),
    IN p_Descripcion VARCHAR(500),
    IN p_TipoAsunto VARCHAR(50),
    IN p_Estado VARCHAR(50),
    IN p_Responsable VARCHAR(100),
    IN p_Comentario VARCHAR(1000)
)
BEGIN
    INSERT INTO tickets (
        Folio, Descripcion, TipoAsunto, Estado, Responsable, Comentario, FechaRegistro
    ) VALUES (
        UPPER(TRIM(p_Folio)), p_Descripcion, p_TipoAsunto, p_Estado, p_Responsable, COALESCE(p_Comentario,''), NOW()
    )
    ON DUPLICATE KEY UPDATE
        Descripcion = VALUES(Descripcion),
        TipoAsunto = VALUES(TipoAsunto),
        Estado = VALUES(Estado),
        Responsable = VALUES(Responsable),
        Comentario = VALUES(Comentario),
        FechaActualizacion = NOW();
END$$

-- Crear Aviso
DROP PROCEDURE IF EXISTS CrearAviso$$
CREATE PROCEDURE CrearAviso(
    IN p_Asunto VARCHAR(255),
    IN p_Mensaje TEXT,
    IN p_Activo BOOLEAN
)
BEGIN
    INSERT INTO avisos (Fecha, Asunto, Mensaje, Activo, FechaCreacion)
    VALUES (NOW(), p_Asunto, p_Mensaje, COALESCE(p_Activo, TRUE), NOW());
END$$

DELIMITER ;

-- ============================================================
-- DATOS INICIALES (DEMO) – Usuarios, Avisos y Tickets (10/10/10)
-- Puedes comentar este bloque si no deseas poblar datos de ejemplo.
-- ============================================================

-- Usuarios demo (contraseña en texto plano: 123456; el backend migra a PBKDF2 al iniciar sesión)
CALL CrearUsuario('Admin Demo 01','admin.demo01','123456','Administrador');
CALL CrearUsuario('Admin Demo 02','admin.demo02','123456','Administrador');
CALL CrearUsuario('Usuario Demo 01','usuario.demo01','123456','Usuario');
CALL CrearUsuario('Usuario Demo 02','usuario.demo02','123456','Usuario');
CALL CrearUsuario('Usuario Demo 03','usuario.demo03','123456','Usuario');
CALL CrearUsuario('Usuario Demo 04','usuario.demo04','123456','Usuario');
CALL CrearUsuario('Usuario Demo 05','usuario.demo05','123456','Usuario');
CALL CrearUsuario('Usuario Demo 06','usuario.demo06','123456','Usuario');
CALL CrearUsuario('Usuario Demo 07','usuario.demo07','123456','Usuario');
CALL CrearUsuario('Usuario Demo 08','usuario.demo08','123456','Usuario');

-- Avisos demo (idempotentes por Asunto)
INSERT INTO avisos (Fecha, Asunto, Mensaje, Activo, FechaCreacion)
SELECT NOW(), 'Demo Aviso 01', 'Este es un aviso de demostración 01', TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM avisos WHERE Asunto='Demo Aviso 01');
INSERT INTO avisos (Fecha, Asunto, Mensaje, Activo, FechaCreacion)
SELECT NOW(), 'Demo Aviso 02', 'Este es un aviso de demostración 02', TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM avisos WHERE Asunto='Demo Aviso 02');
INSERT INTO avisos (Fecha, Asunto, Mensaje, Activo, FechaCreacion)
SELECT NOW(), 'Demo Aviso 03', 'Este es un aviso de demostración 03', TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM avisos WHERE Asunto='Demo Aviso 03');
INSERT INTO avisos (Fecha, Asunto, Mensaje, Activo, FechaCreacion)
SELECT NOW(), 'Demo Aviso 04', 'Este es un aviso de demostración 04', TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM avisos WHERE Asunto='Demo Aviso 04');
INSERT INTO avisos (Fecha, Asunto, Mensaje, Activo, FechaCreacion)
SELECT NOW(), 'Demo Aviso 05', 'Este es un aviso de demostración 05', TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM avisos WHERE Asunto='Demo Aviso 05');
INSERT INTO avisos (Fecha, Asunto, Mensaje, Activo, FechaCreacion)
SELECT NOW(), 'Demo Aviso 06', 'Este es un aviso de demostración 06', TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM avisos WHERE Asunto='Demo Aviso 06');
INSERT INTO avisos (Fecha, Asunto, Mensaje, Activo, FechaCreacion)
SELECT NOW(), 'Demo Aviso 07', 'Este es un aviso de demostración 07', TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM avisos WHERE Asunto='Demo Aviso 07');
INSERT INTO avisos (Fecha, Asunto, Mensaje, Activo, FechaCreacion)
SELECT NOW(), 'Demo Aviso 08', 'Este es un aviso de demostración 08', TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM avisos WHERE Asunto='Demo Aviso 08');
INSERT INTO avisos (Fecha, Asunto, Mensaje, Activo, FechaCreacion)
SELECT NOW(), 'Demo Aviso 09', 'Este es un aviso de demostración 09', TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM avisos WHERE Asunto='Demo Aviso 09');
INSERT INTO avisos (Fecha, Asunto, Mensaje, Activo, FechaCreacion)
SELECT NOW(), 'Demo Aviso 10', 'Este es un aviso de demostración 10', TRUE, NOW()
WHERE NOT EXISTS (SELECT 1 FROM avisos WHERE Asunto='Demo Aviso 10');

-- Tickets demo (utiliza valores válidos de dominio)
SET @ESTADO1='Almacén', @ESTADO2='Capturado', @ESTADO3='Programado/Asignado', @ESTADO4='Abierto', @ESTADO5='En Proceso', @ESTADO6='Cerrado';
SET @TA1='Mantenimiento correctivo', @TA2='Mantenimiento preventivo', @TA3='Sistema de cerca eléctrica', @TA4='Sistema de videovigilancia (CCTV)', @TA5='Fallo en la comunicación del sistema', @TA6='Gestión de claves de acceso', @TA7='Capacitación técnica y asesoría sobre la aplicación', @TA8='Levantamiento de necesidades operativas', @TA9='Instalación de nuevo equipo', @TA10='Instalación de componentes específicos';

CALL CrearTicket('TKT-DEMO-001','Prueba de flujo demo 001', @TA1, @ESTADO4, 'usuario.demo01', '');
CALL CrearTicket('TKT-DEMO-002','Prueba de flujo demo 002', @TA2, @ESTADO2, 'usuario.demo02', '');
CALL CrearTicket('TKT-DEMO-003','Prueba de flujo demo 003', @TA3, @ESTADO3, 'usuario.demo03', '');
CALL CrearTicket('TKT-DEMO-004','Prueba de flujo demo 004', @TA4, @ESTADO5, 'usuario.demo04', '');
CALL CrearTicket('TKT-DEMO-005','Prueba de flujo demo 005', @TA5, @ESTADO1, 'usuario.demo05', '');
CALL CrearTicket('TKT-DEMO-006','Prueba de flujo demo 006', @TA6, @ESTADO6, 'usuario.demo06', '');
CALL CrearTicket('TKT-DEMO-007','Prueba de flujo demo 007', @TA7, @ESTADO4, 'usuario.demo07', '');
CALL CrearTicket('TKT-DEMO-008','Prueba de flujo demo 008', @TA8, @ESTADO3, 'usuario.demo08', '');
CALL CrearTicket('TKT-DEMO-009','Prueba de flujo demo 009', @TA9, @ESTADO2, 'usuario.demo02', '');
CALL CrearTicket('TKT-DEMO-010','Prueba de flujo demo 010', @TA10, @ESTADO5, 'usuario.demo01', '');
