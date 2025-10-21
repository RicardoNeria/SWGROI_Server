-- procedures.sql
-- Ejecutar este archivo en un cliente que soporte DELIMITER (mysql CLI, Workbench)

DELIMITER $$

DROP PROCEDURE IF EXISTS BuscarDocumentos$$
CREATE PROCEDURE BuscarDocumentos(
    IN p_texto_busqueda VARCHAR(300),
    IN p_categoria_id INT,
    IN p_estado VARCHAR(20),
    IN p_usuario_id INT,
    IN p_es_publico BOOLEAN,
    IN p_fecha_desde DATE,
    IN p_fecha_hasta DATE,
    IN p_limite INT,
    IN p_offset INT
)
BEGIN
    DECLARE sql_query TEXT DEFAULT '';
    DECLARE sql_where TEXT DEFAULT ' WHERE d.EstadoDocumento != ''Eliminado'' ';
    DECLARE sql_params TEXT DEFAULT '';

    IF p_texto_busqueda IS NOT NULL AND p_texto_busqueda != '' THEN
        SET sql_where = CONCAT(sql_where, ' AND (MATCH(d.TituloDescriptivo, d.Descripcion, d.Etiquetas) AGAINST (''', p_texto_busqueda, ''' IN NATURAL LANGUAGE MODE) OR d.NombreArchivo LIKE ''%', p_texto_busqueda, '%'') ');
    END IF;

    IF p_categoria_id IS NOT NULL THEN
        SET sql_where = CONCAT(sql_where, ' AND d.CategoriaID = ', p_categoria_id, ' ');
    END IF;

    IF p_estado IS NOT NULL THEN
        SET sql_where = CONCAT(sql_where, ' AND d.EstadoDocumento = ''', p_estado, ''' ');
    END IF;

    IF p_usuario_id IS NOT NULL THEN
        SET sql_where = CONCAT(sql_where, ' AND d.UsuarioID = ', p_usuario_id, ' ');
    END IF;

    IF p_es_publico IS NOT NULL THEN
        SET sql_where = CONCAT(sql_where, ' AND d.EsPublico = ', p_es_publico, ' ');
    END IF;

    IF p_fecha_desde IS NOT NULL THEN
        SET sql_where = CONCAT(sql_where, ' AND d.FechaSubida >= ''', p_fecha_desde, ''' ');
    END IF;

    IF p_fecha_hasta IS NOT NULL THEN
        SET sql_where = CONCAT(sql_where, ' AND d.FechaSubida <= ''', p_fecha_hasta, ''' ');
    END IF;

    SET sql_query = CONCAT(
        'SELECT * FROM vista_documentos_completa d ',
        sql_where,
        ' ORDER BY d.FechaModificacion DESC '
    );

    IF p_limite IS NOT NULL THEN
        SET sql_query = CONCAT(sql_query, ' LIMIT ', p_limite);
        IF p_offset IS NOT NULL THEN
            SET sql_query = CONCAT(sql_query, ' OFFSET ', p_offset);
        END IF;
    END IF;

    SET @sql = sql_query;
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$

-- Procedimiento para crear nueva versión de documento
DROP PROCEDURE IF EXISTS CrearVersionDocumento$$
CREATE PROCEDURE CrearVersionDocumento(
    IN p_documento_maestro INT,
    IN p_nuevo_archivo VARCHAR(255),
    IN p_titulo VARCHAR(300),
    IN p_ruta_fisica VARCHAR(500),
    IN p_tamano BIGINT,
    IN p_hash VARCHAR(64),
    IN p_usuario_id INT,
    IN p_notas_version TEXT,
    OUT p_nuevo_documento_id INT
)
BEGIN
    DECLARE v_siguiente_version INT;
    DECLARE v_categoria_id INT;
    DECLARE v_mime_type VARCHAR(100);

    SELECT MAX(Version) + 1, CategoriaID, TipoMIME
    INTO v_siguiente_version, v_categoria_id, v_mime_type
    FROM documentos 
    WHERE DocumentoMaestro = p_documento_maestro OR DocumentoID = p_documento_maestro;

    INSERT INTO documentos (
        NombreArchivo, TituloDescriptivo, TipoMIME, TamanoBytes, 
        HashSHA256, RutaFisica, CategoriaID, UsuarioID, Version,
        DocumentoMaestro, EstadoDocumento, NotasVersion
    ) VALUES (
        p_nuevo_archivo, p_titulo, v_mime_type, p_tamano,
        p_hash, p_ruta_fisica, v_categoria_id, p_usuario_id, v_siguiente_version,
        p_documento_maestro, 'Vigente', p_notas_version
    );

    SET p_nuevo_documento_id = LAST_INSERT_ID();

    UPDATE documentos 
    SET EstadoDocumento = 'Obsoleto' 
    WHERE (DocumentoMaestro = p_documento_maestro OR DocumentoID = p_documento_maestro) 
    AND DocumentoID != p_nuevo_documento_id;

    INSERT INTO auditoria_documentos (DocumentoID, UsuarioID, Accion, DetalleAccion)
    VALUES (p_nuevo_documento_id, p_usuario_id, 'Subida', CONCAT('Nueva versión ', v_siguiente_version, ' del documento'));
END$$

-- Procedimiento para auditoría de acciones
DROP PROCEDURE IF EXISTS RegistrarAccionDocumento$$
CREATE PROCEDURE RegistrarAccionDocumento(
    IN p_documento_id INT,
    IN p_usuario_id INT,
    IN p_accion VARCHAR(20),
    IN p_detalle VARCHAR(500),
    IN p_ip VARCHAR(45),
    IN p_user_agent VARCHAR(300)
)
BEGIN
    INSERT INTO auditoria_documentos (
        DocumentoID, UsuarioID, Accion, DetalleAccion, DireccionIP, UserAgent
    ) VALUES (
        p_documento_id, p_usuario_id, p_accion, p_detalle, p_ip, p_user_agent
    );
END$$

-- Procedimiento para actualizar métricas diarias (ejecutar con CRON)
DROP PROCEDURE IF EXISTS ActualizarMetricasCCC$$
CREATE PROCEDURE ActualizarMetricasCCC(IN fecha_calculo DATE)
BEGIN
  DECLARE total_generadas INT DEFAULT 0;
  DECLARE total_contestadas INT DEFAULT 0;
  DECLARE promedio_satisfaccion DECIMAL(3,2) DEFAULT 0.00;
  DECLARE promedio_atencion DECIMAL(3,2) DEFAULT 0.00;
  DECLARE promedio_tiempo DECIMAL(3,2) DEFAULT 0.00;
  DECLARE promedio_solucion DECIMAL(3,2) DEFAULT 0.00;
  DECLARE promedio_recomendacion DECIMAL(3,2) DEFAULT 0.00;
  DECLARE tickets_con_encuesta INT DEFAULT 0;
  DECLARE tickets_sin_encuesta INT DEFAULT 0;

  SET @inicio := fecha_calculo;
  SET @fin := DATE_ADD(fecha_calculo, INTERVAL 1 DAY);

  SELECT COUNT(*) INTO total_generadas
  FROM retroalimentacion 
  WHERE FechaCreacion >= @inicio AND FechaCreacion < @fin;

  SELECT COUNT(*) INTO total_contestadas
  FROM retroalimentacion r
  INNER JOIN respuestas_retroalimentacion rr ON r.RetroID = rr.RetroID
  WHERE rr.FechaRespuesta >= @inicio AND rr.FechaRespuesta < @fin;

  SELECT 
    AVG((CAST(Pregunta1_Atencion_Operador AS SIGNED) + 
       CAST(Pregunta2_Tiempo_Respuesta AS SIGNED) + 
       CAST(Pregunta3_Solucion_Brindada AS SIGNED) + 
       CAST(Pregunta4_Recomendacion AS SIGNED)) / 4.0),
    AVG(CAST(Pregunta1_Atencion_Operador AS SIGNED)),
    AVG(CAST(Pregunta2_Tiempo_Respuesta AS SIGNED)),
    AVG(CAST(Pregunta3_Solucion_Brindada AS SIGNED)),
    AVG(CAST(Pregunta4_Recomendacion AS SIGNED))
  INTO promedio_satisfaccion, promedio_atencion, promedio_tiempo, promedio_solucion, promedio_recomendacion
  FROM respuestas_retroalimentacion
  WHERE FechaRespuesta >= @inicio AND FechaRespuesta < @fin;

  SELECT COUNT(DISTINCT r.TicketID) INTO tickets_con_encuesta
  FROM retroalimentacion r
  WHERE r.FechaCreacion >= @inicio AND r.FechaCreacion < @fin;

  SELECT COUNT(*) - tickets_con_encuesta INTO tickets_sin_encuesta
  FROM tickets 
  WHERE FechaRegistro >= @inicio AND FechaRegistro < @fin;

  INSERT INTO metricas_retroalimentacion 
  (Periodo, TotalEncuestasGeneradas, TotalEncuestasContestadas, 
   PromedioSatisfaccion, PromedioAtencionOperador, PromedioTiempoRespuesta,
   PromedioSolucion, PromedioRecomendacion, TicketsConEncuesta, TicketsSinEncuesta)
  VALUES 
  (fecha_calculo, total_generadas, total_contestadas, 
   IFNULL(promedio_satisfaccion, 0), IFNULL(promedio_atencion, 0), IFNULL(promedio_tiempo, 0),
   IFNULL(promedio_solucion, 0), IFNULL(promedio_recomendacion, 0), tickets_con_encuesta, tickets_sin_encuesta)
  ON DUPLICATE KEY UPDATE
    TotalEncuestasGeneradas = VALUES(TotalEncuestasGeneradas),
    TotalEncuestasContestadas = VALUES(TotalEncuestasContestadas),
    PromedioSatisfaccion = VALUES(PromedioSatisfaccion),
    PromedioAtencionOperador = VALUES(PromedioAtencionOperador),
    PromedioTiempoRespuesta = VALUES(PromedioTiempoRespuesta),
    PromedioSolucion = VALUES(PromedioSolucion),
    PromedioRecomendacion = VALUES(PromedioRecomendacion),
    TicketsConEncuesta = VALUES(TicketsConEncuesta),
    TicketsSinEncuesta = VALUES(TicketsSinEncuesta);
END$$

DELIMITER ;
