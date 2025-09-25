-- Verificación y creación de tablas de retroalimentación
USE swgroi_db;

-- Verificar si las tablas existen
SHOW TABLES LIKE 'retroalimentacion';
SHOW TABLES LIKE 'respuestas_retroalimentacion';

-- Crear tabla retroalimentacion si no existe
CREATE TABLE IF NOT EXISTS retroalimentacion (
  RetroID INT NOT NULL AUTO_INCREMENT,
  Cliente VARCHAR(100) NOT NULL,
  EnlaceUnico VARCHAR(255) NOT NULL,
  UsuarioID INT,
  TicketID INT,
  FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  Estado ENUM('Pendiente', 'Contestada', 'Expirada') DEFAULT 'Pendiente',
  PRIMARY KEY (RetroID),
  UNIQUE KEY uq_retro_enlace (EnlaceUnico),
  UNIQUE KEY uq_retro_ticket (TicketID),
  KEY idx_retro_usuario (UsuarioID),
  KEY idx_retro_fecha (FechaCreacion),
  KEY idx_retro_estado (Estado),
  CONSTRAINT retroalimentacion_ibfk_1 FOREIGN KEY (UsuarioID) REFERENCES usuarios (IdUsuario),
  CONSTRAINT retroalimentacion_ibfk_2 FOREIGN KEY (TicketID) REFERENCES tickets (Id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Crear tabla respuestas_retroalimentacion si no existe
CREATE TABLE IF NOT EXISTS respuestas_retroalimentacion (
  RespuestaID INT NOT NULL AUTO_INCREMENT,
  RetroID INT NOT NULL,
  Pregunta1_Atencion_Operador VARCHAR(1000),
  Pregunta2_Tiempo_Respuesta VARCHAR(1000),
  Pregunta3_Solucion_Brindada VARCHAR(1000),
  Pregunta4_Recomendacion VARCHAR(1000),
  Pregunta5_Comentarios VARCHAR(1000),
  FechaRespuesta DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (RespuestaID),
  KEY idx_respuestas_retro (RetroID),
  KEY idx_respuestas_fecha (FechaRespuesta),
  CONSTRAINT respuestas_retroalimentacion_ibfk_1 FOREIGN KEY (RetroID) REFERENCES retroalimentacion (RetroID) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Verificar las columnas de la tabla retroalimentacion
DESC retroalimentacion;

-- Verificar las columnas de la tabla respuestas_retroalimentacion  
DESC respuestas_retroalimentacion;

-- Consulta de prueba
SELECT COUNT(*) as total_retroalimentacion FROM retroalimentacion;
SELECT COUNT(*) as total_respuestas FROM respuestas_retroalimentacion;