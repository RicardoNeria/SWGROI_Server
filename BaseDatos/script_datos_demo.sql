-- SCRIPT: DATOS DEMO (10 usuarios, 10 avisos, 10 tickets)
-- Ejecutar después de crear el esquema. Idempotente para usuarios y tickets.

USE swgroi_db;

-- =========================
-- Usuarios demo (password plano: 123456)
-- Se migrarán a PBKDF2 en el primer login automáticamente.
-- =========================
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

-- =========================
-- Avisos demo (protegidos contra duplicado por Asunto)
-- =========================
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

-- =========================
-- Tickets demo (TipoAsunto y Estado válidos)
-- =========================
-- Conjunto de valores válidos
SET @ESTADO1='Almacén', @ESTADO2='Capturado', @ESTADO3='Programado/Asignado', @ESTADO4='Abierto', @ESTADO5='En Proceso', @ESTADO6='Cerrado';
SET @TA1='Mantenimiento correctivo', @TA2='Mantenimiento preventivo', @TA3='Sistema de cerca eléctrica', @TA4='Sistema de videovigilancia (CCTV)', @TA5='Fallo en la comunicación del sistema', @TA6='Gestión de claves de acceso', @TA7='Capacitación técnica y asesoría sobre la aplicación', @TA8='Levantamiento de necesidades operativas', @TA9='Instalación de nuevo equipo', @TA10='Instalación de componentes específicos';

-- Usar procedimiento para respetar actualizaciones si ya existen folios
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
