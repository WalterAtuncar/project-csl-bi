--
-- PostgreSQL database dump
--

\restrict nrDO2I7xxqCjPmodwt265TdklY6se0i7mzrn9xm4SKSManqM0gtUtQSaQAcfaHu

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

-- Started on 2025-11-25 00:44:07

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 8 (class 2615 OID 16437)
-- Name: medico; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA medico;


ALTER SCHEMA medico OWNER TO postgres;

--
-- TOC entry 1357 (class 1247 OID 16446)
-- Name: direccion_mensaje; Type: TYPE; Schema: medico; Owner: postgres
--

CREATE TYPE medico.direccion_mensaje AS ENUM (
    'entrante',
    'saliente'
);


ALTER TYPE medico.direccion_mensaje OWNER TO postgres;

--
-- TOC entry 1360 (class 1247 OID 16452)
-- Name: tipo_movimiento_financiero; Type: TYPE; Schema: medico; Owner: postgres
--

CREATE TYPE medico.tipo_movimiento_financiero AS ENUM (
    'ingreso',
    'egreso'
);


ALTER TYPE medico.tipo_movimiento_financiero OWNER TO postgres;

--
-- TOC entry 1354 (class 1247 OID 16439)
-- Name: tipo_operacion; Type: TYPE; Schema: medico; Owner: postgres
--

CREATE TYPE medico.tipo_operacion AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE'
);


ALTER TYPE medico.tipo_operacion OWNER TO postgres;

--
-- TOC entry 678 (class 1255 OID 21757)
-- Name: actualizar_cantidad_dispensada(); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.actualizar_cantidad_dispensada() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE DETALLE_RECETA
    SET 
        cantidad_dispensada = cantidad_dispensada + NEW.cantidad_entregada,
        cantidad_pendiente = cantidad_prescrita - (cantidad_dispensada + NEW.cantidad_entregada)
    WHERE detalle_receta_id = NEW.detalle_receta_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION medico.actualizar_cantidad_dispensada() OWNER TO postgres;

--
-- TOC entry 691 (class 1255 OID 21759)
-- Name: actualizar_estado_receta(); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.actualizar_estado_receta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_total_prescrito NUMERIC;
    v_total_dispensado NUMERIC;
    v_receta_id BIGINT;
BEGIN
    -- Obtener receta_id del detalle
    SELECT receta_id INTO v_receta_id
    FROM DETALLE_RECETA
    WHERE detalle_receta_id = NEW.detalle_receta_id;
    
    -- Calcular totales
    SELECT 
        SUM(cantidad_prescrita),
        SUM(cantidad_dispensada)
    INTO v_total_prescrito, v_total_dispensado
    FROM DETALLE_RECETA
    WHERE receta_id = v_receta_id;
    
    -- Actualizar estado
    IF v_total_dispensado = 0 THEN
        UPDATE RECETA SET estado_receta_id = (SELECT estado_receta_id FROM ESTADO_RECETA WHERE codigo = 'pendiente')
        WHERE receta_id = v_receta_id;
    ELSIF v_total_dispensado < v_total_prescrito THEN
        UPDATE RECETA SET estado_receta_id = (SELECT estado_receta_id FROM ESTADO_RECETA WHERE codigo = 'dispensada_parcial')
        WHERE receta_id = v_receta_id;
    ELSIF v_total_dispensado >= v_total_prescrito THEN
        UPDATE RECETA SET estado_receta_id = (SELECT estado_receta_id FROM ESTADO_RECETA WHERE codigo = 'dispensada_total')
        WHERE receta_id = v_receta_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION medico.actualizar_estado_receta() OWNER TO postgres;

--
-- TOC entry 677 (class 1255 OID 21755)
-- Name: actualizar_stock_lote(); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.actualizar_stock_lote() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_tipo_movimiento VARCHAR(20);
    v_afecta_stock VARCHAR(20);
BEGIN
    -- Obtener tipo de movimiento
    SELECT tma.afecta_stock INTO v_afecta_stock
    FROM TIPO_MOVIMIENTO_ALMACEN tma
    INNER JOIN MOVIMIENTO_ALMACEN ma ON tma.tipo_movimiento_id = ma.tipo_movimiento_id
    WHERE ma.movimiento_id = NEW.movimiento_id;
    
    -- Actualizar stock según tipo
    IF v_afecta_stock = 'aumenta' THEN
        UPDATE LOTE_PRODUCTO 
        SET cantidad_actual = cantidad_actual + NEW.cantidad
        WHERE lote_id = NEW.lote_id;
    ELSIF v_afecta_stock = 'disminuye' THEN
        UPDATE LOTE_PRODUCTO 
        SET cantidad_actual = cantidad_actual - NEW.cantidad
        WHERE lote_id = NEW.lote_id;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION medico.actualizar_stock_lote() OWNER TO postgres;

--
-- TOC entry 693 (class 1255 OID 21763)
-- Name: actualizar_totales_caja(); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.actualizar_totales_caja() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE APERTURA_CAJA
    SET 
        monto_ingresos = (
            SELECT COALESCE(SUM(monto), 0)
            FROM MOVIMIENTO_CAJA
            WHERE apertura_id = NEW.apertura_id 
            AND tipo_movimiento = 'ingreso'
            AND eliminado = FALSE
        ),
        monto_egresos = (
            SELECT COALESCE(SUM(monto), 0)
            FROM MOVIMIENTO_CAJA
            WHERE apertura_id = NEW.apertura_id 
            AND tipo_movimiento = 'egreso'
            AND eliminado = FALSE
        ),
        monto_final_sistema = monto_inicial + 
            (SELECT COALESCE(SUM(CASE WHEN tipo_movimiento = 'ingreso' THEN monto ELSE -monto END), 0)
             FROM MOVIMIENTO_CAJA
             WHERE apertura_id = NEW.apertura_id AND eliminado = FALSE)
    WHERE apertura_id = NEW.apertura_id;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION medico.actualizar_totales_caja() OWNER TO postgres;

--
-- TOC entry 668 (class 1255 OID 21751)
-- Name: calcular_edad(date); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.calcular_edad(fecha_nac date) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    RETURN DATE_PART('year', AGE(CURRENT_DATE, fecha_nac));
END;
$$;


ALTER FUNCTION medico.calcular_edad(fecha_nac date) OWNER TO postgres;

--
-- TOC entry 669 (class 1255 OID 21752)
-- Name: calcular_imc(numeric, numeric); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.calcular_imc(peso_kg numeric, talla_cm numeric) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
    IF talla_cm IS NULL OR talla_cm = 0 OR peso_kg IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN ROUND(peso_kg / POWER(talla_cm / 100, 2), 2);
END;
$$;


ALTER FUNCTION medico.calcular_imc(peso_kg numeric, talla_cm numeric) OWNER TO postgres;

--
-- TOC entry 692 (class 1255 OID 21761)
-- Name: calcular_totales_comprobante(); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.calcular_totales_comprobante() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_subtotal NUMERIC := 0;
    v_igv NUMERIC := 0;
    v_total NUMERIC := 0;
BEGIN
    -- Calcular totales
    SELECT 
        COALESCE(SUM(subtotal), 0),
        COALESCE(SUM(igv), 0),
        COALESCE(SUM(total), 0)
    INTO v_subtotal, v_igv, v_total
    FROM DETALLE_COMPROBANTE
    WHERE comprobante_id = COALESCE(NEW.comprobante_id, OLD.comprobante_id);
    
    -- Actualizar comprobante
    UPDATE COMPROBANTE
    SET 
        subtotal = v_subtotal,
        igv = v_igv,
        total = v_total
    WHERE comprobante_id = COALESCE(NEW.comprobante_id, OLD.comprobante_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION medico.calcular_totales_comprobante() OWNER TO postgres;

--
-- TOC entry 701 (class 1255 OID 21814)
-- Name: fn_indicadores_dia(date, bigint); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.fn_indicadores_dia(p_fecha date, p_organizacion_id bigint) RETURNS TABLE(total_atenciones bigint, total_emergencias bigint, total_hospitalizados bigint, total_altas bigint, total_citas bigint, total_recetas bigint, total_examenes bigint, total_facturado numeric, ocupacion_camas numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT a.atencion_id)::BIGINT,
        COUNT(DISTINCT CASE WHEN ta.codigo = 'EMERGENCIA' THEN a.atencion_id END)::BIGINT,
        COUNT(DISTINCT h.hospitalizacion_id)::BIGINT,
        COUNT(DISTINCT CASE WHEN h.fecha_hora_alta_hospitalaria::DATE = p_fecha THEN h.hospitalizacion_id END)::BIGINT,
        COUNT(DISTINCT c.cita_id)::BIGINT,
        COUNT(DISTINCT r.receta_id)::BIGINT,
        COUNT(DISTINCT se.solicitud_id)::BIGINT,
        COALESCE(SUM(comp.total), 0),
        CASE WHEN COUNT(cam.cama_id) > 0 
             THEN ROUND((COUNT(CASE WHEN ec_cam.codigo = 'ocupada' THEN 1 END)::NUMERIC / COUNT(cam.cama_id)::NUMERIC * 100), 2)
             ELSE 0 
        END
    FROM ORGANIZACION org
    LEFT JOIN ATENCION a ON org.organizacion_id = a.organizacion_id 
        AND a.fecha_hora_registro::DATE = p_fecha 
        AND a.eliminado = FALSE
    LEFT JOIN TIPO_ATENCION ta ON a.tipo_atencion_id = ta.tipo_atencion_id
    LEFT JOIN HOSPITALIZACION h ON org.organizacion_id = h.atencion_id 
        AND h.eliminado = FALSE
        AND (h.fecha_hora_ingreso_hospitalario::DATE <= p_fecha AND (h.fecha_hora_alta_hospitalaria IS NULL OR h.fecha_hora_alta_hospitalaria::DATE >= p_fecha))
    LEFT JOIN CITA c ON a.atencion_id = c.agenda_id 
        AND DATE(c.fecha_hora_programada) = p_fecha 
        AND c.eliminado = FALSE
    LEFT JOIN RECETA r ON a.atencion_id = r.atencion_id 
        AND r.fecha_emision::DATE = p_fecha 
        AND r.eliminado = FALSE
    LEFT JOIN SOLICITUD_EXAMEN se ON a.atencion_id = se.atencion_id 
        AND se.fecha_solicitud::DATE = p_fecha 
        AND se.eliminado = FALSE
    LEFT JOIN COMPROBANTE comp ON a.atencion_id = comp.atencion_id 
        AND comp.fecha_emision = p_fecha 
        AND comp.eliminado = FALSE
    LEFT JOIN SEDE sed ON org.organizacion_id = sed.organizacion_id
    LEFT JOIN CAMA cam ON sed.sede_id = cam.sede_id AND cam.eliminado = FALSE
    LEFT JOIN ESTADO_CAMA ec_cam ON cam.estado_cama_id = ec_cam.estado_cama_id
    WHERE org.organizacion_id = p_organizacion_id;
END;
$$;


ALTER FUNCTION medico.fn_indicadores_dia(p_fecha date, p_organizacion_id bigint) OWNER TO postgres;

--
-- TOC entry 695 (class 1255 OID 21800)
-- Name: generar_numero_atencion(bigint); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.generar_numero_atencion(p_organizacion_id bigint) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_numero VARCHAR;
    v_anio VARCHAR;
BEGIN
    v_anio := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_numero := 'ATN-' || v_anio || '-' || LPAD(nextval('seq_numero_atencion')::TEXT, 6, '0');
    RETURN v_numero;
END;
$$;


ALTER FUNCTION medico.generar_numero_atencion(p_organizacion_id bigint) OWNER TO postgres;

--
-- TOC entry 697 (class 1255 OID 21802)
-- Name: generar_numero_cita(); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.generar_numero_cita() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_numero VARCHAR;
    v_fecha VARCHAR;
BEGIN
    v_fecha := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    v_numero := 'CIT-' || v_fecha || '-' || LPAD(nextval('seq_numero_cita')::TEXT, 4, '0');
    RETURN v_numero;
END;
$$;


ALTER FUNCTION medico.generar_numero_cita() OWNER TO postgres;

--
-- TOC entry 696 (class 1255 OID 21801)
-- Name: generar_numero_historia_clinica(bigint); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.generar_numero_historia_clinica(p_organizacion_id bigint) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_numero VARCHAR;
    v_anio VARCHAR;
BEGIN
    v_anio := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_numero := 'HC-' || v_anio || '-' || LPAD(nextval('seq_numero_historia_clinica')::TEXT, 6, '0');
    RETURN v_numero;
END;
$$;


ALTER FUNCTION medico.generar_numero_historia_clinica(p_organizacion_id bigint) OWNER TO postgres;

--
-- TOC entry 672 (class 1255 OID 21804)
-- Name: generar_numero_hospitalizacion(); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.generar_numero_hospitalizacion() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_numero VARCHAR;
    v_anio VARCHAR;
BEGIN
    v_anio := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_numero := 'HOSP-' || v_anio || '-' || LPAD(nextval('seq_numero_hospitalizacion')::TEXT, 6, '0');
    RETURN v_numero;
END;
$$;


ALTER FUNCTION medico.generar_numero_hospitalizacion() OWNER TO postgres;

--
-- TOC entry 671 (class 1255 OID 21803)
-- Name: generar_numero_receta(); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.generar_numero_receta() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_numero VARCHAR;
    v_anio VARCHAR;
BEGIN
    v_anio := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_numero := 'REC-' || v_anio || '-' || LPAD(nextval('seq_numero_receta')::TEXT, 8, '0');
    RETURN v_numero;
END;
$$;


ALTER FUNCTION medico.generar_numero_receta() OWNER TO postgres;

--
-- TOC entry 676 (class 1255 OID 21859)
-- Name: get_permissions_by_role(integer); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.get_permissions_by_role(p_rol_id integer) RETURNS TABLE(permiso_id integer, modulo text, accion text, descripcion text)
    LANGUAGE sql
    AS $$
  SELECT p.permiso_id, p.modulo, p.accion, p.descripcion
  FROM medico.permiso p
  JOIN medico.rol_permiso rp ON rp.permiso_id = p.permiso_id
  WHERE rp.rol_id = p_rol_id
  ORDER BY p.modulo, p.accion;
$$;


ALTER FUNCTION medico.get_permissions_by_role(p_rol_id integer) OWNER TO postgres;

--
-- TOC entry 683 (class 1255 OID 21860)
-- Name: get_sidebar_by_role_json(integer); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.get_sidebar_by_role_json(p_rol_id integer) RETURNS jsonb
    LANGUAGE sql
    AS $$
  WITH grouped AS (
    SELECT p.modulo,
           jsonb_agg(
             jsonb_build_object(
               'id', p.accion,
               'label', COALESCE(p.descripcion, p.accion)
             ) ORDER BY p.accion
           ) AS items
    FROM medico.permiso p
    JOIN medico.rol_permiso rp ON rp.permiso_id = p.permiso_id
    WHERE rp.rol_id = p_rol_id
    GROUP BY p.modulo
  )
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object('modulo', modulo, 'items', items)
             ORDER BY modulo
           ),
           '[]'::jsonb
         )
  FROM grouped;
$$;


ALTER FUNCTION medico.get_sidebar_by_role_json(p_rol_id integer) OWNER TO postgres;

--
-- TOC entry 694 (class 1255 OID 21765)
-- Name: log_auditoria_cambios(); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.log_auditoria_cambios() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO LOG_AUDITORIA_SISTEMA (
            tabla_afectada,
            operacion,
            registro_id,
            usuario_id,
            valores_nuevos_json
        ) VALUES (
            TG_TABLE_NAME,
            'INSERT'::tipo_operacion,
            NEW.id,
            NEW.usuario_creacion_id,
            row_to_json(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO LOG_AUDITORIA_SISTEMA (
            tabla_afectada,
            operacion,
            registro_id,
            usuario_id,
            valores_anteriores_json,
            valores_nuevos_json
        ) VALUES (
            TG_TABLE_NAME,
            'UPDATE'::tipo_operacion,
            NEW.id,
            NEW.usuario_actualizacion_id,
            row_to_json(OLD),
            row_to_json(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO LOG_AUDITORIA_SISTEMA (
            tabla_afectada,
            operacion,
            registro_id,
            usuario_id,
            valores_anteriores_json
        ) VALUES (
            TG_TABLE_NAME,
            'DELETE'::tipo_operacion,
            OLD.id,
            OLD.usuario_eliminacion_id,
            row_to_json(OLD)
        );
        RETURN OLD;
    END IF;
END;
$$;


ALTER FUNCTION medico.log_auditoria_cambios() OWNER TO postgres;

--
-- TOC entry 732 (class 1255 OID 21858)
-- Name: sp_authenticateuser(character varying, character varying); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_authenticateuser(p_username character varying, p_password_hash character varying) RETURNS TABLE(usuarioid bigint, personalid bigint, username character varying, rolid bigint, personaid bigint, apellidopaterno character varying, apellidomaterno character varying, nombres character varying, fotourl text, codigoempleado character varying, tipopersonalid bigint, cargoid bigint, colegiatura character varying, rne character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Actualizar último acceso del usuario
    UPDATE medico.usuario u
    SET 
        ultimo_acceso = NOW(),
        fecha_actualizacion = NOW()
    WHERE 
        u.username = p_username 
        AND u.password_hash = p_password_hash
        AND u.estado = 'activo'
        AND u.eliminado = FALSE;
    
    -- Verificar si se actualizó algún registro (usuario válido)
    IF NOT FOUND THEN
        -- No se encontró usuario válido, retornar vacío
        RETURN;
    END IF;
    
    -- Retornar información completa del usuario autenticado
    RETURN QUERY
    SELECT 
        -- Claims para JWT (con aliases que coincidan con AuthenticationResult)
        u.usuario_id AS UsuarioId,
        u.personal_id AS PersonalId,
        u.username AS Username,
        u.rol_id AS RolId,
        p.persona_id AS PersonaId,
        
        -- Datos adicionales para response (con aliases que coincidan con AuthenticationResult)
        p.apellido_paterno AS ApellidoPaterno,
        p.apellido_materno AS ApellidoMaterno,
        p.nombres AS Nombres,
        p.foto_url AS FotoUrl,
        per.codigo_empleado AS CodigoEmpleado,
        per.tipo_personal_id AS TipoPersonalId,
        per.cargo_id AS CargoId,
        per.colegiatura AS Colegiatura,
        per.rne AS Rne
    FROM medico.usuario u
    INNER JOIN medico.personal per ON u.personal_id = per.personal_id
    INNER JOIN medico.persona p ON per.persona_id = p.persona_id
    WHERE 
        u.username = p_username 
        AND u.password_hash = p_password_hash
        AND u.estado = 'activo'
        AND u.eliminado = FALSE
        AND per.estado = 'activo'
        AND per.eliminado = FALSE
        AND p.estado = 'activo'
        AND p.eliminado = FALSE;
END;
$$;


ALTER FUNCTION medico.sp_authenticateuser(p_username character varying, p_password_hash character varying) OWNER TO postgres;

--
-- TOC entry 8387 (class 0 OID 0)
-- Dependencies: 732
-- Name: FUNCTION sp_authenticateuser(p_username character varying, p_password_hash character varying); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_authenticateuser(p_username character varying, p_password_hash character varying) IS 'Autentica un usuario y devuelve información completa para JWT y response';


--
-- TOC entry 699 (class 1255 OID 21812)
-- Name: sp_cambiar_cama_paciente(bigint, bigint, text, bigint, bigint); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_cambiar_cama_paciente(p_hospitalizacion_id bigint, p_cama_destino_id bigint, p_motivo text, p_personal_autoriza_id bigint, p_usuario_id bigint) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_cama_origen_id BIGINT;
BEGIN
    -- Obtener cama actual
    SELECT cama_actual_id INTO v_cama_origen_id
    FROM HOSPITALIZACION
    WHERE hospitalizacion_id = p_hospitalizacion_id;
    
    -- Validar que la cama destino esté disponible
    IF EXISTS (
        SELECT 1 FROM CAMA 
        WHERE cama_id = p_cama_destino_id 
        AND estado_cama_id != (SELECT estado_cama_id FROM ESTADO_CAMA WHERE codigo = 'disponible')
    ) THEN
        RAISE EXCEPTION 'La cama de destino no está disponible';
    END IF;
    
    -- Registrar movimiento
    INSERT INTO MOVIMIENTO_CAMA (
        hospitalizacion_id,
        cama_origen_id,
        cama_destino_id,
        fecha_hora_movimiento,
        motivo,
        personal_autoriza_id,
        usuario_creacion_id
    ) VALUES (
        p_hospitalizacion_id,
        v_cama_origen_id,
        p_cama_destino_id,
        NOW(),
        p_motivo,
        p_personal_autoriza_id,
        p_usuario_id
    );
    
    -- Actualizar hospitalización
    UPDATE HOSPITALIZACION
    SET 
        cama_actual_id = p_cama_destino_id,
        usuario_actualizacion_id = p_usuario_id,
        fecha_actualizacion = NOW()
    WHERE hospitalizacion_id = p_hospitalizacion_id;
    
    -- Actualizar estado de camas
    UPDATE CAMA SET estado_cama_id = (SELECT estado_cama_id FROM ESTADO_CAMA WHERE codigo = 'disponible')
    WHERE cama_id = v_cama_origen_id;
    
    UPDATE CAMA SET estado_cama_id = (SELECT estado_cama_id FROM ESTADO_CAMA WHERE codigo = 'ocupada')
    WHERE cama_id = p_cama_destino_id;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION medico.sp_cambiar_cama_paciente(p_hospitalizacion_id bigint, p_cama_destino_id bigint, p_motivo text, p_personal_autoriza_id bigint, p_usuario_id bigint) OWNER TO postgres;

--
-- TOC entry 698 (class 1255 OID 21811)
-- Name: sp_cerrar_caja(bigint, numeric, numeric, numeric, numeric, numeric, numeric, numeric, text, bigint); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_cerrar_caja(p_apertura_id bigint, p_efectivo numeric, p_tarjeta_credito numeric, p_tarjeta_debito numeric, p_transferencias numeric, p_depositos numeric, p_cheques numeric, p_otros numeric, p_observaciones text, p_usuario_id bigint) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_monto_final_fisico NUMERIC;
    v_diferencia NUMERIC;
BEGIN
    -- Calcular total físico
    v_monto_final_fisico := p_efectivo + p_tarjeta_credito + p_tarjeta_debito + 
                            p_transferencias + p_depositos + p_cheques + p_otros;
    
    -- Actualizar apertura de caja
    UPDATE APERTURA_CAJA
    SET 
        fecha_cierre = NOW(),
        efectivo_contado = p_efectivo,
        tarjeta_credito = p_tarjeta_credito,
        tarjeta_debito = p_tarjeta_debito,
        transferencias = p_transferencias,
        depositos = p_depositos,
        cheques = p_cheques,
        otros = p_otros,
        monto_final_fisico = v_monto_final_fisico,
        diferencia = v_monto_final_fisico - monto_final_sistema,
        observaciones = p_observaciones,
        estado_caja_id = (SELECT estado_caja_id FROM ESTADO_CAJA WHERE codigo = 'CERRADA'),
        usuario_actualizacion_id = p_usuario_id,
        fecha_actualizacion = NOW()
    WHERE apertura_id = p_apertura_id;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION medico.sp_cerrar_caja(p_apertura_id bigint, p_efectivo numeric, p_tarjeta_credito numeric, p_tarjeta_debito numeric, p_transferencias numeric, p_depositos numeric, p_cheques numeric, p_otros numeric, p_observaciones text, p_usuario_id bigint) OWNER TO postgres;

--
-- TOC entry 717 (class 1255 OID 21840)
-- Name: sp_getareaexamenpaged(integer, integer, character varying, character varying, character varying); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getareaexamenpaged(p_page_number integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_column character varying DEFAULT 'area_examen_id'::character varying, p_sort_direction character varying DEFAULT 'ASC'::character varying) RETURNS TABLE(area_examen_id bigint, categoria_examen_id bigint, codigo character varying, nombre character varying, eliminado boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validar parámetros de entrada
    IF p_page_number < 1 THEN
        p_page_number := 1;
    END IF;
    
    IF p_page_size < 1 THEN
        p_page_size := 10;
    END IF;
    
    IF p_page_size > 100 THEN
        p_page_size := 100;
    END IF;
    
    -- Validar columna de ordenamiento
    IF p_sort_column NOT IN ('area_examen_id', 'categoria_examen_id', 'codigo', 'nombre') THEN
        p_sort_column := 'area_examen_id';
    END IF;
    
    -- Validar dirección de ordenamiento
    IF UPPER(p_sort_direction) NOT IN ('ASC', 'DESC') THEN
        p_sort_direction := 'ASC';
    END IF;
    
    -- Calcular offset
    v_offset := (p_page_number - 1) * p_page_size;
    
    -- Retornar resultados paginados
    RETURN QUERY
    SELECT 
        ae.area_examen_id,
        ae.categoria_examen_id,
        ae.codigo,
        ae.nombre,
        ae.eliminado
    FROM medico.area_examen ae
    WHERE 
        ae.eliminado = false
        AND (
            p_search_term = '' 
            OR LOWER(ae.codigo) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(ae.nombre) LIKE LOWER('%' || p_search_term || '%')
        )
    ORDER BY 
        CASE WHEN p_sort_column = 'area_examen_id' AND UPPER(p_sort_direction) = 'ASC' THEN ae.area_examen_id END ASC,
        CASE WHEN p_sort_column = 'area_examen_id' AND UPPER(p_sort_direction) = 'DESC' THEN ae.area_examen_id END DESC,
        CASE WHEN p_sort_column = 'categoria_examen_id' AND UPPER(p_sort_direction) = 'ASC' THEN ae.categoria_examen_id END ASC,
        CASE WHEN p_sort_column = 'categoria_examen_id' AND UPPER(p_sort_direction) = 'DESC' THEN ae.categoria_examen_id END DESC,
        CASE WHEN p_sort_column = 'codigo' AND UPPER(p_sort_direction) = 'ASC' THEN ae.codigo END ASC,
        CASE WHEN p_sort_column = 'codigo' AND UPPER(p_sort_direction) = 'DESC' THEN ae.codigo END DESC,
        CASE WHEN p_sort_column = 'nombre' AND UPPER(p_sort_direction) = 'ASC' THEN ae.nombre END ASC,
        CASE WHEN p_sort_column = 'nombre' AND UPPER(p_sort_direction) = 'DESC' THEN ae.nombre END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$;


ALTER FUNCTION medico.sp_getareaexamenpaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying) OWNER TO postgres;

--
-- TOC entry 8388 (class 0 OID 0)
-- Dependencies: 717
-- Name: FUNCTION sp_getareaexamenpaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getareaexamenpaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying) IS 'Obtiene áreas de examen con paginación, búsqueda y ordenamiento';


--
-- TOC entry 724 (class 1255 OID 21850)
-- Name: sp_getareaexamenpaged(integer, integer, character varying, character varying, boolean, character varying, character varying, boolean); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getareaexamenpaged(p_page integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_by character varying DEFAULT 'area_examen_id'::character varying, p_sort_descending boolean DEFAULT false, p_nombre character varying DEFAULT NULL::character varying, p_descripcion character varying DEFAULT NULL::character varying, p_activo boolean DEFAULT NULL::boolean) RETURNS TABLE(area_examen_id bigint, categoria_examen_id bigint, codigo character varying, nombre character varying, eliminado boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT 
            ae.area_examen_id,
            ae.categoria_examen_id,
            ae.codigo,
            ae.nombre,
            ae.eliminado
        FROM medico.area_examen ae
        WHERE 
            (p_search_term IS NULL OR p_search_term = '' OR
             ae.codigo ILIKE '%' || p_search_term || '%' OR
             ae.nombre ILIKE '%' || p_search_term || '%')
          AND (p_nombre IS NULL OR ae.nombre ILIKE '%' || p_nombre || '%')
          AND (p_activo IS NULL OR (NOT ae.eliminado) = p_activo)
    )
    SELECT f.area_examen_id, f.categoria_examen_id, f.codigo, f.nombre, f.eliminado
    FROM filtered f
    ORDER BY 
        CASE WHEN lower(p_sort_by) = 'area_examen_id' AND NOT p_sort_descending THEN f.area_examen_id END ASC,
        CASE WHEN lower(p_sort_by) = 'area_examen_id' AND p_sort_descending THEN f.area_examen_id END DESC,
        CASE WHEN lower(p_sort_by) = 'categoria_examen_id' AND NOT p_sort_descending THEN f.categoria_examen_id END ASC,
        CASE WHEN lower(p_sort_by) = 'categoria_examen_id' AND p_sort_descending THEN f.categoria_examen_id END DESC,
        CASE WHEN lower(p_sort_by) = 'codigo' AND NOT p_sort_descending THEN f.codigo END ASC,
        CASE WHEN lower(p_sort_by) = 'codigo' AND p_sort_descending THEN f.codigo END DESC,
        CASE WHEN lower(p_sort_by) = 'nombre' AND NOT p_sort_descending THEN f.nombre END ASC,
        CASE WHEN lower(p_sort_by) = 'nombre' AND p_sort_descending THEN f.nombre END DESC
    LIMIT p_page_size OFFSET (p_page - 1) * p_page_size;
END;
$$;


ALTER FUNCTION medico.sp_getareaexamenpaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean) OWNER TO postgres;

--
-- TOC entry 8389 (class 0 OID 0)
-- Dependencies: 724
-- Name: FUNCTION sp_getareaexamenpaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getareaexamenpaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean) IS 'Paged area_examen con filtros opcionales (nombre, activo) y orden dinámico (p_sort_by/p_sort_descending)';


--
-- TOC entry 722 (class 1255 OID 21841)
-- Name: sp_getcategoriabalancepaged(integer, integer, character varying, character varying, character varying, character varying, character varying, character varying, boolean); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getcategoriabalancepaged(p_page_number integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_column character varying DEFAULT 'categoria_balance_id'::character varying, p_sort_direction character varying DEFAULT 'ASC'::character varying, p_nombre character varying DEFAULT NULL::character varying, p_codigo character varying DEFAULT NULL::character varying, p_tipo_categoria character varying DEFAULT NULL::character varying, p_activo boolean DEFAULT NULL::boolean) RETURNS TABLE(categoria_balance_id bigint, codigo character varying, nombre character varying, tipo_categoria character varying, padre_id bigint, nivel integer, eliminado boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validar parámetros de entrada
    IF p_page_number < 1 THEN
        p_page_number := 1;
    END IF;
    
    IF p_page_size < 1 THEN
        p_page_size := 10;
    END IF;
    
    IF p_page_size > 100 THEN
        p_page_size := 100;
    END IF;
    
    -- Validar columna de ordenamiento
    IF p_sort_column NOT IN ('categoria_balance_id', 'codigo', 'nombre', 'tipo_categoria', 'nivel') THEN
        p_sort_column := 'categoria_balance_id';
    END IF;
    
    -- Validar dirección de ordenamiento
    IF UPPER(p_sort_direction) NOT IN ('ASC', 'DESC') THEN
        p_sort_direction := 'ASC';
    END IF;
    
    -- Calcular offset
    v_offset := (p_page_number - 1) * p_page_size;
    
    -- Retornar resultados paginados
    RETURN QUERY
    SELECT 
        cb.categoria_balance_id,
        cb.codigo,
        cb.nombre,
        cb.tipo_categoria,
        cb.padre_id,
        cb.nivel,
        cb.eliminado
    FROM medico.categoria_balance cb
    WHERE 
        cb.eliminado = false
        AND (
            p_search_term = '' 
            OR LOWER(cb.codigo) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(cb.nombre) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(cb.tipo_categoria) LIKE LOWER('%' || p_search_term || '%')
        )
        AND (p_nombre IS NULL OR LOWER(cb.nombre) LIKE LOWER('%' || p_nombre || '%'))
        AND (p_codigo IS NULL OR LOWER(cb.codigo) LIKE LOWER('%' || p_codigo || '%'))
        AND (p_tipo_categoria IS NULL OR LOWER(cb.tipo_categoria) LIKE LOWER('%' || p_tipo_categoria || '%'))
        AND (p_activo IS NULL OR (NOT cb.eliminado) = p_activo)
    ORDER BY 
        CASE WHEN p_sort_column = 'categoria_balance_id' AND UPPER(p_sort_direction) = 'ASC' THEN cb.categoria_balance_id END ASC,
        CASE WHEN p_sort_column = 'categoria_balance_id' AND UPPER(p_sort_direction) = 'DESC' THEN cb.categoria_balance_id END DESC,
        CASE WHEN p_sort_column = 'codigo' AND UPPER(p_sort_direction) = 'ASC' THEN cb.codigo END ASC,
        CASE WHEN p_sort_column = 'codigo' AND UPPER(p_sort_direction) = 'DESC' THEN cb.codigo END DESC,
        CASE WHEN p_sort_column = 'nombre' AND UPPER(p_sort_direction) = 'ASC' THEN cb.nombre END ASC,
        CASE WHEN p_sort_column = 'nombre' AND UPPER(p_sort_direction) = 'DESC' THEN cb.nombre END DESC,
        CASE WHEN p_sort_column = 'tipo_categoria' AND UPPER(p_sort_direction) = 'ASC' THEN cb.tipo_categoria END ASC,
        CASE WHEN p_sort_column = 'tipo_categoria' AND UPPER(p_sort_direction) = 'DESC' THEN cb.tipo_categoria END DESC,
        CASE WHEN p_sort_column = 'nivel' AND UPPER(p_sort_direction) = 'ASC' THEN cb.nivel END ASC,
        CASE WHEN p_sort_column = 'nivel' AND UPPER(p_sort_direction) = 'DESC' THEN cb.nivel END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$;


ALTER FUNCTION medico.sp_getcategoriabalancepaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying, p_nombre character varying, p_codigo character varying, p_tipo_categoria character varying, p_activo boolean) OWNER TO postgres;

--
-- TOC entry 8390 (class 0 OID 0)
-- Dependencies: 722
-- Name: FUNCTION sp_getcategoriabalancepaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying, p_nombre character varying, p_codigo character varying, p_tipo_categoria character varying, p_activo boolean); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getcategoriabalancepaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying, p_nombre character varying, p_codigo character varying, p_tipo_categoria character varying, p_activo boolean) IS 'Obtiene categorías de balance con paginación, búsqueda individual y general, y ordenamiento';


--
-- TOC entry 720 (class 1255 OID 21833)
-- Name: sp_getcie10personalizadopaged(integer, integer, character varying, character varying, character varying); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getcie10personalizadopaged(p_page_number integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_column character varying DEFAULT 'cie10_personalizado_id'::character varying, p_sort_direction character varying DEFAULT 'ASC'::character varying) RETURNS TABLE(cie10_personalizado_id bigint, cie10_id bigint, organizacion_id bigint, personal_id bigint, descripcion_personalizada text, codigo_interno character varying, uso_frecuente boolean, estado character varying, eliminado boolean, usuario_creacion_id bigint, fecha_creacion timestamp without time zone, usuario_actualizacion_id bigint, fecha_actualizacion timestamp without time zone, usuario_eliminacion_id bigint, fecha_eliminacion timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validar parámetros de entrada
    IF p_page_number < 1 THEN
        p_page_number := 1;
    END IF;
    
    IF p_page_size < 1 THEN
        p_page_size := 10;
    END IF;
    
    IF p_page_size > 100 THEN
        p_page_size := 100;
    END IF;
    
    -- Validar columna de ordenamiento
    IF p_sort_column NOT IN ('cie10_personalizado_id', 'cie10_id', 'organizacion_id', 'personal_id', 'descripcion_personalizada', 'codigo_interno', 'uso_frecuente', 'estado') THEN
        p_sort_column := 'cie10_personalizado_id';
    END IF;
    
    -- Validar dirección de ordenamiento
    IF UPPER(p_sort_direction) NOT IN ('ASC', 'DESC') THEN
        p_sort_direction := 'ASC';
    END IF;
    
    -- Calcular offset
    v_offset := (p_page_number - 1) * p_page_size;
    
    -- Retornar resultados paginados
    RETURN QUERY
    SELECT 
        cp.cie10_personalizado_id,
        cp.cie10_id,
        cp.organizacion_id,
        cp.personal_id,
        cp.descripcion_personalizada,
        cp.codigo_interno,
        cp.uso_frecuente,
        cp.estado,
        cp.eliminado,
        cp.usuario_creacion_id,
        cp.fecha_creacion,
        cp.usuario_actualizacion_id,
        cp.fecha_actualizacion,
        cp.usuario_eliminacion_id,
        cp.fecha_eliminacion
    FROM medico.cie10_personalizado cp
    WHERE 
        cp.eliminado = false
        AND (
            p_search_term = '' 
            OR LOWER(cp.descripcion_personalizada) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(cp.codigo_interno) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(cp.estado) LIKE LOWER('%' || p_search_term || '%')
        )
    ORDER BY 
        CASE WHEN p_sort_column = 'cie10_personalizado_id' AND UPPER(p_sort_direction) = 'ASC' THEN cp.cie10_personalizado_id END ASC,
        CASE WHEN p_sort_column = 'cie10_personalizado_id' AND UPPER(p_sort_direction) = 'DESC' THEN cp.cie10_personalizado_id END DESC,
        CASE WHEN p_sort_column = 'cie10_id' AND UPPER(p_sort_direction) = 'ASC' THEN cp.cie10_id END ASC,
        CASE WHEN p_sort_column = 'cie10_id' AND UPPER(p_sort_direction) = 'DESC' THEN cp.cie10_id END DESC,
        CASE WHEN p_sort_column = 'organizacion_id' AND UPPER(p_sort_direction) = 'ASC' THEN cp.organizacion_id END ASC,
        CASE WHEN p_sort_column = 'organizacion_id' AND UPPER(p_sort_direction) = 'DESC' THEN cp.organizacion_id END DESC,
        CASE WHEN p_sort_column = 'personal_id' AND UPPER(p_sort_direction) = 'ASC' THEN cp.personal_id END ASC,
        CASE WHEN p_sort_column = 'personal_id' AND UPPER(p_sort_direction) = 'DESC' THEN cp.personal_id END DESC,
        CASE WHEN p_sort_column = 'descripcion_personalizada' AND UPPER(p_sort_direction) = 'ASC' THEN cp.descripcion_personalizada END ASC,
        CASE WHEN p_sort_column = 'descripcion_personalizada' AND UPPER(p_sort_direction) = 'DESC' THEN cp.descripcion_personalizada END DESC,
        CASE WHEN p_sort_column = 'codigo_interno' AND UPPER(p_sort_direction) = 'ASC' THEN cp.codigo_interno END ASC,
        CASE WHEN p_sort_column = 'codigo_interno' AND UPPER(p_sort_direction) = 'DESC' THEN cp.codigo_interno END DESC,
        CASE WHEN p_sort_column = 'uso_frecuente' AND UPPER(p_sort_direction) = 'ASC' THEN cp.uso_frecuente END ASC,
        CASE WHEN p_sort_column = 'uso_frecuente' AND UPPER(p_sort_direction) = 'DESC' THEN cp.uso_frecuente END DESC,
        CASE WHEN p_sort_column = 'estado' AND UPPER(p_sort_direction) = 'ASC' THEN cp.estado END ASC,
        CASE WHEN p_sort_column = 'estado' AND UPPER(p_sort_direction) = 'DESC' THEN cp.estado END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$;


ALTER FUNCTION medico.sp_getcie10personalizadopaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying) OWNER TO postgres;

--
-- TOC entry 8391 (class 0 OID 0)
-- Dependencies: 720
-- Name: FUNCTION sp_getcie10personalizadopaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getcie10personalizadopaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying) IS 'Obtiene CIE10 personalizados con paginación, búsqueda y ordenamiento';


--
-- TOC entry 725 (class 1255 OID 21851)
-- Name: sp_getcie10personalizadopaged(integer, integer, character varying, character varying, boolean, character varying, character varying, boolean); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getcie10personalizadopaged(p_page integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_by character varying DEFAULT 'cie10_personalizado_id'::character varying, p_sort_descending boolean DEFAULT false, p_codigo character varying DEFAULT NULL::character varying, p_descripcion character varying DEFAULT NULL::character varying, p_activo boolean DEFAULT NULL::boolean) RETURNS TABLE(cie10_personalizado_id bigint, cie10_id bigint, organizacion_id bigint, personal_id bigint, descripcion_personalizada text, codigo_interno character varying, uso_frecuente boolean, estado character varying, eliminado boolean, usuario_creacion_id bigint, fecha_creacion timestamp without time zone, usuario_actualizacion_id bigint, fecha_actualizacion timestamp without time zone, usuario_eliminacion_id bigint, fecha_eliminacion timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT 
            cp.cie10_personalizado_id,
            cp.cie10_id,
            cp.organizacion_id,
            cp.personal_id,
            cp.descripcion_personalizada,
            cp.codigo_interno,
            cp.uso_frecuente,
            cp.estado,
            cp.eliminado,
            cp.usuario_creacion_id,
            cp.fecha_creacion,
            cp.usuario_actualizacion_id,
            cp.fecha_actualizacion,
            cp.usuario_eliminacion_id,
            cp.fecha_eliminacion
        FROM medico.cie10_personalizado cp
        WHERE 
            (p_search_term IS NULL OR p_search_term = '' OR
             cp.descripcion_personalizada ILIKE '%' || p_search_term || '%' OR
             cp.codigo_interno ILIKE '%' || p_search_term || '%' OR
             cp.estado ILIKE '%' || p_search_term || '%')
          AND (p_codigo IS NULL OR cp.codigo_interno ILIKE '%' || p_codigo || '%')
          AND (p_descripcion IS NULL OR cp.descripcion_personalizada ILIKE '%' || p_descripcion || '%')
          AND (p_activo IS NULL OR (NOT cp.eliminado) = p_activo)
    )
    SELECT 
        f.cie10_personalizado_id,
        f.cie10_id,
        f.organizacion_id,
        f.personal_id,
        f.descripcion_personalizada,
        f.codigo_interno,
        f.uso_frecuente,
        f.estado,
        f.eliminado,
        f.usuario_creacion_id,
        f.fecha_creacion,
        f.usuario_actualizacion_id,
        f.fecha_actualizacion,
        f.usuario_eliminacion_id,
        f.fecha_eliminacion
    FROM filtered f
    ORDER BY 
        CASE WHEN lower(p_sort_by) = 'cie10_personalizado_id' AND NOT p_sort_descending THEN f.cie10_personalizado_id END ASC,
        CASE WHEN lower(p_sort_by) = 'cie10_personalizado_id' AND p_sort_descending THEN f.cie10_personalizado_id END DESC,
        CASE WHEN lower(p_sort_by) = 'cie10_id' AND NOT p_sort_descending THEN f.cie10_id END ASC,
        CASE WHEN lower(p_sort_by) = 'cie10_id' AND p_sort_descending THEN f.cie10_id END DESC,
        CASE WHEN lower(p_sort_by) = 'organizacion_id' AND NOT p_sort_descending THEN f.organizacion_id END ASC,
        CASE WHEN lower(p_sort_by) = 'organizacion_id' AND p_sort_descending THEN f.organizacion_id END DESC,
        CASE WHEN lower(p_sort_by) = 'personal_id' AND NOT p_sort_descending THEN f.personal_id END ASC,
        CASE WHEN lower(p_sort_by) = 'personal_id' AND p_sort_descending THEN f.personal_id END DESC,
        CASE WHEN lower(p_sort_by) = 'descripcion_personalizada' AND NOT p_sort_descending THEN f.descripcion_personalizada END ASC,
        CASE WHEN lower(p_sort_by) = 'descripcion_personalizada' AND p_sort_descending THEN f.descripcion_personalizada END DESC,
        CASE WHEN lower(p_sort_by) = 'codigo_interno' AND NOT p_sort_descending THEN f.codigo_interno END ASC,
        CASE WHEN lower(p_sort_by) = 'codigo_interno' AND p_sort_descending THEN f.codigo_interno END DESC,
        CASE WHEN lower(p_sort_by) = 'uso_frecuente' AND NOT p_sort_descending THEN f.uso_frecuente END ASC,
        CASE WHEN lower(p_sort_by) = 'uso_frecuente' AND p_sort_descending THEN f.uso_frecuente END DESC,
        CASE WHEN lower(p_sort_by) = 'estado' AND NOT p_sort_descending THEN f.estado END ASC,
        CASE WHEN lower(p_sort_by) = 'estado' AND p_sort_descending THEN f.estado END DESC
    LIMIT p_page_size OFFSET (p_page - 1) * p_page_size;
END;
$$;


ALTER FUNCTION medico.sp_getcie10personalizadopaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_codigo character varying, p_descripcion character varying, p_activo boolean) OWNER TO postgres;

--
-- TOC entry 8392 (class 0 OID 0)
-- Dependencies: 725
-- Name: FUNCTION sp_getcie10personalizadopaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_codigo character varying, p_descripcion character varying, p_activo boolean); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getcie10personalizadopaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_codigo character varying, p_descripcion character varying, p_activo boolean) IS 'Paged cie10_personalizado con filtros (codigo, descripcion, activo) y orden dinámico (p_sort_by/p_sort_descending)';


--
-- TOC entry 726 (class 1255 OID 21843)
-- Name: sp_getconsultoriopaged(integer, integer, character varying, character varying, boolean, character varying, character varying, character varying, boolean); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getconsultoriopaged(p_page integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_by character varying DEFAULT 'consultorio_id'::character varying, p_sort_descending boolean DEFAULT false, p_nombre character varying DEFAULT NULL::character varying, p_descripcion character varying DEFAULT NULL::character varying, p_ubicacion character varying DEFAULT NULL::character varying, p_activo boolean DEFAULT NULL::boolean) RETURNS TABLE(consultorio_id bigint, sede_id bigint, codigo character varying, nombre character varying, tipo_consultorio_id bigint, piso character varying, area_m2 numeric, capacidad_personas integer, estado character varying, eliminado boolean, usuario_creacion_id bigint, fecha_creacion timestamp without time zone, usuario_actualizacion_id bigint, fecha_actualizacion timestamp without time zone, usuario_eliminacion_id bigint, fecha_eliminacion timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offset INTEGER;
    v_sort_dir TEXT;
BEGIN
    -- Validar parámetros de entrada
    IF p_page < 1 THEN
        p_page := 1;
    END IF;
    
    IF p_page_size < 1 THEN
        p_page_size := 10;
    END IF;
    
    IF p_page_size > 100 THEN
        p_page_size := 100;
    END IF;
    
    -- Validar columna de ordenamiento
    IF p_sort_by NOT IN ('consultorio_id', 'sede_id', 'codigo', 'nombre', 'piso', 'area_m2', 'capacidad_personas', 'estado', 'eliminado') THEN
        p_sort_by := 'consultorio_id';
    END IF;
    
    -- Validar dirección de ordenamiento
    v_sort_dir := CASE WHEN p_sort_descending THEN 'DESC' ELSE 'ASC' END;
    
    -- Calcular offset
    v_offset := (p_page - 1) * p_page_size;
    
    -- Retornar resultados paginados
    RETURN QUERY
    SELECT 
        c.consultorio_id,
        c.sede_id,
        c.codigo,
        c.nombre,
        c.tipo_consultorio_id,
        c.piso,
        c.area_m2,
        c.capacidad_personas,
        c.estado,
        c.eliminado,
        c.usuario_creacion_id,
        c.fecha_creacion,
        c.usuario_actualizacion_id,
        c.fecha_actualizacion,
        c.usuario_eliminacion_id,
        c.fecha_eliminacion
    FROM medico.consultorio c
    WHERE 
        c.eliminado = false
        AND (
            p_search_term = '' 
            OR LOWER(c.codigo) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(c.nombre) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(c.piso) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(c.estado) LIKE LOWER('%' || p_search_term || '%')
        )
        AND (p_nombre IS NULL OR LOWER(c.nombre) LIKE LOWER('%' || p_nombre || '%'))
        -- p_descripcion y p_ubicacion son parámetros aceptados para compatibilidad pero no aplican
        -- porque la tabla actual no posee dichas columnas.
        AND (p_activo IS NULL OR (NOT c.eliminado) = p_activo)
    ORDER BY 
        CASE WHEN p_sort_by = 'consultorio_id' AND UPPER(v_sort_dir) = 'ASC' THEN c.consultorio_id END ASC,
        CASE WHEN p_sort_by = 'consultorio_id' AND UPPER(v_sort_dir) = 'DESC' THEN c.consultorio_id END DESC,
        CASE WHEN p_sort_by = 'sede_id' AND UPPER(v_sort_dir) = 'ASC' THEN c.sede_id END ASC,
        CASE WHEN p_sort_by = 'sede_id' AND UPPER(v_sort_dir) = 'DESC' THEN c.sede_id END DESC,
        CASE WHEN p_sort_by = 'codigo' AND UPPER(v_sort_dir) = 'ASC' THEN c.codigo END ASC,
        CASE WHEN p_sort_by = 'codigo' AND UPPER(v_sort_dir) = 'DESC' THEN c.codigo END DESC,
        CASE WHEN p_sort_by = 'nombre' AND UPPER(v_sort_dir) = 'ASC' THEN c.nombre END ASC,
        CASE WHEN p_sort_by = 'nombre' AND UPPER(v_sort_dir) = 'DESC' THEN c.nombre END DESC,
        CASE WHEN p_sort_by = 'piso' AND UPPER(v_sort_dir) = 'ASC' THEN c.piso END ASC,
        CASE WHEN p_sort_by = 'piso' AND UPPER(v_sort_dir) = 'DESC' THEN c.piso END DESC,
        CASE WHEN p_sort_by = 'area_m2' AND UPPER(v_sort_dir) = 'ASC' THEN c.area_m2 END ASC,
        CASE WHEN p_sort_by = 'area_m2' AND UPPER(v_sort_dir) = 'DESC' THEN c.area_m2 END DESC,
        CASE WHEN p_sort_by = 'capacidad_personas' AND UPPER(v_sort_dir) = 'ASC' THEN c.capacidad_personas END ASC,
        CASE WHEN p_sort_by = 'capacidad_personas' AND UPPER(v_sort_dir) = 'DESC' THEN c.capacidad_personas END DESC,
        CASE WHEN p_sort_by = 'estado' AND UPPER(v_sort_dir) = 'ASC' THEN c.estado END ASC,
        CASE WHEN p_sort_by = 'estado' AND UPPER(v_sort_dir) = 'DESC' THEN c.estado END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$;


ALTER FUNCTION medico.sp_getconsultoriopaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_ubicacion character varying, p_activo boolean) OWNER TO postgres;

--
-- TOC entry 8393 (class 0 OID 0)
-- Dependencies: 726
-- Name: FUNCTION sp_getconsultoriopaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_ubicacion character varying, p_activo boolean); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getconsultoriopaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_ubicacion character varying, p_activo boolean) IS 'Obtiene consultorios con paginación, búsqueda y ordenamiento';


--
-- TOC entry 723 (class 1255 OID 21844)
-- Name: sp_getespecialidadmedicapaged(integer, integer, character varying, character varying, boolean, character varying, text, boolean); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getespecialidadmedicapaged(p_page integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_by character varying DEFAULT 'especialidad_id'::character varying, p_sort_descending boolean DEFAULT false, p_nombre character varying DEFAULT NULL::character varying, p_descripcion text DEFAULT NULL::text, p_activo boolean DEFAULT NULL::boolean) RETURNS TABLE(especialidad_id bigint, codigo character varying, nombre character varying, descripcion text, requiere_rne boolean, eliminado boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT 
            em.especialidad_id,
            em.codigo,
            em.nombre,
            em.descripcion,
            em.requiere_rne,
            em.eliminado
        FROM medico.especialidad_medica em
        WHERE 
            (p_search_term IS NULL OR p_search_term = '' OR
             em.codigo ILIKE '%' || p_search_term || '%' OR
             em.nombre ILIKE '%' || p_search_term || '%' OR
             em.descripcion ILIKE '%' || p_search_term || '%')
          AND (p_nombre IS NULL OR em.nombre ILIKE '%' || p_nombre || '%')
          AND (p_descripcion IS NULL OR em.descripcion ILIKE '%' || p_descripcion || '%')
          AND (p_activo IS NULL OR (NOT em.eliminado) = p_activo)
    )
    SELECT f.especialidad_id, f.codigo, f.nombre, f.descripcion, f.requiere_rne, f.eliminado
    FROM filtered f
    ORDER BY
        CASE WHEN lower(p_sort_by) = 'especialidad_id' AND NOT p_sort_descending THEN f.especialidad_id END ASC,
        CASE WHEN lower(p_sort_by) = 'especialidad_id' AND p_sort_descending THEN f.especialidad_id END DESC,
        CASE WHEN lower(p_sort_by) = 'codigo' AND NOT p_sort_descending THEN f.codigo END ASC,
        CASE WHEN lower(p_sort_by) = 'codigo' AND p_sort_descending THEN f.codigo END DESC,
        CASE WHEN lower(p_sort_by) = 'nombre' AND NOT p_sort_descending THEN f.nombre END ASC,
        CASE WHEN lower(p_sort_by) = 'nombre' AND p_sort_descending THEN f.nombre END DESC,
        CASE WHEN lower(p_sort_by) = 'descripcion' AND NOT p_sort_descending THEN f.descripcion END ASC,
        CASE WHEN lower(p_sort_by) = 'descripcion' AND p_sort_descending THEN f.descripcion END DESC,
        CASE WHEN lower(p_sort_by) = 'requiere_rne' AND NOT p_sort_descending THEN f.requiere_rne END ASC,
        CASE WHEN lower(p_sort_by) = 'requiere_rne' AND p_sort_descending THEN f.requiere_rne END DESC
    LIMIT p_page_size OFFSET (p_page - 1) * p_page_size;
END;
$$;


ALTER FUNCTION medico.sp_getespecialidadmedicapaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion text, p_activo boolean) OWNER TO postgres;

--
-- TOC entry 8394 (class 0 OID 0)
-- Dependencies: 723
-- Name: FUNCTION sp_getespecialidadmedicapaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion text, p_activo boolean); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getespecialidadmedicapaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion text, p_activo boolean) IS 'Paged especialidad_medica con filtros opcionales (nombre, descripcion, activo) y orden dinámico (p_sort_by/p_sort_descending)';


--
-- TOC entry 716 (class 1255 OID 21835)
-- Name: sp_getestadoatencionpaged(integer, integer, character varying, character varying, character varying); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getestadoatencionpaged(p_page_number integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_column character varying DEFAULT 'estado_atencion_id'::character varying, p_sort_direction character varying DEFAULT 'ASC'::character varying) RETURNS TABLE(estado_atencion_id bigint, codigo character varying, nombre character varying, color_hex character varying, eliminado boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validar parámetros de entrada
    IF p_page_number < 1 THEN
        p_page_number := 1;
    END IF;
    
    IF p_page_size < 1 THEN
        p_page_size := 10;
    END IF;
    
    IF p_page_size > 100 THEN
        p_page_size := 100;
    END IF;
    
    -- Validar columna de ordenamiento
    IF p_sort_column NOT IN ('estado_atencion_id', 'codigo', 'nombre', 'color_hex') THEN
        p_sort_column := 'estado_atencion_id';
    END IF;
    
    -- Validar dirección de ordenamiento
    IF UPPER(p_sort_direction) NOT IN ('ASC', 'DESC') THEN
        p_sort_direction := 'ASC';
    END IF;
    
    -- Calcular offset
    v_offset := (p_page_number - 1) * p_page_size;
    
    -- Retornar resultados paginados
    RETURN QUERY
    SELECT 
        ea.estado_atencion_id,
        ea.codigo,
        ea.nombre,
        ea.color_hex,
        ea.eliminado
    FROM medico.estado_atencion ea
    WHERE 
        ea.eliminado = false
        AND (
            p_search_term = '' 
            OR LOWER(ea.codigo) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(ea.nombre) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(ea.color_hex) LIKE LOWER('%' || p_search_term || '%')
        )
    ORDER BY 
        CASE WHEN p_sort_column = 'estado_atencion_id' AND UPPER(p_sort_direction) = 'ASC' THEN ea.estado_atencion_id END ASC,
        CASE WHEN p_sort_column = 'estado_atencion_id' AND UPPER(p_sort_direction) = 'DESC' THEN ea.estado_atencion_id END DESC,
        CASE WHEN p_sort_column = 'codigo' AND UPPER(p_sort_direction) = 'ASC' THEN ea.codigo END ASC,
        CASE WHEN p_sort_column = 'codigo' AND UPPER(p_sort_direction) = 'DESC' THEN ea.codigo END DESC,
        CASE WHEN p_sort_column = 'nombre' AND UPPER(p_sort_direction) = 'ASC' THEN ea.nombre END ASC,
        CASE WHEN p_sort_column = 'nombre' AND UPPER(p_sort_direction) = 'DESC' THEN ea.nombre END DESC,
        CASE WHEN p_sort_column = 'color_hex' AND UPPER(p_sort_direction) = 'ASC' THEN ea.color_hex END ASC,
        CASE WHEN p_sort_column = 'color_hex' AND UPPER(p_sort_direction) = 'DESC' THEN ea.color_hex END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$;


ALTER FUNCTION medico.sp_getestadoatencionpaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying) OWNER TO postgres;

--
-- TOC entry 8395 (class 0 OID 0)
-- Dependencies: 716
-- Name: FUNCTION sp_getestadoatencionpaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getestadoatencionpaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying) IS 'Obtiene estados de atención con paginación, búsqueda y ordenamiento';


--
-- TOC entry 727 (class 1255 OID 21852)
-- Name: sp_getestadoatencionpaged(integer, integer, character varying, character varying, boolean, character varying, character varying, boolean); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getestadoatencionpaged(p_page integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_by character varying DEFAULT 'estado_atencion_id'::character varying, p_sort_descending boolean DEFAULT false, p_nombre character varying DEFAULT NULL::character varying, p_descripcion character varying DEFAULT NULL::character varying, p_activo boolean DEFAULT NULL::boolean) RETURNS TABLE(estado_atencion_id bigint, codigo character varying, nombre character varying, color_hex character varying, eliminado boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validar parámetros de entrada
    IF p_page < 1 THEN
        p_page := 1;
    END IF;
    
    IF p_page_size < 1 THEN
        p_page_size := 10;
    END IF;
    
    IF p_page_size > 100 THEN
        p_page_size := 100;
    END IF;
    
    -- Validar columna de ordenamiento
    IF LOWER(p_sort_by) NOT IN ('estado_atencion_id', 'codigo', 'nombre', 'color_hex', 'eliminado') THEN
        p_sort_by := 'estado_atencion_id';
    END IF;
    
    -- Calcular offset
    v_offset := (p_page - 1) * p_page_size;
    
    -- Retornar resultados paginados
    RETURN QUERY
    SELECT 
        ea.estado_atencion_id,
        ea.codigo,
        ea.nombre,
        ea.color_hex,
        ea.eliminado
    FROM medico.estado_atencion ea
    WHERE 
        ea.eliminado = FALSE
        AND (
            COALESCE(p_search_term, '') = '' 
            OR LOWER(ea.codigo) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(ea.nombre) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(ea.color_hex) LIKE LOWER('%' || p_search_term || '%')
        )
        AND (p_nombre IS NULL OR LOWER(ea.nombre) LIKE LOWER('%' || p_nombre || '%'))
        -- p_descripcion es parámetro de compatibilidad; la tabla no posee dicha columna
        AND (p_activo IS NULL OR (NOT ea.eliminado) = p_activo)
    ORDER BY 
        CASE WHEN LOWER(p_sort_by) = 'estado_atencion_id' AND NOT p_sort_descending THEN ea.estado_atencion_id END ASC,
        CASE WHEN LOWER(p_sort_by) = 'estado_atencion_id' AND p_sort_descending THEN ea.estado_atencion_id END DESC,
        CASE WHEN LOWER(p_sort_by) = 'codigo' AND NOT p_sort_descending THEN ea.codigo END ASC,
        CASE WHEN LOWER(p_sort_by) = 'codigo' AND p_sort_descending THEN ea.codigo END DESC,
        CASE WHEN LOWER(p_sort_by) = 'nombre' AND NOT p_sort_descending THEN ea.nombre END ASC,
        CASE WHEN LOWER(p_sort_by) = 'nombre' AND p_sort_descending THEN ea.nombre END DESC,
        CASE WHEN LOWER(p_sort_by) = 'color_hex' AND NOT p_sort_descending THEN ea.color_hex END ASC,
        CASE WHEN LOWER(p_sort_by) = 'color_hex' AND p_sort_descending THEN ea.color_hex END DESC,
        CASE WHEN LOWER(p_sort_by) = 'eliminado' AND NOT p_sort_descending THEN ea.eliminado END ASC,
        CASE WHEN LOWER(p_sort_by) = 'eliminado' AND p_sort_descending THEN ea.eliminado END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$;


ALTER FUNCTION medico.sp_getestadoatencionpaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean) OWNER TO postgres;

--
-- TOC entry 8396 (class 0 OID 0)
-- Dependencies: 727
-- Name: FUNCTION sp_getestadoatencionpaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getestadoatencionpaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean) IS 'Obtiene estados de atención con paginación, búsqueda, filtros y ordenamiento';


--
-- TOC entry 715 (class 1255 OID 21836)
-- Name: sp_getestadocivilpaged(integer, integer, character varying, character varying, character varying); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getestadocivilpaged(p_page_number integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_column character varying DEFAULT 'estado_civil_id'::character varying, p_sort_direction character varying DEFAULT 'ASC'::character varying) RETURNS TABLE(estado_civil_id bigint, codigo character varying, nombre character varying, eliminado boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validar parámetros de entrada
    IF p_page_number < 1 THEN
        p_page_number := 1;
    END IF;
    
    IF p_page_size < 1 THEN
        p_page_size := 10;
    END IF;
    
    IF p_page_size > 100 THEN
        p_page_size := 100;
    END IF;
    
    -- Validar columna de ordenamiento
    IF p_sort_column NOT IN ('estado_civil_id', 'codigo', 'nombre') THEN
        p_sort_column := 'estado_civil_id';
    END IF;
    
    -- Validar dirección de ordenamiento
    IF UPPER(p_sort_direction) NOT IN ('ASC', 'DESC') THEN
        p_sort_direction := 'ASC';
    END IF;
    
    -- Calcular offset
    v_offset := (p_page_number - 1) * p_page_size;
    
    -- Retornar resultados paginados
    RETURN QUERY
    SELECT 
        ec.estado_civil_id,
        ec.codigo,
        ec.nombre,
        ec.eliminado
    FROM medico.estado_civil ec
    WHERE 
        ec.eliminado = false
        AND (
            p_search_term = '' 
            OR LOWER(ec.codigo) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(ec.nombre) LIKE LOWER('%' || p_search_term || '%')
        )
    ORDER BY 
        CASE WHEN p_sort_column = 'estado_civil_id' AND UPPER(p_sort_direction) = 'ASC' THEN ec.estado_civil_id END ASC,
        CASE WHEN p_sort_column = 'estado_civil_id' AND UPPER(p_sort_direction) = 'DESC' THEN ec.estado_civil_id END DESC,
        CASE WHEN p_sort_column = 'codigo' AND UPPER(p_sort_direction) = 'ASC' THEN ec.codigo END ASC,
        CASE WHEN p_sort_column = 'codigo' AND UPPER(p_sort_direction) = 'DESC' THEN ec.codigo END DESC,
        CASE WHEN p_sort_column = 'nombre' AND UPPER(p_sort_direction) = 'ASC' THEN ec.nombre END ASC,
        CASE WHEN p_sort_column = 'nombre' AND UPPER(p_sort_direction) = 'DESC' THEN ec.nombre END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$;


ALTER FUNCTION medico.sp_getestadocivilpaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying) OWNER TO postgres;

--
-- TOC entry 8397 (class 0 OID 0)
-- Dependencies: 715
-- Name: FUNCTION sp_getestadocivilpaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getestadocivilpaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying) IS 'Obtiene estados civiles con paginación, búsqueda y ordenamiento';


--
-- TOC entry 728 (class 1255 OID 21853)
-- Name: sp_getestadocivilpaged(integer, integer, character varying, character varying, boolean, character varying, character varying, boolean); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getestadocivilpaged(p_page integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_by character varying DEFAULT 'estado_civil_id'::character varying, p_sort_descending boolean DEFAULT false, p_nombre character varying DEFAULT NULL::character varying, p_descripcion character varying DEFAULT NULL::character varying, p_activo boolean DEFAULT NULL::boolean) RETURNS TABLE(estado_civil_id bigint, codigo character varying, nombre character varying, eliminado boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validar parámetros de entrada
    IF p_page < 1 THEN
        p_page := 1;
    END IF;
    
    IF p_page_size < 1 THEN
        p_page_size := 10;
    END IF;
    
    IF p_page_size > 100 THEN
        p_page_size := 100;
    END IF;
    
    -- Validar columna de ordenamiento
    IF LOWER(p_sort_by) NOT IN ('estado_civil_id', 'codigo', 'nombre', 'eliminado') THEN
        p_sort_by := 'estado_civil_id';
    END IF;
    
    -- Calcular offset
    v_offset := (p_page - 1) * p_page_size;
    
    -- Retornar resultados paginados
    RETURN QUERY
    SELECT 
        ec.estado_civil_id,
        ec.codigo,
        ec.nombre,
        ec.eliminado
    FROM medico.estado_civil ec
    WHERE 
        ec.eliminado = FALSE
        AND (
            COALESCE(p_search_term, '') = '' 
            OR LOWER(ec.codigo) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(ec.nombre) LIKE LOWER('%' || p_search_term || '%')
        )
        AND (p_nombre IS NULL OR LOWER(ec.nombre) LIKE LOWER('%' || p_nombre || '%'))
        -- p_descripcion es parámetro de compatibilidad; la tabla no posee dicha columna
        AND (p_activo IS NULL OR (NOT ec.eliminado) = p_activo)
    ORDER BY 
        CASE WHEN LOWER(p_sort_by) = 'estado_civil_id' AND NOT p_sort_descending THEN ec.estado_civil_id END ASC,
        CASE WHEN LOWER(p_sort_by) = 'estado_civil_id' AND p_sort_descending THEN ec.estado_civil_id END DESC,
        CASE WHEN LOWER(p_sort_by) = 'codigo' AND NOT p_sort_descending THEN ec.codigo END ASC,
        CASE WHEN LOWER(p_sort_by) = 'codigo' AND p_sort_descending THEN ec.codigo END DESC,
        CASE WHEN LOWER(p_sort_by) = 'nombre' AND NOT p_sort_descending THEN ec.nombre END ASC,
        CASE WHEN LOWER(p_sort_by) = 'nombre' AND p_sort_descending THEN ec.nombre END DESC,
        CASE WHEN LOWER(p_sort_by) = 'eliminado' AND NOT p_sort_descending THEN ec.eliminado END ASC,
        CASE WHEN LOWER(p_sort_by) = 'eliminado' AND p_sort_descending THEN ec.eliminado END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$;


ALTER FUNCTION medico.sp_getestadocivilpaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean) OWNER TO postgres;

--
-- TOC entry 8398 (class 0 OID 0)
-- Dependencies: 728
-- Name: FUNCTION sp_getestadocivilpaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getestadocivilpaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean) IS 'Obtiene estados civiles con paginación, búsqueda, filtros y ordenamiento';


--
-- TOC entry 721 (class 1255 OID 21837)
-- Name: sp_getfactorrhpaged(integer, integer, character varying, character varying, character varying); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getfactorrhpaged(p_page_number integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_column character varying DEFAULT 'factor_rh_id'::character varying, p_sort_direction character varying DEFAULT 'ASC'::character varying) RETURNS TABLE(factor_rh_id bigint, codigo character varying, nombre character varying, eliminado boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validar parámetros de entrada
    IF p_page_number < 1 THEN
        p_page_number := 1;
    END IF;
    
    IF p_page_size < 1 THEN
        p_page_size := 10;
    END IF;
    
    IF p_page_size > 100 THEN
        p_page_size := 100;
    END IF;
    
    -- Validar columna de ordenamiento
    IF p_sort_column NOT IN ('factor_rh_id', 'codigo', 'nombre') THEN
        p_sort_column := 'factor_rh_id';
    END IF;
    
    -- Validar dirección de ordenamiento
    IF UPPER(p_sort_direction) NOT IN ('ASC', 'DESC') THEN
        p_sort_direction := 'ASC';
    END IF;
    
    -- Calcular offset
    v_offset := (p_page_number - 1) * p_page_size;
    
    -- Retornar resultados paginados
    RETURN QUERY
    SELECT 
        fr.factor_rh_id,
        fr.codigo,
        fr.nombre,
        fr.eliminado
    FROM medico.factor_rh fr
    WHERE 
        fr.eliminado = false
        AND (
            p_search_term = '' 
            OR LOWER(fr.codigo) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(fr.nombre) LIKE LOWER('%' || p_search_term || '%')
        )
    ORDER BY 
        CASE WHEN p_sort_column = 'factor_rh_id' AND UPPER(p_sort_direction) = 'ASC' THEN fr.factor_rh_id END ASC,
        CASE WHEN p_sort_column = 'factor_rh_id' AND UPPER(p_sort_direction) = 'DESC' THEN fr.factor_rh_id END DESC,
        CASE WHEN p_sort_column = 'codigo' AND UPPER(p_sort_direction) = 'ASC' THEN fr.codigo END ASC,
        CASE WHEN p_sort_column = 'codigo' AND UPPER(p_sort_direction) = 'DESC' THEN fr.codigo END DESC,
        CASE WHEN p_sort_column = 'nombre' AND UPPER(p_sort_direction) = 'ASC' THEN fr.nombre END ASC,
        CASE WHEN p_sort_column = 'nombre' AND UPPER(p_sort_direction) = 'DESC' THEN fr.nombre END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$;


ALTER FUNCTION medico.sp_getfactorrhpaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying) OWNER TO postgres;

--
-- TOC entry 8399 (class 0 OID 0)
-- Dependencies: 721
-- Name: FUNCTION sp_getfactorrhpaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getfactorrhpaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying) IS 'Obtiene factores RH con paginación, búsqueda y ordenamiento';


--
-- TOC entry 729 (class 1255 OID 21854)
-- Name: sp_getfactorrhpaged(integer, integer, character varying, character varying, boolean, character varying, character varying, boolean); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getfactorrhpaged(p_page integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_by character varying DEFAULT 'factor_rh_id'::character varying, p_sort_descending boolean DEFAULT false, p_nombre character varying DEFAULT NULL::character varying, p_descripcion character varying DEFAULT NULL::character varying, p_activo boolean DEFAULT NULL::boolean) RETURNS TABLE(factor_rh_id bigint, codigo character varying, nombre character varying, eliminado boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validar parámetros de entrada
    IF p_page < 1 THEN
        p_page := 1;
    END IF;
    
    IF p_page_size < 1 THEN
        p_page_size := 10;
    END IF;
    
    IF p_page_size > 100 THEN
        p_page_size := 100;
    END IF;
    
    -- Validar columna de ordenamiento
    IF LOWER(p_sort_by) NOT IN ('factor_rh_id', 'codigo', 'nombre', 'eliminado') THEN
        p_sort_by := 'factor_rh_id';
    END IF;
    
    -- Calcular offset
    v_offset := (p_page - 1) * p_page_size;
    
    -- Retornar resultados paginados
    RETURN QUERY
    SELECT 
        fr.factor_rh_id,
        fr.codigo,
        fr.nombre,
        fr.eliminado
    FROM medico.factor_rh fr
    WHERE 
        fr.eliminado = FALSE
        AND (
            COALESCE(p_search_term, '') = '' 
            OR LOWER(fr.codigo) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(fr.nombre) LIKE LOWER('%' || p_search_term || '%')
        )
        AND (p_nombre IS NULL OR LOWER(fr.nombre) LIKE LOWER('%' || p_nombre || '%'))
        -- p_descripcion es parámetro de compatibilidad; la tabla no posee dicha columna
        AND (p_activo IS NULL OR (NOT fr.eliminado) = p_activo)
    ORDER BY 
        CASE WHEN LOWER(p_sort_by) = 'factor_rh_id' AND NOT p_sort_descending THEN fr.factor_rh_id END ASC,
        CASE WHEN LOWER(p_sort_by) = 'factor_rh_id' AND p_sort_descending THEN fr.factor_rh_id END DESC,
        CASE WHEN LOWER(p_sort_by) = 'codigo' AND NOT p_sort_descending THEN fr.codigo END ASC,
        CASE WHEN LOWER(p_sort_by) = 'codigo' AND p_sort_descending THEN fr.codigo END DESC,
        CASE WHEN LOWER(p_sort_by) = 'nombre' AND NOT p_sort_descending THEN fr.nombre END ASC,
        CASE WHEN LOWER(p_sort_by) = 'nombre' AND p_sort_descending THEN fr.nombre END DESC,
        CASE WHEN LOWER(p_sort_by) = 'eliminado' AND NOT p_sort_descending THEN fr.eliminado END ASC,
        CASE WHEN LOWER(p_sort_by) = 'eliminado' AND p_sort_descending THEN fr.eliminado END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$;


ALTER FUNCTION medico.sp_getfactorrhpaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean) OWNER TO postgres;

--
-- TOC entry 8400 (class 0 OID 0)
-- Dependencies: 729
-- Name: FUNCTION sp_getfactorrhpaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getfactorrhpaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean) IS 'Obtiene factores RH con paginación, búsqueda, filtros y ordenamiento';


--
-- TOC entry 718 (class 1255 OID 21838)
-- Name: sp_getformapagopaged(integer, integer, character varying, character varying, character varying); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getformapagopaged(p_page_number integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_column character varying DEFAULT 'forma_pago_id'::character varying, p_sort_direction character varying DEFAULT 'ASC'::character varying) RETURNS TABLE(forma_pago_id bigint, codigo character varying, nombre character varying, eliminado boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validar parámetros de entrada
    IF p_page_number < 1 THEN
        p_page_number := 1;
    END IF;
    
    IF p_page_size < 1 THEN
        p_page_size := 10;
    END IF;
    
    IF p_page_size > 100 THEN
        p_page_size := 100;
    END IF;
    
    -- Validar columna de ordenamiento
    IF p_sort_column NOT IN ('forma_pago_id', 'codigo', 'nombre') THEN
        p_sort_column := 'forma_pago_id';
    END IF;
    
    -- Validar dirección de ordenamiento
    IF UPPER(p_sort_direction) NOT IN ('ASC', 'DESC') THEN
        p_sort_direction := 'ASC';
    END IF;
    
    -- Calcular offset
    v_offset := (p_page_number - 1) * p_page_size;
    
    -- Retornar resultados paginados
    RETURN QUERY
    SELECT 
        fp.forma_pago_id,
        fp.codigo,
        fp.nombre,
        fp.eliminado
    FROM medico.forma_pago fp
    WHERE 
        fp.eliminado = false
        AND (
            p_search_term = '' 
            OR LOWER(fp.codigo) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(fp.nombre) LIKE LOWER('%' || p_search_term || '%')
        )
    ORDER BY 
        CASE WHEN p_sort_column = 'forma_pago_id' AND UPPER(p_sort_direction) = 'ASC' THEN fp.forma_pago_id END ASC,
        CASE WHEN p_sort_column = 'forma_pago_id' AND UPPER(p_sort_direction) = 'DESC' THEN fp.forma_pago_id END DESC,
        CASE WHEN p_sort_column = 'codigo' AND UPPER(p_sort_direction) = 'ASC' THEN fp.codigo END ASC,
        CASE WHEN p_sort_column = 'codigo' AND UPPER(p_sort_direction) = 'DESC' THEN fp.codigo END DESC,
        CASE WHEN p_sort_column = 'nombre' AND UPPER(p_sort_direction) = 'ASC' THEN fp.nombre END ASC,
        CASE WHEN p_sort_column = 'nombre' AND UPPER(p_sort_direction) = 'DESC' THEN fp.nombre END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$;


ALTER FUNCTION medico.sp_getformapagopaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying) OWNER TO postgres;

--
-- TOC entry 8401 (class 0 OID 0)
-- Dependencies: 718
-- Name: FUNCTION sp_getformapagopaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getformapagopaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying) IS 'Obtiene formas de pago con paginación, búsqueda y ordenamiento';


--
-- TOC entry 730 (class 1255 OID 21855)
-- Name: sp_getformapagopaged(integer, integer, character varying, character varying, boolean, character varying, character varying, boolean); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getformapagopaged(p_page integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_by character varying DEFAULT 'forma_pago_id'::character varying, p_sort_descending boolean DEFAULT false, p_nombre character varying DEFAULT NULL::character varying, p_descripcion character varying DEFAULT NULL::character varying, p_activo boolean DEFAULT NULL::boolean) RETURNS TABLE(forma_pago_id bigint, codigo character varying, nombre character varying, eliminado boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validar parámetros de entrada
    IF p_page < 1 THEN
        p_page := 1;
    END IF;
    
    IF p_page_size < 1 THEN
        p_page_size := 10;
    END IF;
    
    IF p_page_size > 100 THEN
        p_page_size := 100;
    END IF;
    
    -- Validar columna de ordenamiento
    IF LOWER(p_sort_by) NOT IN ('forma_pago_id', 'codigo', 'nombre', 'eliminado') THEN
        p_sort_by := 'forma_pago_id';
    END IF;

    -- Calcular offset
    v_offset := (p_page - 1) * p_page_size;
    
    -- Retornar resultados paginados
    RETURN QUERY
    SELECT 
        fp.forma_pago_id,
        fp.codigo,
        fp.nombre,
        fp.eliminado
    FROM medico.forma_pago fp
    WHERE 
        fp.eliminado = FALSE
        AND (
            COALESCE(p_search_term, '') = ''
            OR LOWER(fp.codigo) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(fp.nombre) LIKE LOWER('%' || p_search_term || '%')
        )
        AND (p_nombre IS NULL OR LOWER(fp.nombre) LIKE LOWER('%' || p_nombre || '%'))
        -- p_descripcion es parámetro de compatibilidad; la tabla no posee dicha columna
        AND (p_activo IS NULL OR (NOT fp.eliminado) = p_activo)
    ORDER BY
        CASE WHEN LOWER(p_sort_by) = 'forma_pago_id' AND NOT p_sort_descending THEN fp.forma_pago_id END ASC,
        CASE WHEN LOWER(p_sort_by) = 'forma_pago_id' AND p_sort_descending THEN fp.forma_pago_id END DESC,
        CASE WHEN LOWER(p_sort_by) = 'codigo' AND NOT p_sort_descending THEN fp.codigo END ASC,
        CASE WHEN LOWER(p_sort_by) = 'codigo' AND p_sort_descending THEN fp.codigo END DESC,
        CASE WHEN LOWER(p_sort_by) = 'nombre' AND NOT p_sort_descending THEN fp.nombre END ASC,
        CASE WHEN LOWER(p_sort_by) = 'nombre' AND p_sort_descending THEN fp.nombre END DESC,
        CASE WHEN LOWER(p_sort_by) = 'eliminado' AND NOT p_sort_descending THEN fp.eliminado END ASC,
        CASE WHEN LOWER(p_sort_by) = 'eliminado' AND p_sort_descending THEN fp.eliminado END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$;


ALTER FUNCTION medico.sp_getformapagopaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean) OWNER TO postgres;

--
-- TOC entry 8402 (class 0 OID 0)
-- Dependencies: 730
-- Name: FUNCTION sp_getformapagopaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getformapagopaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean) IS 'Obtiene formas de pago con paginación, búsqueda, filtros y ordenamiento';


--
-- TOC entry 719 (class 1255 OID 21839)
-- Name: sp_getgruposanguineopaged(integer, integer, character varying, character varying, character varying); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getgruposanguineopaged(p_page_number integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_column character varying DEFAULT 'grupo_sanguineo_id'::character varying, p_sort_direction character varying DEFAULT 'ASC'::character varying) RETURNS TABLE(grupo_sanguineo_id bigint, codigo character varying, nombre character varying, eliminado boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validar parámetros de entrada
    IF p_page_number < 1 THEN
        p_page_number := 1;
    END IF;
    
    IF p_page_size < 1 THEN
        p_page_size := 10;
    END IF;
    
    IF p_page_size > 100 THEN
        p_page_size := 100;
    END IF;
    
    -- Validar columna de ordenamiento
    IF p_sort_column NOT IN ('grupo_sanguineo_id', 'codigo', 'nombre') THEN
        p_sort_column := 'grupo_sanguineo_id';
    END IF;
    
    -- Validar dirección de ordenamiento
    IF UPPER(p_sort_direction) NOT IN ('ASC', 'DESC') THEN
        p_sort_direction := 'ASC';
    END IF;
    
    -- Calcular offset
    v_offset := (p_page_number - 1) * p_page_size;
    
    -- Retornar resultados paginados
    RETURN QUERY
    SELECT 
        gs.grupo_sanguineo_id,
        gs.codigo,
        gs.nombre,
        gs.eliminado
    FROM medico.grupo_sanguineo gs
    WHERE 
        gs.eliminado = false
        AND (
            p_search_term = '' 
            OR LOWER(gs.codigo) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(gs.nombre) LIKE LOWER('%' || p_search_term || '%')
        )
    ORDER BY 
        CASE WHEN p_sort_column = 'grupo_sanguineo_id' AND UPPER(p_sort_direction) = 'ASC' THEN gs.grupo_sanguineo_id END ASC,
        CASE WHEN p_sort_column = 'grupo_sanguineo_id' AND UPPER(p_sort_direction) = 'DESC' THEN gs.grupo_sanguineo_id END DESC,
        CASE WHEN p_sort_column = 'codigo' AND UPPER(p_sort_direction) = 'ASC' THEN gs.codigo END ASC,
        CASE WHEN p_sort_column = 'codigo' AND UPPER(p_sort_direction) = 'DESC' THEN gs.codigo END DESC,
        CASE WHEN p_sort_column = 'nombre' AND UPPER(p_sort_direction) = 'ASC' THEN gs.nombre END ASC,
        CASE WHEN p_sort_column = 'nombre' AND UPPER(p_sort_direction) = 'DESC' THEN gs.nombre END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$;


ALTER FUNCTION medico.sp_getgruposanguineopaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying) OWNER TO postgres;

--
-- TOC entry 8403 (class 0 OID 0)
-- Dependencies: 719
-- Name: FUNCTION sp_getgruposanguineopaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getgruposanguineopaged(p_page_number integer, p_page_size integer, p_search_term character varying, p_sort_column character varying, p_sort_direction character varying) IS 'Obtiene grupos sanguíneos con paginación, búsqueda y ordenamiento';


--
-- TOC entry 731 (class 1255 OID 21856)
-- Name: sp_getgruposanguineopaged(integer, integer, character varying, character varying, boolean, character varying, character varying, boolean); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_getgruposanguineopaged(p_page integer DEFAULT 1, p_page_size integer DEFAULT 10, p_search_term character varying DEFAULT ''::character varying, p_sort_by character varying DEFAULT 'grupo_sanguineo_id'::character varying, p_sort_descending boolean DEFAULT false, p_nombre character varying DEFAULT NULL::character varying, p_descripcion character varying DEFAULT NULL::character varying, p_activo boolean DEFAULT NULL::boolean) RETURNS TABLE(grupo_sanguineo_id bigint, codigo character varying, nombre character varying, eliminado boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_offset INTEGER;
BEGIN
    -- Validar parámetros de entrada
    IF p_page < 1 THEN
        p_page := 1;
    END IF;
    
    IF p_page_size < 1 THEN
        p_page_size := 10;
    END IF;
    
    IF p_page_size > 100 THEN
        p_page_size := 100;
    END IF;
    
    -- Validar columna de ordenamiento
    IF LOWER(p_sort_by) NOT IN ('grupo_sanguineo_id', 'codigo', 'nombre', 'eliminado') THEN
        p_sort_by := 'grupo_sanguineo_id';
    END IF;
    
    -- Calcular offset
    v_offset := (p_page - 1) * p_page_size;
    
    -- Retornar resultados paginados
    RETURN QUERY
    SELECT 
        gs.grupo_sanguineo_id,
        gs.codigo,
        gs.nombre,
        gs.eliminado
    FROM medico.grupo_sanguineo gs
    WHERE 
        gs.eliminado = FALSE
        AND (
            COALESCE(p_search_term, '') = '' 
            OR LOWER(gs.codigo) LIKE LOWER('%' || p_search_term || '%')
            OR LOWER(gs.nombre) LIKE LOWER('%' || p_search_term || '%')
        )
        AND (p_nombre IS NULL OR LOWER(gs.nombre) LIKE LOWER('%' || p_nombre || '%'))
        -- p_descripcion es parámetro de compatibilidad; la tabla no posee dicha columna
        AND (p_activo IS NULL OR (NOT gs.eliminado) = p_activo)
    ORDER BY 
        CASE WHEN LOWER(p_sort_by) = 'grupo_sanguineo_id' AND NOT p_sort_descending THEN gs.grupo_sanguineo_id END ASC,
        CASE WHEN LOWER(p_sort_by) = 'grupo_sanguineo_id' AND p_sort_descending THEN gs.grupo_sanguineo_id END DESC,
        CASE WHEN LOWER(p_sort_by) = 'codigo' AND NOT p_sort_descending THEN gs.codigo END ASC,
        CASE WHEN LOWER(p_sort_by) = 'codigo' AND p_sort_descending THEN gs.codigo END DESC,
        CASE WHEN LOWER(p_sort_by) = 'nombre' AND NOT p_sort_descending THEN gs.nombre END ASC,
        CASE WHEN LOWER(p_sort_by) = 'nombre' AND p_sort_descending THEN gs.nombre END DESC,
        CASE WHEN LOWER(p_sort_by) = 'eliminado' AND NOT p_sort_descending THEN gs.eliminado END ASC,
        CASE WHEN LOWER(p_sort_by) = 'eliminado' AND p_sort_descending THEN gs.eliminado END DESC
    LIMIT p_page_size OFFSET v_offset;
END;
$$;


ALTER FUNCTION medico.sp_getgruposanguineopaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean) OWNER TO postgres;

--
-- TOC entry 8404 (class 0 OID 0)
-- Dependencies: 731
-- Name: FUNCTION sp_getgruposanguineopaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean); Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON FUNCTION medico.sp_getgruposanguineopaged(p_page integer, p_page_size integer, p_search_term character varying, p_sort_by character varying, p_sort_descending boolean, p_nombre character varying, p_descripcion character varying, p_activo boolean) IS 'Obtiene grupos sanguíneos con paginación, búsqueda, filtros y ordenamiento';


--
-- TOC entry 700 (class 1255 OID 21813)
-- Name: sp_transicion_emergencia_a_hospitalizacion(bigint, bigint, bigint, bigint, bigint, bigint, text, bigint); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.sp_transicion_emergencia_a_hospitalizacion(p_atencion_id bigint, p_episodio_emergencia_id bigint, p_servicio_destino_id bigint, p_cama_destino_id bigint, p_medico_responsable_id bigint, p_diagnostico_id bigint, p_motivo_transicion text, p_usuario_id bigint) RETURNS bigint
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_episodio_hospitalizacion_id BIGINT;
    v_hospitalizacion_id BIGINT;
    v_numero_hospitalizacion VARCHAR;
    v_paciente_id BIGINT;
BEGIN
    -- Obtener paciente
    SELECT paciente_id INTO v_paciente_id
    FROM ATENCION WHERE atencion_id = p_atencion_id;
    
    -- Validar que la cama esté disponible
    IF NOT EXISTS (
        SELECT 1 FROM CAMA 
        WHERE cama_id = p_cama_destino_id 
        AND estado_cama_id = (SELECT estado_cama_id FROM ESTADO_CAMA WHERE codigo = 'disponible')
    ) THEN
        RAISE EXCEPTION 'La cama seleccionada no está disponible';
    END IF;
    
    -- Cerrar episodio de emergencia
    UPDATE EPISODIO_CLINICO
    SET 
        fecha_hora_fin = NOW(),
        diagnostico_salida_episodio_id = p_diagnostico_id,
        estado_episodio_id = (SELECT estado_episodio_id FROM ESTADO_EPISODIO WHERE codigo = 'TRANSFERIDO'),
        usuario_actualizacion_id = p_usuario_id,
        fecha_actualizacion = NOW()
    WHERE episodio_id = p_episodio_emergencia_id;
    
    -- Crear nuevo episodio de hospitalización
    INSERT INTO EPISODIO_CLINICO (
        atencion_id,
        tipo_episodio_id,
        numero_episodio,
        fecha_hora_inicio,
        servicio_id,
        cama_id,
        personal_responsable_id,
        diagnostico_ingreso_episodio_id,
        estado_episodio_id,
        episodio_origen_id,
        motivo_transicion,
        usuario_creacion_id
    ) VALUES (
        p_atencion_id,
        (SELECT tipo_episodio_id FROM TIPO_EPISODIO WHERE codigo = 'HOSPITALIZACION'),
        (SELECT COALESCE(MAX(numero_episodio), 0) + 1 FROM EPISODIO_CLINICO WHERE atencion_id = p_atencion_id),
        NOW(),
        p_servicio_destino_id,
        p_cama_destino_id,
        p_medico_responsable_id,
        p_diagnostico_id,
        (SELECT estado_episodio_id FROM ESTADO_EPISODIO WHERE codigo = 'ACTIVO'),
        p_episodio_emergencia_id,
        p_motivo_transicion,
        p_usuario_id
    ) RETURNING episodio_id INTO v_episodio_hospitalizacion_id;
    
    -- Registrar transición
    INSERT INTO TRANSICION_ATENCION (
        atencion_id,
        episodio_origen_id,
        episodio_destino_id,
        tipo_transicion_id,
        fecha_hora_transicion,
        personal_autoriza_id,
        motivo_transicion,
        servicio_destino_id,
        cama_destino_id,
        diagnostico_momento_transicion_id,
        usuario_creacion_id
    ) VALUES (
        p_atencion_id,
        p_episodio_emergencia_id,
        v_episodio_hospitalizacion_id,
        (SELECT tipo_transicion_id FROM TIPO_TRANSICION WHERE codigo = 'PASO_HOSPITALIZACION'),
        NOW(),
        p_medico_responsable_id,
        p_motivo_transicion,
        p_servicio_destino_id,
        p_cama_destino_id,
        p_diagnostico_id,
        p_usuario_id
    );
    
    -- Generar número de hospitalización
    v_numero_hospitalizacion := generar_numero_hospitalizacion();
    
    -- Crear registro de hospitalización
    INSERT INTO HOSPITALIZACION (
        episodio_id,
        atencion_id,
        paciente_id,
        numero_hospitalizacion,
        fecha_hora_ingreso_hospitalario,
        cama_actual_id,
        servicio_actual_id,
        estado,
        usuario_creacion_id
    ) VALUES (
        v_episodio_hospitalizacion_id,
        p_atencion_id,
        v_paciente_id,
        v_numero_hospitalizacion,
        NOW(),
        p_cama_destino_id,
        p_servicio_destino_id,
        'activo',
        p_usuario_id
    ) RETURNING hospitalizacion_id INTO v_hospitalizacion_id;
    
    -- Asignar médico responsable
    INSERT INTO MEDICO_HOSPITALIZACION (
        hospitalizacion_id,
        episodio_id,
        personal_id,
        tipo_participacion,
        fecha_inicio,
        es_responsable_actual,
        usuario_creacion_id
    ) VALUES (
        v_hospitalizacion_id,
        v_episodio_hospitalizacion_id,
        p_medico_responsable_id,
        'tratante',
        NOW(),
        TRUE,
        p_usuario_id
    );
    
    -- Actualizar atención
    UPDATE ATENCION
    SET 
        tipo_atencion_actual_id = (SELECT tipo_atencion_id FROM TIPO_ATENCION WHERE codigo = 'HOSPITALARIA'),
        estado_atencion_id = (SELECT estado_atencion_id FROM ESTADO_ATENCION WHERE codigo = 'HOSPITALIZADO'),
        cama_id = p_cama_destino_id,
        personal_responsable_id = p_medico_responsable_id,
        usuario_actualizacion_id = p_usuario_id,
        fecha_actualizacion = NOW()
    WHERE atencion_id = p_atencion_id;
    
    -- Actualizar estado de cama
    UPDATE CAMA 
    SET estado_cama_id = (SELECT estado_cama_id FROM ESTADO_CAMA WHERE codigo = 'ocupada')
    WHERE cama_id = p_cama_destino_id;
    
    RETURN v_hospitalizacion_id;
END;
$$;


ALTER FUNCTION medico.sp_transicion_emergencia_a_hospitalizacion(p_atencion_id bigint, p_episodio_emergencia_id bigint, p_servicio_destino_id bigint, p_cama_destino_id bigint, p_medico_responsable_id bigint, p_diagnostico_id bigint, p_motivo_transicion text, p_usuario_id bigint) OWNER TO postgres;

--
-- TOC entry 667 (class 1255 OID 16457)
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION medico.trigger_set_timestamp() OWNER TO postgres;

--
-- TOC entry 673 (class 1255 OID 21805)
-- Name: validar_cita_duplicada(); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.validar_cita_duplicada() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM CITA c
        INNER JOIN AGENDA a ON c.agenda_id = a.agenda_id
        WHERE a.personal_id = (SELECT personal_id FROM AGENDA WHERE agenda_id = NEW.agenda_id)
        AND c.fecha_hora_programada = NEW.fecha_hora_programada
        AND c.estado_cita_id NOT IN (SELECT estado_cita_id FROM ESTADO_CITA WHERE codigo IN ('CANCELADA', 'NO_ASISTIO'))
        AND c.cita_id != COALESCE(NEW.cita_id, 0)
        AND c.eliminado = FALSE
    ) THEN
        RAISE EXCEPTION 'Ya existe una cita programada para este médico en el horario seleccionado';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION medico.validar_cita_duplicada() OWNER TO postgres;

--
-- TOC entry 670 (class 1255 OID 21753)
-- Name: validar_fecha_vencimiento(); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.validar_fecha_vencimiento() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.fecha_vencimiento <= CURRENT_DATE THEN
        NEW.estado_lote = 'vencido';
    ELSIF NEW.fecha_vencimiento <= CURRENT_DATE + INTERVAL '3 months' THEN
        NEW.estado_lote = 'por_vencer';
    ELSE
        NEW.estado_lote = 'disponible';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION medico.validar_fecha_vencimiento() OWNER TO postgres;

--
-- TOC entry 675 (class 1255 OID 21809)
-- Name: validar_fechas_episodio(); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.validar_fechas_episodio() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.fecha_hora_fin IS NOT NULL AND NEW.fecha_hora_fin < NEW.fecha_hora_inicio THEN
        RAISE EXCEPTION 'La fecha de fin no puede ser anterior a la fecha de inicio';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION medico.validar_fechas_episodio() OWNER TO postgres;

--
-- TOC entry 674 (class 1255 OID 21807)
-- Name: validar_stock_dispensacion(); Type: FUNCTION; Schema: medico; Owner: postgres
--

CREATE FUNCTION medico.validar_stock_dispensacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_stock_disponible NUMERIC;
BEGIN
    SELECT cantidad_actual INTO v_stock_disponible
    FROM LOTE_PRODUCTO
    WHERE lote_id = NEW.lote_id;
    
    IF v_stock_disponible < NEW.cantidad_entregada THEN
        RAISE EXCEPTION 'Stock insuficiente. Disponible: %, Solicitado: %', v_stock_disponible, NEW.cantidad_entregada;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION medico.validar_stock_dispensacion() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 419 (class 1259 OID 18188)
-- Name: agenda; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.agenda (
    agenda_id bigint NOT NULL,
    personal_id bigint NOT NULL,
    consultorio_id bigint NOT NULL,
    servicio_id bigint NOT NULL,
    fecha date NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fin time without time zone NOT NULL,
    intervalo_minutos integer NOT NULL,
    cupo_maximo integer NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.agenda OWNER TO postgres;

--
-- TOC entry 418 (class 1259 OID 18187)
-- Name: agenda_agenda_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.agenda_agenda_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.agenda_agenda_id_seq OWNER TO postgres;

--
-- TOC entry 8405 (class 0 OID 0)
-- Dependencies: 418
-- Name: agenda_agenda_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.agenda_agenda_id_seq OWNED BY medico.agenda.agenda_id;


--
-- TOC entry 387 (class 1259 OID 17780)
-- Name: alergia; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.alergia (
    alergia_id bigint NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(300) NOT NULL,
    tipo_alergia character varying(100),
    gravedad character varying(50),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.alergia OWNER TO postgres;

--
-- TOC entry 386 (class 1259 OID 17779)
-- Name: alergia_alergia_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.alergia_alergia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.alergia_alergia_id_seq OWNER TO postgres;

--
-- TOC entry 8406 (class 0 OID 0)
-- Dependencies: 386
-- Name: alergia_alergia_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.alergia_alergia_id_seq OWNED BY medico.alergia.alergia_id;


--
-- TOC entry 579 (class 1259 OID 21217)
-- Name: alerta_ia; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.alerta_ia (
    alerta_ia_id bigint NOT NULL,
    modelo_id bigint NOT NULL,
    tipo_alerta character varying(100) NOT NULL,
    paciente_id bigint,
    atencion_id bigint,
    receta_id bigint,
    producto_id bigint,
    nivel_severidad character varying(50) NOT NULL,
    mensaje text NOT NULL,
    recomendacion text,
    fecha_hora_generacion timestamp without time zone DEFAULT now() NOT NULL,
    fue_atendida boolean DEFAULT false,
    personal_atiende_id bigint,
    accion_tomada text,
    fecha_hora_atencion timestamp without time zone,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.alerta_ia OWNER TO postgres;

--
-- TOC entry 578 (class 1259 OID 21216)
-- Name: alerta_ia_alerta_ia_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.alerta_ia_alerta_ia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.alerta_ia_alerta_ia_id_seq OWNER TO postgres;

--
-- TOC entry 8407 (class 0 OID 0)
-- Dependencies: 578
-- Name: alerta_ia_alerta_ia_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.alerta_ia_alerta_ia_id_seq OWNED BY medico.alerta_ia.alerta_ia_id;


--
-- TOC entry 467 (class 1259 OID 19241)
-- Name: almacen; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.almacen (
    almacen_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    sede_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(200) NOT NULL,
    tipo_almacen_id bigint,
    responsable_id bigint,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.almacen OWNER TO postgres;

--
-- TOC entry 466 (class 1259 OID 19240)
-- Name: almacen_almacen_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.almacen_almacen_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.almacen_almacen_id_seq OWNER TO postgres;

--
-- TOC entry 8408 (class 0 OID 0)
-- Dependencies: 466
-- Name: almacen_almacen_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.almacen_almacen_id_seq OWNED BY medico.almacen.almacen_id;


--
-- TOC entry 393 (class 1259 OID 17840)
-- Name: antecedente_medico; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.antecedente_medico (
    antecedente_id bigint NOT NULL,
    cie10_id bigint,
    codigo character varying(50) NOT NULL,
    nombre character varying(300) NOT NULL,
    tipo_antecedente character varying(100),
    categoria character varying(50),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.antecedente_medico OWNER TO postgres;

--
-- TOC entry 392 (class 1259 OID 17839)
-- Name: antecedente_medico_antecedente_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.antecedente_medico_antecedente_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.antecedente_medico_antecedente_id_seq OWNER TO postgres;

--
-- TOC entry 8409 (class 0 OID 0)
-- Dependencies: 392
-- Name: antecedente_medico_antecedente_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.antecedente_medico_antecedente_id_seq OWNED BY medico.antecedente_medico.antecedente_id;


--
-- TOC entry 517 (class 1259 OID 20199)
-- Name: apertura_caja; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.apertura_caja (
    apertura_id bigint NOT NULL,
    caja_id bigint NOT NULL,
    personal_id bigint NOT NULL,
    fecha_apertura timestamp without time zone DEFAULT now() NOT NULL,
    fecha_cierre timestamp without time zone,
    turno character varying(50),
    monto_inicial numeric(12,2) NOT NULL,
    monto_ingresos numeric(12,2) DEFAULT 0,
    monto_egresos numeric(12,2) DEFAULT 0,
    monto_final_sistema numeric(12,2) DEFAULT 0,
    efectivo_contado numeric(12,2) DEFAULT 0,
    tarjeta_credito numeric(12,2) DEFAULT 0,
    tarjeta_debito numeric(12,2) DEFAULT 0,
    transferencias numeric(12,2) DEFAULT 0,
    depositos numeric(12,2) DEFAULT 0,
    cheques numeric(12,2) DEFAULT 0,
    otros numeric(12,2) DEFAULT 0,
    monto_final_fisico numeric(12,2) DEFAULT 0,
    diferencia numeric(12,2) DEFAULT 0,
    observaciones text,
    personal_supervisa_id bigint,
    estado_caja_id bigint,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.apertura_caja OWNER TO postgres;

--
-- TOC entry 516 (class 1259 OID 20198)
-- Name: apertura_caja_apertura_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.apertura_caja_apertura_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.apertura_caja_apertura_id_seq OWNER TO postgres;

--
-- TOC entry 8410 (class 0 OID 0)
-- Dependencies: 516
-- Name: apertura_caja_apertura_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.apertura_caja_apertura_id_seq OWNED BY medico.apertura_caja.apertura_id;


--
-- TOC entry 317 (class 1259 OID 17153)
-- Name: area_examen; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.area_examen (
    area_examen_id bigint NOT NULL,
    categoria_examen_id bigint,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.area_examen OWNER TO postgres;

--
-- TOC entry 316 (class 1259 OID 17152)
-- Name: area_examen_area_examen_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.area_examen_area_examen_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.area_examen_area_examen_id_seq OWNER TO postgres;

--
-- TOC entry 8411 (class 0 OID 0)
-- Dependencies: 316
-- Name: area_examen_area_examen_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.area_examen_area_examen_id_seq OWNED BY medico.area_examen.area_examen_id;


--
-- TOC entry 383 (class 1259 OID 17730)
-- Name: aseguradora; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.aseguradora (
    aseguradora_id bigint NOT NULL,
    ruc character varying(11) NOT NULL,
    razon_social character varying(300) NOT NULL,
    tipo_aseguradora_id bigint,
    contacto character varying(200),
    telefono character varying(20),
    email character varying(200),
    direccion text,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.aseguradora OWNER TO postgres;

--
-- TOC entry 382 (class 1259 OID 17729)
-- Name: aseguradora_aseguradora_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.aseguradora_aseguradora_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.aseguradora_aseguradora_id_seq OWNER TO postgres;

--
-- TOC entry 8412 (class 0 OID 0)
-- Dependencies: 382
-- Name: aseguradora_aseguradora_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.aseguradora_aseguradora_id_seq OWNED BY medico.aseguradora.aseguradora_id;


--
-- TOC entry 423 (class 1259 OID 18274)
-- Name: atencion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.atencion (
    atencion_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    sede_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    cita_id bigint,
    numero_atencion character varying(50) NOT NULL,
    tipo_atencion_id bigint,
    tipo_atencion_actual_id bigint,
    fecha_hora_registro timestamp without time zone DEFAULT now() NOT NULL,
    fecha_hora_inicio timestamp without time zone,
    fecha_hora_fin timestamp without time zone,
    consultorio_id bigint,
    cama_id bigint,
    personal_responsable_id bigint,
    estado_atencion_id bigint,
    atencion_origen_id bigint,
    observaciones_generales text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.atencion OWNER TO postgres;

--
-- TOC entry 8413 (class 0 OID 0)
-- Dependencies: 423
-- Name: TABLE atencion; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON TABLE medico.atencion IS 'Contenedor principal de todo el proceso de atención médica';


--
-- TOC entry 8414 (class 0 OID 0)
-- Dependencies: 423
-- Name: COLUMN atencion.numero_atencion; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON COLUMN medico.atencion.numero_atencion IS 'Número único de atención por organización';


--
-- TOC entry 8415 (class 0 OID 0)
-- Dependencies: 423
-- Name: COLUMN atencion.tipo_atencion_id; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON COLUMN medico.atencion.tipo_atencion_id IS 'Tipo inicial de atención al momento del registro';


--
-- TOC entry 8416 (class 0 OID 0)
-- Dependencies: 423
-- Name: COLUMN atencion.tipo_atencion_actual_id; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON COLUMN medico.atencion.tipo_atencion_actual_id IS 'Tipo actual de atención (puede cambiar durante episodios)';


--
-- TOC entry 422 (class 1259 OID 18273)
-- Name: atencion_atencion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.atencion_atencion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.atencion_atencion_id_seq OWNER TO postgres;

--
-- TOC entry 8417 (class 0 OID 0)
-- Dependencies: 422
-- Name: atencion_atencion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.atencion_atencion_id_seq OWNED BY medico.atencion.atencion_id;


--
-- TOC entry 551 (class 1259 OID 20788)
-- Name: auditoria_hc; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.auditoria_hc (
    auditoria_hc_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    atencion_id bigint,
    hospitalizacion_id bigint,
    tipo_auditoria_id bigint,
    numero_auditoria character varying(50) NOT NULL,
    fecha_auditoria date DEFAULT CURRENT_DATE NOT NULL,
    auditor_id bigint,
    hallazgos_generales text,
    recomendaciones_generales text,
    puntaje_total numeric(8,2),
    puntaje_maximo numeric(8,2),
    porcentaje_cumplimiento numeric(5,2),
    calificacion character varying(50),
    requiere_plan_mejora boolean DEFAULT false,
    fecha_seguimiento date,
    estado character varying(20) DEFAULT 'en_proceso'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.auditoria_hc OWNER TO postgres;

--
-- TOC entry 550 (class 1259 OID 20787)
-- Name: auditoria_hc_auditoria_hc_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.auditoria_hc_auditoria_hc_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.auditoria_hc_auditoria_hc_id_seq OWNER TO postgres;

--
-- TOC entry 8418 (class 0 OID 0)
-- Dependencies: 550
-- Name: auditoria_hc_auditoria_hc_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.auditoria_hc_auditoria_hc_id_seq OWNED BY medico.auditoria_hc.auditoria_hc_id;


--
-- TOC entry 533 (class 1259 OID 20496)
-- Name: balance; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.balance (
    balance_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    periodo_id bigint NOT NULL,
    tipo_balance_id bigint,
    fecha_generacion date DEFAULT CURRENT_DATE NOT NULL,
    total_ingresos numeric(15,2) DEFAULT 0 NOT NULL,
    total_egresos numeric(15,2) DEFAULT 0 NOT NULL,
    utilidad_bruta numeric(15,2) DEFAULT 0 NOT NULL,
    gastos_operativos numeric(15,2) DEFAULT 0 NOT NULL,
    gastos_administrativos numeric(15,2) DEFAULT 0 NOT NULL,
    gastos_financieros numeric(15,2) DEFAULT 0 NOT NULL,
    utilidad_operativa numeric(15,2) DEFAULT 0 NOT NULL,
    utilidad_neta numeric(15,2) DEFAULT 0 NOT NULL,
    observaciones text,
    personal_elabora_id bigint,
    personal_aprueba_id bigint,
    estado character varying(20) DEFAULT 'borrador'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.balance OWNER TO postgres;

--
-- TOC entry 532 (class 1259 OID 20495)
-- Name: balance_balance_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.balance_balance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.balance_balance_id_seq OWNER TO postgres;

--
-- TOC entry 8419 (class 0 OID 0)
-- Dependencies: 532
-- Name: balance_balance_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.balance_balance_id_seq OWNED BY medico.balance.balance_id;


--
-- TOC entry 515 (class 1259 OID 20164)
-- Name: caja; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.caja (
    caja_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    sede_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(200) NOT NULL,
    tipo_caja_id bigint,
    monto_inicial_default numeric(12,2) DEFAULT 0,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.caja OWNER TO postgres;

--
-- TOC entry 514 (class 1259 OID 20163)
-- Name: caja_caja_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.caja_caja_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.caja_caja_id_seq OWNER TO postgres;

--
-- TOC entry 8420 (class 0 OID 0)
-- Dependencies: 514
-- Name: caja_caja_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.caja_caja_id_seq OWNED BY medico.caja.caja_id;


--
-- TOC entry 415 (class 1259 OID 18138)
-- Name: cama; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.cama (
    cama_id bigint NOT NULL,
    sede_id bigint NOT NULL,
    codigo character varying(50) NOT NULL,
    pabellon character varying(100),
    piso character varying(10),
    habitacion character varying(50),
    numero_cama character varying(20),
    tipo_cama_id bigint,
    estado_cama_id bigint,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.cama OWNER TO postgres;

--
-- TOC entry 414 (class 1259 OID 18137)
-- Name: cama_cama_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.cama_cama_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.cama_cama_id_seq OWNER TO postgres;

--
-- TOC entry 8421 (class 0 OID 0)
-- Dependencies: 414
-- Name: cama_cama_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.cama_cama_id_seq OWNED BY medico.cama.cama_id;


--
-- TOC entry 245 (class 1259 OID 16618)
-- Name: cargo; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.cargo (
    cargo_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    tipo_personal_id bigint,
    descripcion text,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.cargo OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 16617)
-- Name: cargo_cargo_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.cargo_cargo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.cargo_cargo_id_seq OWNER TO postgres;

--
-- TOC entry 8422 (class 0 OID 0)
-- Dependencies: 244
-- Name: cargo_cargo_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.cargo_cargo_id_seq OWNED BY medico.cargo.cargo_id;


--
-- TOC entry 353 (class 1259 OID 17409)
-- Name: categoria_balance; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.categoria_balance (
    categoria_balance_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(200) NOT NULL,
    tipo_categoria character varying(50),
    padre_id bigint,
    nivel integer DEFAULT 1,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.categoria_balance OWNER TO postgres;

--
-- TOC entry 352 (class 1259 OID 17408)
-- Name: categoria_balance_categoria_balance_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.categoria_balance_categoria_balance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.categoria_balance_categoria_balance_id_seq OWNER TO postgres;

--
-- TOC entry 8423 (class 0 OID 0)
-- Dependencies: 352
-- Name: categoria_balance_categoria_balance_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.categoria_balance_categoria_balance_id_seq OWNED BY medico.categoria_balance.categoria_balance_id;


--
-- TOC entry 315 (class 1259 OID 17134)
-- Name: categoria_examen; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.categoria_examen (
    categoria_examen_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    padre_id bigint,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.categoria_examen OWNER TO postgres;

--
-- TOC entry 314 (class 1259 OID 17133)
-- Name: categoria_examen_categoria_examen_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.categoria_examen_categoria_examen_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.categoria_examen_categoria_examen_id_seq OWNER TO postgres;

--
-- TOC entry 8424 (class 0 OID 0)
-- Dependencies: 314
-- Name: categoria_examen_categoria_examen_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.categoria_examen_categoria_examen_id_seq OWNED BY medico.categoria_examen.categoria_examen_id;


--
-- TOC entry 345 (class 1259 OID 17350)
-- Name: categoria_movimiento; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.categoria_movimiento (
    categoria_movimiento_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(200) NOT NULL,
    tipo_movimiento character varying(20),
    afecta_flujo boolean DEFAULT true,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.categoria_movimiento OWNER TO postgres;

--
-- TOC entry 344 (class 1259 OID 17349)
-- Name: categoria_movimiento_categoria_movimiento_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.categoria_movimiento_categoria_movimiento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.categoria_movimiento_categoria_movimiento_id_seq OWNER TO postgres;

--
-- TOC entry 8425 (class 0 OID 0)
-- Dependencies: 344
-- Name: categoria_movimiento_categoria_movimiento_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.categoria_movimiento_categoria_movimiento_id_seq OWNED BY medico.categoria_movimiento.categoria_movimiento_id;


--
-- TOC entry 299 (class 1259 OID 17009)
-- Name: categoria_producto; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.categoria_producto (
    categoria_id bigint NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(200) NOT NULL,
    tipo_producto character varying(50),
    padre_id bigint,
    nivel integer DEFAULT 1,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.categoria_producto OWNER TO postgres;

--
-- TOC entry 298 (class 1259 OID 17008)
-- Name: categoria_producto_categoria_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.categoria_producto_categoria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.categoria_producto_categoria_id_seq OWNER TO postgres;

--
-- TOC entry 8426 (class 0 OID 0)
-- Dependencies: 298
-- Name: categoria_producto_categoria_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.categoria_producto_categoria_id_seq OWNED BY medico.categoria_producto.categoria_id;


--
-- TOC entry 363 (class 1259 OID 17489)
-- Name: categoria_reporte; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.categoria_reporte (
    categoria_reporte_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    icono character varying(50),
    orden integer,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.categoria_reporte OWNER TO postgres;

--
-- TOC entry 362 (class 1259 OID 17488)
-- Name: categoria_reporte_categoria_reporte_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.categoria_reporte_categoria_reporte_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.categoria_reporte_categoria_reporte_id_seq OWNER TO postgres;

--
-- TOC entry 8427 (class 0 OID 0)
-- Dependencies: 362
-- Name: categoria_reporte_categoria_reporte_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.categoria_reporte_categoria_reporte_id_seq OWNED BY medico.categoria_reporte.categoria_reporte_id;


--
-- TOC entry 391 (class 1259 OID 17823)
-- Name: cie10; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.cie10 (
    cie10_id bigint NOT NULL,
    codigo character varying(10) NOT NULL,
    descripcion text NOT NULL,
    categoria character varying(10),
    subcategoria character varying(10),
    tipo_lista character varying(50),
    sexo_aplicable character varying(20),
    edad_min integer,
    edad_max integer,
    uso_estadistico boolean DEFAULT true,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.cie10 OWNER TO postgres;

--
-- TOC entry 390 (class 1259 OID 17822)
-- Name: cie10_cie10_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.cie10_cie10_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.cie10_cie10_id_seq OWNER TO postgres;

--
-- TOC entry 8428 (class 0 OID 0)
-- Dependencies: 390
-- Name: cie10_cie10_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.cie10_cie10_id_seq OWNED BY medico.cie10.cie10_id;


--
-- TOC entry 443 (class 1259 OID 18757)
-- Name: cie10_personalizado; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.cie10_personalizado (
    cie10_personalizado_id bigint NOT NULL,
    cie10_id bigint NOT NULL,
    organizacion_id bigint,
    personal_id bigint,
    descripcion_personalizada text NOT NULL,
    codigo_interno character varying(50),
    uso_frecuente boolean DEFAULT false,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.cie10_personalizado OWNER TO postgres;

--
-- TOC entry 442 (class 1259 OID 18756)
-- Name: cie10_personalizado_cie10_personalizado_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.cie10_personalizado_cie10_personalizado_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.cie10_personalizado_cie10_personalizado_id_seq OWNER TO postgres;

--
-- TOC entry 8429 (class 0 OID 0)
-- Dependencies: 442
-- Name: cie10_personalizado_cie10_personalizado_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.cie10_personalizado_cie10_personalizado_id_seq OWNED BY medico.cie10_personalizado.cie10_personalizado_id;


--
-- TOC entry 421 (class 1259 OID 18224)
-- Name: cita; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.cita (
    cita_id bigint NOT NULL,
    agenda_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    numero_cita character varying(50) NOT NULL,
    tipo_cita_id bigint,
    motivo_consulta text,
    motivo_consulta_predefinido_id bigint,
    fecha_hora_programada timestamp without time zone NOT NULL,
    fecha_hora_inicio_real timestamp without time zone,
    fecha_hora_fin_real timestamp without time zone,
    duracion_minutos integer,
    estado_cita_id bigint,
    observaciones text,
    personal_registra_id bigint,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.cita OWNER TO postgres;

--
-- TOC entry 420 (class 1259 OID 18223)
-- Name: cita_cita_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.cita_cita_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.cita_cita_id_seq OWNER TO postgres;

--
-- TOC entry 8430 (class 0 OID 0)
-- Dependencies: 420
-- Name: cita_cita_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.cita_cita_id_seq OWNED BY medico.cita.cita_id;


--
-- TOC entry 507 (class 1259 OID 19973)
-- Name: comprobante; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.comprobante (
    comprobante_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    tipo_comprobante_id bigint NOT NULL,
    serie character varying(10) NOT NULL,
    numero character varying(20) NOT NULL,
    fecha_emision date DEFAULT CURRENT_DATE NOT NULL,
    fecha_vencimiento date,
    paciente_id bigint,
    atencion_id bigint,
    tipo_documento_cliente_id bigint,
    numero_documento_cliente character varying(20) NOT NULL,
    razon_social_cliente character varying(300) NOT NULL,
    direccion_cliente text,
    email_cliente character varying(200),
    moneda_id bigint,
    tipo_cambio numeric(8,4) DEFAULT 1.0000,
    forma_pago_id bigint,
    subtotal numeric(12,2) NOT NULL,
    descuento_global numeric(12,2) DEFAULT 0,
    igv numeric(12,2) NOT NULL,
    total numeric(12,2) NOT NULL,
    comprobante_referencia_id bigint,
    motivo_nota text,
    estado_sunat character varying(50) DEFAULT 'pendiente'::character varying,
    xml_url text,
    pdf_url text,
    cdr_url text,
    hash_cpe character varying(255),
    fecha_envio_sunat timestamp without time zone,
    observaciones text,
    estado character varying(20) DEFAULT 'emitido'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.comprobante OWNER TO postgres;

--
-- TOC entry 506 (class 1259 OID 19972)
-- Name: comprobante_comprobante_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.comprobante_comprobante_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.comprobante_comprobante_id_seq OWNER TO postgres;

--
-- TOC entry 8431 (class 0 OID 0)
-- Dependencies: 506
-- Name: comprobante_comprobante_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.comprobante_comprobante_id_seq OWNED BY medico.comprobante.comprobante_id;


--
-- TOC entry 339 (class 1259 OID 17308)
-- Name: concepto_facturacion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.concepto_facturacion (
    concepto_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.concepto_facturacion OWNER TO postgres;

--
-- TOC entry 338 (class 1259 OID 17307)
-- Name: concepto_facturacion_concepto_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.concepto_facturacion_concepto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.concepto_facturacion_concepto_id_seq OWNER TO postgres;

--
-- TOC entry 8432 (class 0 OID 0)
-- Dependencies: 338
-- Name: concepto_facturacion_concepto_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.concepto_facturacion_concepto_id_seq OWNED BY medico.concepto_facturacion.concepto_id;


--
-- TOC entry 349 (class 1259 OID 17379)
-- Name: concepto_planilla; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.concepto_planilla (
    concepto_planilla_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    tipo_concepto character varying(50),
    es_imponible boolean DEFAULT false,
    es_tributable boolean DEFAULT false,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.concepto_planilla OWNER TO postgres;

--
-- TOC entry 348 (class 1259 OID 17378)
-- Name: concepto_planilla_concepto_planilla_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.concepto_planilla_concepto_planilla_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.concepto_planilla_concepto_planilla_id_seq OWNER TO postgres;

--
-- TOC entry 8433 (class 0 OID 0)
-- Dependencies: 348
-- Name: concepto_planilla_concepto_planilla_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.concepto_planilla_concepto_planilla_id_seq OWNED BY medico.concepto_planilla.concepto_planilla_id;


--
-- TOC entry 525 (class 1259 OID 20373)
-- Name: concepto_planilla_personal; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.concepto_planilla_personal (
    concepto_planilla_personal_id bigint CONSTRAINT concepto_planilla_personal_concepto_planilla_personal__not_null NOT NULL,
    detalle_planilla_id bigint NOT NULL,
    concepto_planilla_id bigint NOT NULL,
    monto numeric(12,2) NOT NULL,
    observaciones text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.concepto_planilla_personal OWNER TO postgres;

--
-- TOC entry 524 (class 1259 OID 20372)
-- Name: concepto_planilla_personal_concepto_planilla_personal_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.concepto_planilla_personal_concepto_planilla_personal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.concepto_planilla_personal_concepto_planilla_personal_id_seq OWNER TO postgres;

--
-- TOC entry 8434 (class 0 OID 0)
-- Dependencies: 524
-- Name: concepto_planilla_personal_concepto_planilla_personal_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.concepto_planilla_personal_concepto_planilla_personal_id_seq OWNED BY medico.concepto_planilla_personal.concepto_planilla_personal_id;


--
-- TOC entry 605 (class 1259 OID 21611)
-- Name: configuracion_sistema; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.configuracion_sistema (
    configuracion_id bigint NOT NULL,
    organizacion_id bigint,
    clave character varying(200) NOT NULL,
    valor text,
    tipo_dato character varying(50) NOT NULL,
    descripcion text,
    categoria character varying(100),
    modificable_usuario boolean DEFAULT false,
    fecha_modificacion timestamp without time zone DEFAULT now(),
    usuario_modifica_id bigint
);


ALTER TABLE medico.configuracion_sistema OWNER TO postgres;

--
-- TOC entry 604 (class 1259 OID 21610)
-- Name: configuracion_sistema_configuracion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.configuracion_sistema_configuracion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.configuracion_sistema_configuracion_id_seq OWNER TO postgres;

--
-- TOC entry 8435 (class 0 OID 0)
-- Dependencies: 604
-- Name: configuracion_sistema_configuracion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.configuracion_sistema_configuracion_id_seq OWNED BY medico.configuracion_sistema.configuracion_id;


--
-- TOC entry 595 (class 1259 OID 21463)
-- Name: consentimiento_informado; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.consentimiento_informado (
    consentimiento_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    atencion_id bigint,
    tipo_consentimiento_id bigint,
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    personal_informa_id bigint,
    contenido_personalizado_html text,
    riesgos_explicados text,
    alternativas_explicadas text,
    acepta boolean NOT NULL,
    firma_paciente_url text,
    huella_paciente_url text,
    testigo_nombre character varying(300),
    testigo_documento character varying(20),
    firma_testigo_url text,
    firma_profesional_url text,
    observaciones text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.consentimiento_informado OWNER TO postgres;

--
-- TOC entry 594 (class 1259 OID 21462)
-- Name: consentimiento_informado_consentimiento_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.consentimiento_informado_consentimiento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.consentimiento_informado_consentimiento_id_seq OWNER TO postgres;

--
-- TOC entry 8436 (class 0 OID 0)
-- Dependencies: 594
-- Name: consentimiento_informado_consentimiento_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.consentimiento_informado_consentimiento_id_seq OWNED BY medico.consentimiento_informado.consentimiento_id;


--
-- TOC entry 411 (class 1259 OID 18076)
-- Name: consultorio; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.consultorio (
    consultorio_id bigint NOT NULL,
    sede_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(200) NOT NULL,
    tipo_consultorio_id bigint,
    piso character varying(10),
    area_m2 numeric(8,2),
    capacidad_personas integer,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.consultorio OWNER TO postgres;

--
-- TOC entry 410 (class 1259 OID 18075)
-- Name: consultorio_consultorio_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.consultorio_consultorio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.consultorio_consultorio_id_seq OWNER TO postgres;

--
-- TOC entry 8437 (class 0 OID 0)
-- Dependencies: 410
-- Name: consultorio_consultorio_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.consultorio_consultorio_id_seq OWNED BY medico.consultorio.consultorio_id;


--
-- TOC entry 547 (class 1259 OID 20740)
-- Name: criterio_auditoria; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.criterio_auditoria (
    criterio_id bigint NOT NULL,
    tipo_auditoria_id bigint,
    codigo character varying(50) NOT NULL,
    nombre character varying(300) NOT NULL,
    descripcion text,
    peso_porcentual numeric(5,2),
    valor_maximo numeric(5,2),
    es_obligatorio boolean DEFAULT false,
    orden integer,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.criterio_auditoria OWNER TO postgres;

--
-- TOC entry 546 (class 1259 OID 20739)
-- Name: criterio_auditoria_criterio_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.criterio_auditoria_criterio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.criterio_auditoria_criterio_id_seq OWNER TO postgres;

--
-- TOC entry 8438 (class 0 OID 0)
-- Dependencies: 546
-- Name: criterio_auditoria_criterio_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.criterio_auditoria_criterio_id_seq OWNED BY medico.criterio_auditoria.criterio_id;


--
-- TOC entry 565 (class 1259 OID 21007)
-- Name: dashboard_gerencial; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.dashboard_gerencial (
    dashboard_id bigint NOT NULL,
    nombre character varying(300) NOT NULL,
    descripcion text,
    categoria character varying(100),
    configuracion_json jsonb,
    layout_json jsonb,
    refresh_automatico_minutos integer,
    orden integer,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.dashboard_gerencial OWNER TO postgres;

--
-- TOC entry 564 (class 1259 OID 21006)
-- Name: dashboard_gerencial_dashboard_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.dashboard_gerencial_dashboard_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.dashboard_gerencial_dashboard_id_seq OWNER TO postgres;

--
-- TOC entry 8439 (class 0 OID 0)
-- Dependencies: 564
-- Name: dashboard_gerencial_dashboard_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.dashboard_gerencial_dashboard_id_seq OWNED BY medico.dashboard_gerencial.dashboard_id;


--
-- TOC entry 569 (class 1259 OID 21045)
-- Name: dashboard_rol; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.dashboard_rol (
    dashboard_rol_id bigint NOT NULL,
    dashboard_id bigint NOT NULL,
    rol_id bigint NOT NULL,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.dashboard_rol OWNER TO postgres;

--
-- TOC entry 568 (class 1259 OID 21044)
-- Name: dashboard_rol_dashboard_rol_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.dashboard_rol_dashboard_rol_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.dashboard_rol_dashboard_rol_id_seq OWNER TO postgres;

--
-- TOC entry 8440 (class 0 OID 0)
-- Dependencies: 568
-- Name: dashboard_rol_dashboard_rol_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.dashboard_rol_dashboard_rol_id_seq OWNED BY medico.dashboard_rol.dashboard_rol_id;


--
-- TOC entry 553 (class 1259 OID 20835)
-- Name: detalle_auditoria; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.detalle_auditoria (
    detalle_auditoria_id bigint NOT NULL,
    auditoria_hc_id bigint NOT NULL,
    criterio_id bigint,
    subcriterio_id bigint,
    opcion_cumplimiento_id bigint,
    observacion text,
    puntaje_obtenido numeric(5,2),
    evidencia_documento_url text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.detalle_auditoria OWNER TO postgres;

--
-- TOC entry 552 (class 1259 OID 20834)
-- Name: detalle_auditoria_detalle_auditoria_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.detalle_auditoria_detalle_auditoria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.detalle_auditoria_detalle_auditoria_id_seq OWNER TO postgres;

--
-- TOC entry 8441 (class 0 OID 0)
-- Dependencies: 552
-- Name: detalle_auditoria_detalle_auditoria_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.detalle_auditoria_detalle_auditoria_id_seq OWNED BY medico.detalle_auditoria.detalle_auditoria_id;


--
-- TOC entry 535 (class 1259 OID 20556)
-- Name: detalle_balance; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.detalle_balance (
    detalle_balance_id bigint NOT NULL,
    balance_id bigint NOT NULL,
    categoria_balance_id bigint,
    subcategoria_balance_id bigint,
    concepto text NOT NULL,
    monto numeric(15,2) NOT NULL,
    porcentaje_total numeric(5,2),
    observaciones text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.detalle_balance OWNER TO postgres;

--
-- TOC entry 534 (class 1259 OID 20555)
-- Name: detalle_balance_detalle_balance_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.detalle_balance_detalle_balance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.detalle_balance_detalle_balance_id_seq OWNER TO postgres;

--
-- TOC entry 8442 (class 0 OID 0)
-- Dependencies: 534
-- Name: detalle_balance_detalle_balance_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.detalle_balance_detalle_balance_id_seq OWNED BY medico.detalle_balance.detalle_balance_id;


--
-- TOC entry 509 (class 1259 OID 20044)
-- Name: detalle_comprobante; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.detalle_comprobante (
    detalle_comprobante_id bigint NOT NULL,
    comprobante_id bigint NOT NULL,
    item integer NOT NULL,
    concepto_id bigint,
    atencion_id bigint,
    servicio_id bigint,
    detalle_dispensacion_id bigint,
    detalle_solicitud_examen_id bigint,
    hospitalizacion_id bigint,
    producto_id bigint,
    descripcion text NOT NULL,
    cantidad numeric(12,2) NOT NULL,
    unidad_medida_id bigint,
    precio_unitario numeric(12,2) NOT NULL,
    descuento_porcentaje numeric(5,2) DEFAULT 0,
    descuento_monto numeric(12,2) DEFAULT 0,
    subtotal numeric(12,2) NOT NULL,
    igv numeric(12,2) NOT NULL,
    total numeric(12,2) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.detalle_comprobante OWNER TO postgres;

--
-- TOC entry 508 (class 1259 OID 20043)
-- Name: detalle_comprobante_detalle_comprobante_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.detalle_comprobante_detalle_comprobante_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.detalle_comprobante_detalle_comprobante_id_seq OWNER TO postgres;

--
-- TOC entry 8443 (class 0 OID 0)
-- Dependencies: 508
-- Name: detalle_comprobante_detalle_comprobante_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.detalle_comprobante_detalle_comprobante_id_seq OWNED BY medico.detalle_comprobante.detalle_comprobante_id;


--
-- TOC entry 483 (class 1259 OID 19562)
-- Name: detalle_dispensacion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.detalle_dispensacion (
    detalle_dispensacion_id bigint NOT NULL,
    dispensacion_id bigint NOT NULL,
    detalle_receta_id bigint NOT NULL,
    lote_id bigint NOT NULL,
    cantidad_entregada numeric(12,2) NOT NULL,
    precio_unitario numeric(12,2),
    descuento numeric(12,2) DEFAULT 0,
    total numeric(12,2),
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.detalle_dispensacion OWNER TO postgres;

--
-- TOC entry 482 (class 1259 OID 19561)
-- Name: detalle_dispensacion_detalle_dispensacion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.detalle_dispensacion_detalle_dispensacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.detalle_dispensacion_detalle_dispensacion_id_seq OWNER TO postgres;

--
-- TOC entry 8444 (class 0 OID 0)
-- Dependencies: 482
-- Name: detalle_dispensacion_detalle_dispensacion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.detalle_dispensacion_detalle_dispensacion_id_seq OWNED BY medico.detalle_dispensacion.detalle_dispensacion_id;


--
-- TOC entry 435 (class 1259 OID 18601)
-- Name: detalle_examen_fisico; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.detalle_examen_fisico (
    detalle_examen_fisico_id bigint NOT NULL,
    examen_fisico_id bigint NOT NULL,
    sistema_corporal_id bigint,
    hallazgos_normales text,
    hallazgos_anormales text,
    descripcion_detallada text,
    orden integer,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.detalle_examen_fisico OWNER TO postgres;

--
-- TOC entry 434 (class 1259 OID 18600)
-- Name: detalle_examen_fisico_detalle_examen_fisico_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.detalle_examen_fisico_detalle_examen_fisico_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.detalle_examen_fisico_detalle_examen_fisico_id_seq OWNER TO postgres;

--
-- TOC entry 8445 (class 0 OID 0)
-- Dependencies: 434
-- Name: detalle_examen_fisico_detalle_examen_fisico_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.detalle_examen_fisico_detalle_examen_fisico_id_seq OWNED BY medico.detalle_examen_fisico.detalle_examen_fisico_id;


--
-- TOC entry 475 (class 1259 OID 19406)
-- Name: detalle_movimiento_almacen; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.detalle_movimiento_almacen (
    detalle_movimiento_id bigint NOT NULL,
    movimiento_id bigint NOT NULL,
    lote_id bigint NOT NULL,
    cantidad numeric(12,2) NOT NULL,
    costo_unitario numeric(12,2) NOT NULL,
    precio_unitario numeric(12,2),
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.detalle_movimiento_almacen OWNER TO postgres;

--
-- TOC entry 474 (class 1259 OID 19405)
-- Name: detalle_movimiento_almacen_detalle_movimiento_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.detalle_movimiento_almacen_detalle_movimiento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.detalle_movimiento_almacen_detalle_movimiento_id_seq OWNER TO postgres;

--
-- TOC entry 8446 (class 0 OID 0)
-- Dependencies: 474
-- Name: detalle_movimiento_almacen_detalle_movimiento_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.detalle_movimiento_almacen_detalle_movimiento_id_seq OWNED BY medico.detalle_movimiento_almacen.detalle_movimiento_id;


--
-- TOC entry 523 (class 1259 OID 20341)
-- Name: detalle_planilla; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.detalle_planilla (
    detalle_planilla_id bigint NOT NULL,
    periodo_planilla_id bigint NOT NULL,
    personal_id bigint NOT NULL,
    dias_laborados integer NOT NULL,
    dias_subsidio integer DEFAULT 0,
    sueldo_basico numeric(12,2) NOT NULL,
    total_remuneraciones numeric(12,2) NOT NULL,
    total_descuentos numeric(12,2) NOT NULL,
    total_aportaciones numeric(12,2) NOT NULL,
    neto_pagar numeric(12,2) NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.detalle_planilla OWNER TO postgres;

--
-- TOC entry 522 (class 1259 OID 20340)
-- Name: detalle_planilla_detalle_planilla_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.detalle_planilla_detalle_planilla_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.detalle_planilla_detalle_planilla_id_seq OWNER TO postgres;

--
-- TOC entry 8447 (class 0 OID 0)
-- Dependencies: 522
-- Name: detalle_planilla_detalle_planilla_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.detalle_planilla_detalle_planilla_id_seq OWNED BY medico.detalle_planilla.detalle_planilla_id;


--
-- TOC entry 479 (class 1259 OID 19479)
-- Name: detalle_receta; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.detalle_receta (
    detalle_receta_id bigint NOT NULL,
    receta_id bigint NOT NULL,
    diagnostico_atencion_id bigint,
    producto_id bigint NOT NULL,
    cantidad_prescrita numeric(12,2) NOT NULL,
    dosis character varying(200),
    frecuencia character varying(200),
    duracion_dias integer,
    via_administracion_id bigint,
    indicaciones_especificas text,
    unidad_medida_farmacia_id bigint,
    cantidad_dispensada numeric(12,2) DEFAULT 0,
    cantidad_pendiente numeric(12,2),
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.detalle_receta OWNER TO postgres;

--
-- TOC entry 478 (class 1259 OID 19478)
-- Name: detalle_receta_detalle_receta_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.detalle_receta_detalle_receta_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.detalle_receta_detalle_receta_id_seq OWNER TO postgres;

--
-- TOC entry 8448 (class 0 OID 0)
-- Dependencies: 478
-- Name: detalle_receta_detalle_receta_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.detalle_receta_detalle_receta_id_seq OWNED BY medico.detalle_receta.detalle_receta_id;


--
-- TOC entry 489 (class 1259 OID 19677)
-- Name: detalle_solicitud_examen; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.detalle_solicitud_examen (
    detalle_solicitud_id bigint NOT NULL,
    solicitud_id bigint NOT NULL,
    tipo_examen_id bigint NOT NULL,
    diagnostico_atencion_id bigint,
    observaciones_solicitud text,
    estado_solicitud_id bigint,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.detalle_solicitud_examen OWNER TO postgres;

--
-- TOC entry 488 (class 1259 OID 19676)
-- Name: detalle_solicitud_examen_detalle_solicitud_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.detalle_solicitud_examen_detalle_solicitud_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.detalle_solicitud_examen_detalle_solicitud_id_seq OWNER TO postgres;

--
-- TOC entry 8449 (class 0 OID 0)
-- Dependencies: 488
-- Name: detalle_solicitud_examen_detalle_solicitud_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.detalle_solicitud_examen_detalle_solicitud_id_seq OWNED BY medico.detalle_solicitud_examen.detalle_solicitud_id;


--
-- TOC entry 545 (class 1259 OID 20712)
-- Name: detalle_trama_atencion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.detalle_trama_atencion (
    detalle_trama_id bigint NOT NULL,
    trama_id bigint NOT NULL,
    atencion_id bigint NOT NULL,
    linea_numero integer NOT NULL,
    datos_enviados_json jsonb,
    estado_registro character varying(50) DEFAULT 'pendiente'::character varying,
    mensaje_error text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.detalle_trama_atencion OWNER TO postgres;

--
-- TOC entry 544 (class 1259 OID 20711)
-- Name: detalle_trama_atencion_detalle_trama_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.detalle_trama_atencion_detalle_trama_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.detalle_trama_atencion_detalle_trama_id_seq OWNER TO postgres;

--
-- TOC entry 8450 (class 0 OID 0)
-- Dependencies: 544
-- Name: detalle_trama_atencion_detalle_trama_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.detalle_trama_atencion_detalle_trama_id_seq OWNED BY medico.detalle_trama_atencion.detalle_trama_id;


--
-- TOC entry 445 (class 1259 OID 18790)
-- Name: diagnostico_atencion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.diagnostico_atencion (
    diagnostico_atencion_id bigint NOT NULL,
    atencion_id bigint NOT NULL,
    episodio_id bigint,
    cie10_id bigint,
    cie10_personalizado_id bigint,
    tipo_diagnostico_id bigint,
    orden_diagnostico_id bigint,
    descripcion_ampliada text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.diagnostico_atencion OWNER TO postgres;

--
-- TOC entry 444 (class 1259 OID 18789)
-- Name: diagnostico_atencion_diagnostico_atencion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.diagnostico_atencion_diagnostico_atencion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.diagnostico_atencion_diagnostico_atencion_id_seq OWNER TO postgres;

--
-- TOC entry 8451 (class 0 OID 0)
-- Dependencies: 444
-- Name: diagnostico_atencion_diagnostico_atencion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.diagnostico_atencion_diagnostico_atencion_id_seq OWNED BY medico.diagnostico_atencion.diagnostico_atencion_id;


--
-- TOC entry 481 (class 1259 OID 19522)
-- Name: dispensacion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.dispensacion (
    dispensacion_id bigint NOT NULL,
    receta_id bigint NOT NULL,
    almacen_id bigint NOT NULL,
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    personal_id bigint NOT NULL,
    movimiento_almacen_id bigint,
    tipo_dispensacion character varying(50),
    observaciones text,
    estado character varying(20) DEFAULT 'completado'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.dispensacion OWNER TO postgres;

--
-- TOC entry 480 (class 1259 OID 19521)
-- Name: dispensacion_dispensacion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.dispensacion_dispensacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.dispensacion_dispensacion_id_seq OWNER TO postgres;

--
-- TOC entry 8452 (class 0 OID 0)
-- Dependencies: 480
-- Name: dispensacion_dispensacion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.dispensacion_dispensacion_id_seq OWNED BY medico.dispensacion.dispensacion_id;


--
-- TOC entry 597 (class 1259 OID 21501)
-- Name: documento_clinico; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.documento_clinico (
    documento_clinico_id bigint NOT NULL,
    tipo_documento character varying(100) NOT NULL,
    paciente_id bigint NOT NULL,
    atencion_id bigint,
    personal_genera_id bigint,
    numero_documento character varying(50) NOT NULL,
    fecha_emision date DEFAULT CURRENT_DATE NOT NULL,
    contenido_html text,
    archivo_pdf_url text,
    requiere_firma_digital boolean DEFAULT false,
    firma_digital_hash character varying(255),
    impreso boolean DEFAULT false,
    fecha_impresion timestamp without time zone,
    veces_impreso integer DEFAULT 0,
    estado character varying(20) DEFAULT 'emitido'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.documento_clinico OWNER TO postgres;

--
-- TOC entry 596 (class 1259 OID 21500)
-- Name: documento_clinico_documento_clinico_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.documento_clinico_documento_clinico_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.documento_clinico_documento_clinico_id_seq OWNER TO postgres;

--
-- TOC entry 8453 (class 0 OID 0)
-- Dependencies: 596
-- Name: documento_clinico_documento_clinico_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.documento_clinico_documento_clinico_id_seq OWNED BY medico.documento_clinico.documento_clinico_id;


--
-- TOC entry 441 (class 1259 OID 18730)
-- Name: ejecucion_indicacion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.ejecucion_indicacion (
    ejecucion_id bigint NOT NULL,
    indicacion_id bigint NOT NULL,
    fecha_hora_programada timestamp without time zone NOT NULL,
    fecha_hora_real timestamp without time zone,
    personal_ejecuta_id bigint,
    realizado boolean DEFAULT false,
    motivo_no_realizacion text,
    observaciones text,
    reaccion_adversa text,
    lote_id bigint,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.ejecucion_indicacion OWNER TO postgres;

--
-- TOC entry 440 (class 1259 OID 18729)
-- Name: ejecucion_indicacion_ejecucion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.ejecucion_indicacion_ejecucion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.ejecucion_indicacion_ejecucion_id_seq OWNER TO postgres;

--
-- TOC entry 8454 (class 0 OID 0)
-- Dependencies: 440
-- Name: ejecucion_indicacion_ejecucion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.ejecucion_indicacion_ejecucion_id_seq OWNED BY medico.ejecucion_indicacion.ejecucion_id;


--
-- TOC entry 563 (class 1259 OID 20978)
-- Name: ejecucion_reporte; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.ejecucion_reporte (
    ejecucion_id bigint NOT NULL,
    reporte_id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    fecha_hora_ejecucion timestamp without time zone DEFAULT now() NOT NULL,
    parametros_usados_json jsonb,
    tiempo_ejecucion_segundos numeric(10,2),
    archivo_resultado_url text,
    estado character varying(50) DEFAULT 'exitoso'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.ejecucion_reporte OWNER TO postgres;

--
-- TOC entry 562 (class 1259 OID 20977)
-- Name: ejecucion_reporte_ejecucion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.ejecucion_reporte_ejecucion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.ejecucion_reporte_ejecucion_id_seq OWNER TO postgres;

--
-- TOC entry 8455 (class 0 OID 0)
-- Dependencies: 562
-- Name: ejecucion_reporte_ejecucion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.ejecucion_reporte_ejecucion_id_seq OWNED BY medico.ejecucion_reporte.ejecucion_id;


--
-- TOC entry 581 (class 1259 OID 21268)
-- Name: entrenamiento_modelo; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.entrenamiento_modelo (
    entrenamiento_id bigint NOT NULL,
    modelo_id bigint NOT NULL,
    version_entrenamiento character varying(50) NOT NULL,
    fecha_inicio timestamp without time zone NOT NULL,
    fecha_fin timestamp without time zone,
    dataset_utilizado text,
    cantidad_registros integer,
    parametros_json jsonb,
    metricas_json jsonb,
    mejor_epoca integer,
    personal_responsable_id bigint,
    observaciones text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.entrenamiento_modelo OWNER TO postgres;

--
-- TOC entry 580 (class 1259 OID 21267)
-- Name: entrenamiento_modelo_entrenamiento_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.entrenamiento_modelo_entrenamiento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.entrenamiento_modelo_entrenamiento_id_seq OWNER TO postgres;

--
-- TOC entry 8456 (class 0 OID 0)
-- Dependencies: 580
-- Name: entrenamiento_modelo_entrenamiento_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.entrenamiento_modelo_entrenamiento_id_seq OWNED BY medico.entrenamiento_modelo.entrenamiento_id;


--
-- TOC entry 425 (class 1259 OID 18351)
-- Name: episodio_clinico; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.episodio_clinico (
    episodio_id bigint NOT NULL,
    atencion_id bigint NOT NULL,
    tipo_episodio_id bigint NOT NULL,
    numero_episodio integer NOT NULL,
    fecha_hora_inicio timestamp without time zone DEFAULT now() NOT NULL,
    fecha_hora_fin timestamp without time zone,
    servicio_id bigint,
    cama_id bigint,
    personal_responsable_id bigint,
    diagnostico_ingreso_episodio_id bigint,
    diagnostico_salida_episodio_id bigint,
    estado_episodio_id bigint,
    episodio_origen_id bigint,
    motivo_transicion text,
    observaciones text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.episodio_clinico OWNER TO postgres;

--
-- TOC entry 8457 (class 0 OID 0)
-- Dependencies: 425
-- Name: TABLE episodio_clinico; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON TABLE medico.episodio_clinico IS 'Fases dentro de una atención (emergencia, hospitalización, etc.)';


--
-- TOC entry 8458 (class 0 OID 0)
-- Dependencies: 425
-- Name: COLUMN episodio_clinico.numero_episodio; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON COLUMN medico.episodio_clinico.numero_episodio IS 'Número secuencial del episodio dentro de la atención';


--
-- TOC entry 424 (class 1259 OID 18350)
-- Name: episodio_clinico_episodio_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.episodio_clinico_episodio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.episodio_clinico_episodio_id_seq OWNER TO postgres;

--
-- TOC entry 8459 (class 0 OID 0)
-- Dependencies: 424
-- Name: episodio_clinico_episodio_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.episodio_clinico_episodio_id_seq OWNED BY medico.episodio_clinico.episodio_id;


--
-- TOC entry 247 (class 1259 OID 16634)
-- Name: especialidad_medica; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.especialidad_medica (
    especialidad_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(200) NOT NULL,
    descripcion text,
    requiere_rne boolean DEFAULT false,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.especialidad_medica OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 16633)
-- Name: especialidad_medica_especialidad_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.especialidad_medica_especialidad_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.especialidad_medica_especialidad_id_seq OWNER TO postgres;

--
-- TOC entry 8460 (class 0 OID 0)
-- Dependencies: 246
-- Name: especialidad_medica_especialidad_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.especialidad_medica_especialidad_id_seq OWNED BY medico.especialidad_medica.especialidad_id;


--
-- TOC entry 259 (class 1259 OID 16722)
-- Name: estado_atencion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.estado_atencion (
    estado_atencion_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    color_hex character varying(7),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.estado_atencion OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 16721)
-- Name: estado_atencion_estado_atencion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.estado_atencion_estado_atencion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.estado_atencion_estado_atencion_id_seq OWNER TO postgres;

--
-- TOC entry 8461 (class 0 OID 0)
-- Dependencies: 258
-- Name: estado_atencion_estado_atencion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.estado_atencion_estado_atencion_id_seq OWNED BY medico.estado_atencion.estado_atencion_id;


--
-- TOC entry 343 (class 1259 OID 17336)
-- Name: estado_caja; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.estado_caja (
    estado_caja_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.estado_caja OWNER TO postgres;

--
-- TOC entry 342 (class 1259 OID 17335)
-- Name: estado_caja_estado_caja_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.estado_caja_estado_caja_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.estado_caja_estado_caja_id_seq OWNER TO postgres;

--
-- TOC entry 8462 (class 0 OID 0)
-- Dependencies: 342
-- Name: estado_caja_estado_caja_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.estado_caja_estado_caja_id_seq OWNED BY medico.estado_caja.estado_caja_id;


--
-- TOC entry 255 (class 1259 OID 16694)
-- Name: estado_cama; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.estado_cama (
    estado_cama_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    color_hex character varying(7),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.estado_cama OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 16693)
-- Name: estado_cama_estado_cama_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.estado_cama_estado_cama_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.estado_cama_estado_cama_id_seq OWNER TO postgres;

--
-- TOC entry 8463 (class 0 OID 0)
-- Dependencies: 254
-- Name: estado_cama_estado_cama_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.estado_cama_estado_cama_id_seq OWNED BY medico.estado_cama.estado_cama_id;


--
-- TOC entry 267 (class 1259 OID 16779)
-- Name: estado_cita; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.estado_cita (
    estado_cita_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    color_hex character varying(7),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.estado_cita OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 16778)
-- Name: estado_cita_estado_cita_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.estado_cita_estado_cita_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.estado_cita_estado_cita_id_seq OWNER TO postgres;

--
-- TOC entry 8464 (class 0 OID 0)
-- Dependencies: 266
-- Name: estado_cita_estado_cita_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.estado_cita_estado_cita_id_seq OWNED BY medico.estado_cita.estado_cita_id;


--
-- TOC entry 227 (class 1259 OID 16487)
-- Name: estado_civil; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.estado_civil (
    estado_civil_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(50) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.estado_civil OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16486)
-- Name: estado_civil_estado_civil_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.estado_civil_estado_civil_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.estado_civil_estado_civil_id_seq OWNER TO postgres;

--
-- TOC entry 8465 (class 0 OID 0)
-- Dependencies: 226
-- Name: estado_civil_estado_civil_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.estado_civil_estado_civil_id_seq OWNED BY medico.estado_civil.estado_civil_id;


--
-- TOC entry 263 (class 1259 OID 16750)
-- Name: estado_episodio; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.estado_episodio (
    estado_episodio_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.estado_episodio OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 16749)
-- Name: estado_episodio_estado_episodio_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.estado_episodio_estado_episodio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.estado_episodio_estado_episodio_id_seq OWNER TO postgres;

--
-- TOC entry 8466 (class 0 OID 0)
-- Dependencies: 262
-- Name: estado_episodio_estado_episodio_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.estado_episodio_estado_episodio_id_seq OWNED BY medico.estado_episodio.estado_episodio_id;


--
-- TOC entry 295 (class 1259 OID 16981)
-- Name: estado_interconsulta; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.estado_interconsulta (
    estado_interconsulta_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.estado_interconsulta OWNER TO postgres;

--
-- TOC entry 294 (class 1259 OID 16980)
-- Name: estado_interconsulta_estado_interconsulta_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.estado_interconsulta_estado_interconsulta_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.estado_interconsulta_estado_interconsulta_id_seq OWNER TO postgres;

--
-- TOC entry 8467 (class 0 OID 0)
-- Dependencies: 294
-- Name: estado_interconsulta_estado_interconsulta_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.estado_interconsulta_estado_interconsulta_id_seq OWNED BY medico.estado_interconsulta.estado_interconsulta_id;


--
-- TOC entry 311 (class 1259 OID 17106)
-- Name: estado_receta; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.estado_receta (
    estado_receta_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.estado_receta OWNER TO postgres;

--
-- TOC entry 310 (class 1259 OID 17105)
-- Name: estado_receta_estado_receta_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.estado_receta_estado_receta_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.estado_receta_estado_receta_id_seq OWNER TO postgres;

--
-- TOC entry 8468 (class 0 OID 0)
-- Dependencies: 310
-- Name: estado_receta_estado_receta_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.estado_receta_estado_receta_id_seq OWNED BY medico.estado_receta.estado_receta_id;


--
-- TOC entry 329 (class 1259 OID 17238)
-- Name: estado_resultado_laboratorio; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.estado_resultado_laboratorio (
    estado_resultado_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.estado_resultado_laboratorio OWNER TO postgres;

--
-- TOC entry 328 (class 1259 OID 17237)
-- Name: estado_resultado_laboratorio_estado_resultado_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.estado_resultado_laboratorio_estado_resultado_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.estado_resultado_laboratorio_estado_resultado_id_seq OWNER TO postgres;

--
-- TOC entry 8469 (class 0 OID 0)
-- Dependencies: 328
-- Name: estado_resultado_laboratorio_estado_resultado_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.estado_resultado_laboratorio_estado_resultado_id_seq OWNED BY medico.estado_resultado_laboratorio.estado_resultado_id;


--
-- TOC entry 321 (class 1259 OID 17181)
-- Name: estado_solicitud_examen; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.estado_solicitud_examen (
    estado_solicitud_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.estado_solicitud_examen OWNER TO postgres;

--
-- TOC entry 320 (class 1259 OID 17180)
-- Name: estado_solicitud_examen_estado_solicitud_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.estado_solicitud_examen_estado_solicitud_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.estado_solicitud_examen_estado_solicitud_id_seq OWNER TO postgres;

--
-- TOC entry 8470 (class 0 OID 0)
-- Dependencies: 320
-- Name: estado_solicitud_examen_estado_solicitud_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.estado_solicitud_examen_estado_solicitud_id_seq OWNED BY medico.estado_solicitud_examen.estado_solicitud_id;


--
-- TOC entry 437 (class 1259 OID 18626)
-- Name: evolucion_clinica; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.evolucion_clinica (
    evolucion_id bigint NOT NULL,
    tipo_evolucion_id bigint,
    atencion_id bigint,
    episodio_id bigint,
    numero_dia_hospitalizacion integer,
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    personal_evoluciona_id bigint,
    especialidad_id bigint,
    subjetivo_texto text,
    objetivo_texto text,
    analisis_texto text,
    plan_texto text,
    evolucion_narrativa text,
    registro_signos_vitales_id bigint,
    examen_fisico_id bigint,
    observaciones text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.evolucion_clinica OWNER TO postgres;

--
-- TOC entry 8471 (class 0 OID 0)
-- Dependencies: 437
-- Name: TABLE evolucion_clinica; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON TABLE medico.evolucion_clinica IS 'Evoluciones médicas reutilizables';


--
-- TOC entry 436 (class 1259 OID 18625)
-- Name: evolucion_clinica_evolucion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.evolucion_clinica_evolucion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.evolucion_clinica_evolucion_id_seq OWNER TO postgres;

--
-- TOC entry 8472 (class 0 OID 0)
-- Dependencies: 436
-- Name: evolucion_clinica_evolucion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.evolucion_clinica_evolucion_id_seq OWNED BY medico.evolucion_clinica.evolucion_id;


--
-- TOC entry 433 (class 1259 OID 18565)
-- Name: examen_fisico; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.examen_fisico (
    examen_fisico_id bigint NOT NULL,
    tipo_examen_fisico_id bigint,
    atencion_id bigint,
    episodio_id bigint,
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    personal_examina_id bigint,
    aspecto_general text,
    estado_nutricional character varying(100),
    estado_hidratacion character varying(100),
    coloracion_piel character varying(100),
    observaciones_generales text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.examen_fisico OWNER TO postgres;

--
-- TOC entry 432 (class 1259 OID 18564)
-- Name: examen_fisico_examen_fisico_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.examen_fisico_examen_fisico_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.examen_fisico_examen_fisico_id_seq OWNER TO postgres;

--
-- TOC entry 8473 (class 0 OID 0)
-- Dependencies: 432
-- Name: examen_fisico_examen_fisico_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.examen_fisico_examen_fisico_id_seq OWNED BY medico.examen_fisico.examen_fisico_id;


--
-- TOC entry 501 (class 1259 OID 19883)
-- Name: examen_imagen; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.examen_imagen (
    examen_imagen_id bigint NOT NULL,
    detalle_solicitud_id bigint NOT NULL,
    fecha_hora_realizacion timestamp without time zone DEFAULT now() NOT NULL,
    personal_realiza_id bigint,
    tipo_equipo_id bigint,
    tecnica_utilizada character varying(300),
    contraste_utilizado character varying(300),
    volumen_contraste_ml numeric(8,2),
    dosis_radiacion_mgy numeric(8,2),
    numero_imagenes integer,
    observaciones_tecnicas text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.examen_imagen OWNER TO postgres;

--
-- TOC entry 500 (class 1259 OID 19882)
-- Name: examen_imagen_examen_imagen_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.examen_imagen_examen_imagen_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.examen_imagen_examen_imagen_id_seq OWNER TO postgres;

--
-- TOC entry 8474 (class 0 OID 0)
-- Dependencies: 500
-- Name: examen_imagen_examen_imagen_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.examen_imagen_examen_imagen_id_seq OWNED BY medico.examen_imagen.examen_imagen_id;


--
-- TOC entry 493 (class 1259 OID 19749)
-- Name: examen_laboratorio; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.examen_laboratorio (
    examen_lab_id bigint NOT NULL,
    detalle_solicitud_id bigint NOT NULL,
    muestra_id bigint,
    fecha_hora_proceso timestamp without time zone DEFAULT now() NOT NULL,
    personal_procesa_id bigint,
    tipo_equipo_id bigint,
    metodo_id bigint,
    estado_resultado_id bigint,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.examen_laboratorio OWNER TO postgres;

--
-- TOC entry 492 (class 1259 OID 19748)
-- Name: examen_laboratorio_examen_lab_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.examen_laboratorio_examen_lab_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.examen_laboratorio_examen_lab_id_seq OWNER TO postgres;

--
-- TOC entry 8475 (class 0 OID 0)
-- Dependencies: 492
-- Name: examen_laboratorio_examen_lab_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.examen_laboratorio_examen_lab_id_seq OWNED BY medico.examen_laboratorio.examen_lab_id;


--
-- TOC entry 231 (class 1259 OID 16515)
-- Name: factor_rh; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.factor_rh (
    factor_rh_id bigint NOT NULL,
    codigo character varying(5) NOT NULL,
    nombre character varying(20) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.factor_rh OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16514)
-- Name: factor_rh_factor_rh_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.factor_rh_factor_rh_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.factor_rh_factor_rh_id_seq OWNER TO postgres;

--
-- TOC entry 8476 (class 0 OID 0)
-- Dependencies: 230
-- Name: factor_rh_factor_rh_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.factor_rh_factor_rh_id_seq OWNED BY medico.factor_rh.factor_rh_id;


--
-- TOC entry 285 (class 1259 OID 16909)
-- Name: forma_llegada; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.forma_llegada (
    forma_llegada_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.forma_llegada OWNER TO postgres;

--
-- TOC entry 284 (class 1259 OID 16908)
-- Name: forma_llegada_forma_llegada_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.forma_llegada_forma_llegada_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.forma_llegada_forma_llegada_id_seq OWNER TO postgres;

--
-- TOC entry 8477 (class 0 OID 0)
-- Dependencies: 284
-- Name: forma_llegada_forma_llegada_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.forma_llegada_forma_llegada_id_seq OWNED BY medico.forma_llegada.forma_llegada_id;


--
-- TOC entry 337 (class 1259 OID 17294)
-- Name: forma_pago; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.forma_pago (
    forma_pago_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.forma_pago OWNER TO postgres;

--
-- TOC entry 336 (class 1259 OID 17293)
-- Name: forma_pago_forma_pago_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.forma_pago_forma_pago_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.forma_pago_forma_pago_id_seq OWNER TO postgres;

--
-- TOC entry 8478 (class 0 OID 0)
-- Dependencies: 336
-- Name: forma_pago_forma_pago_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.forma_pago_forma_pago_id_seq OWNED BY medico.forma_pago.forma_pago_id;


--
-- TOC entry 229 (class 1259 OID 16501)
-- Name: grupo_sanguineo; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.grupo_sanguineo (
    grupo_sanguineo_id bigint NOT NULL,
    codigo character varying(5) NOT NULL,
    nombre character varying(20) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.grupo_sanguineo OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16500)
-- Name: grupo_sanguineo_grupo_sanguineo_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.grupo_sanguineo_grupo_sanguineo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.grupo_sanguineo_grupo_sanguineo_id_seq OWNER TO postgres;

--
-- TOC entry 8479 (class 0 OID 0)
-- Dependencies: 228
-- Name: grupo_sanguineo_grupo_sanguineo_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.grupo_sanguineo_grupo_sanguineo_id_seq OWNED BY medico.grupo_sanguineo.grupo_sanguineo_id;


--
-- TOC entry 453 (class 1259 OID 18940)
-- Name: historia_clinica_ambulatoria; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.historia_clinica_ambulatoria (
    historia_ambulatoria_id bigint NOT NULL,
    atencion_id bigint NOT NULL,
    episodio_id bigint,
    registro_signos_vitales_id bigint,
    examen_fisico_id bigint,
    motivo_consulta text,
    tiempo_enfermedad character varying(200),
    forma_inicio character varying(200),
    curso_enfermedad character varying(200),
    relato_cronologico text,
    sintomas_principales text,
    funciones_biologicas_apetito character varying(100),
    funciones_biologicas_sed character varying(100),
    "funciones_biologicas_sueño" character varying(100),
    funciones_biologicas_diuresis character varying(100),
    funciones_biologicas_deposiciones character varying(100),
    funciones_biologicas_otros text,
    impresion_diagnostica text,
    plan_diagnostico text,
    plan_terapeutico text,
    educacion_paciente text,
    pronostico text,
    fecha_proximo_control date,
    observaciones text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.historia_clinica_ambulatoria OWNER TO postgres;

--
-- TOC entry 8480 (class 0 OID 0)
-- Dependencies: 453
-- Name: TABLE historia_clinica_ambulatoria; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON TABLE medico.historia_clinica_ambulatoria IS 'Historia clínica específica para atención ambulatoria';


--
-- TOC entry 452 (class 1259 OID 18939)
-- Name: historia_clinica_ambulatoria_historia_ambulatoria_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.historia_clinica_ambulatoria_historia_ambulatoria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.historia_clinica_ambulatoria_historia_ambulatoria_id_seq OWNER TO postgres;

--
-- TOC entry 8481 (class 0 OID 0)
-- Dependencies: 452
-- Name: historia_clinica_ambulatoria_historia_ambulatoria_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.historia_clinica_ambulatoria_historia_ambulatoria_id_seq OWNED BY medico.historia_clinica_ambulatoria.historia_ambulatoria_id;


--
-- TOC entry 455 (class 1259 OID 18975)
-- Name: historia_clinica_emergencia; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.historia_clinica_emergencia (
    historia_emergencia_id bigint NOT NULL,
    atencion_id bigint NOT NULL,
    episodio_id bigint,
    registro_signos_vitales_id bigint,
    fecha_hora_ingreso_emergencia timestamp without time zone CONSTRAINT historia_clinica_emergencia_fecha_hora_ingreso_emergen_not_null NOT NULL,
    forma_llegada_id bigint,
    prioridad_triaje_id bigint,
    "acompañante_nombre" character varying(300),
    "acompañante_parentesco_id" bigint,
    "acompañante_telefono" character varying(20),
    "acompañante_documento" character varying(20),
    motivo_ingreso text,
    relato_breve_emergencia text,
    circunstancia_evento text,
    impresion_inicial text,
    tipo_destino character varying(100),
    servicio_destino_id bigint,
    establecimiento_destino character varying(300),
    condicion_destino character varying(100),
    diagnostico_salida_emergencia_id bigint,
    indicaciones_alta_emergencia text,
    fecha_hora_salida_emergencia timestamp without time zone,
    personal_alta_id bigint,
    observaciones text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.historia_clinica_emergencia OWNER TO postgres;

--
-- TOC entry 8482 (class 0 OID 0)
-- Dependencies: 455
-- Name: TABLE historia_clinica_emergencia; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON TABLE medico.historia_clinica_emergencia IS 'Historia clínica específica para emergencia';


--
-- TOC entry 454 (class 1259 OID 18974)
-- Name: historia_clinica_emergencia_historia_emergencia_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.historia_clinica_emergencia_historia_emergencia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.historia_clinica_emergencia_historia_emergencia_id_seq OWNER TO postgres;

--
-- TOC entry 8483 (class 0 OID 0)
-- Dependencies: 454
-- Name: historia_clinica_emergencia_historia_emergencia_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.historia_clinica_emergencia_historia_emergencia_id_seq OWNED BY medico.historia_clinica_emergencia.historia_emergencia_id;


--
-- TOC entry 461 (class 1259 OID 19118)
-- Name: historia_clinica_hospitalizacion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.historia_clinica_hospitalizacion (
    historia_hospitalizacion_id bigint CONSTRAINT historia_clinica_hospitaliz_historia_hospitalizacion_i_not_null NOT NULL,
    hospitalizacion_id bigint NOT NULL,
    episodio_id bigint,
    atencion_id bigint,
    registro_signos_vitales_ingreso_id bigint,
    examen_fisico_ingreso_id bigint,
    via_ingreso_id bigint,
    fecha_hora_ingreso timestamp without time zone NOT NULL,
    enfermedad_actual text,
    tiempo_enfermedad character varying(200),
    forma_inicio character varying(200),
    curso_enfermedad character varying(200),
    sintomas_principales text,
    relato_cronologico text,
    revision_sistemas_respiratorio text,
    revision_sistemas_cardiovascular text,
    revision_sistemas_digestivo text,
    revision_sistemas_genitourinario text,
    revision_sistemas_neurologico text,
    revision_sistemas_musculoesqueletico text,
    revision_sistemas_otros text,
    antecedentes_personales_resumen text,
    antecedentes_familiares_resumen text,
    alergias_resumen text,
    medicacion_habitual text,
    hospitalizaciones_previas_resumen text,
    cirugias_previas_resumen text,
    impresion_diagnostica_ingreso text,
    plan_trabajo_inicial text,
    pronostico_inicial text,
    fecha_hora_elaboracion_epicrisis timestamp without time zone,
    personal_elabora_epicrisis_id bigint,
    resumen_hospitalizacion text,
    evolucion_general text,
    examenes_auxiliares_resumen text,
    tratamiento_recibido_resumen text,
    condicion_alta text,
    diagnostico_alta_principal_id bigint,
    pronostico_alta text,
    recomendaciones_alta text,
    medicacion_alta text,
    controles_posteriores text,
    limitaciones_restricciones text,
    observaciones_epicrisis text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.historia_clinica_hospitalizacion OWNER TO postgres;

--
-- TOC entry 8484 (class 0 OID 0)
-- Dependencies: 461
-- Name: TABLE historia_clinica_hospitalizacion; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON TABLE medico.historia_clinica_hospitalizacion IS 'Historia clínica específica para hospitalización con epicrisis';


--
-- TOC entry 460 (class 1259 OID 19117)
-- Name: historia_clinica_hospitalizacio_historia_hospitalizacion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.historia_clinica_hospitalizacio_historia_hospitalizacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.historia_clinica_hospitalizacio_historia_hospitalizacion_id_seq OWNER TO postgres;

--
-- TOC entry 8485 (class 0 OID 0)
-- Dependencies: 460
-- Name: historia_clinica_hospitalizacio_historia_hospitalizacion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.historia_clinica_hospitalizacio_historia_hospitalizacion_id_seq OWNED BY medico.historia_clinica_hospitalizacion.historia_hospitalizacion_id;


--
-- TOC entry 457 (class 1259 OID 19036)
-- Name: hospitalizacion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.hospitalizacion (
    hospitalizacion_id bigint NOT NULL,
    episodio_id bigint NOT NULL,
    atencion_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    numero_hospitalizacion character varying(50) NOT NULL,
    fecha_hora_ingreso_hospitalario timestamp without time zone NOT NULL,
    fecha_hora_alta_hospitalaria timestamp without time zone,
    cama_actual_id bigint,
    servicio_actual_id bigint,
    tipo_alta_id bigint,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.hospitalizacion OWNER TO postgres;

--
-- TOC entry 456 (class 1259 OID 19035)
-- Name: hospitalizacion_hospitalizacion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.hospitalizacion_hospitalizacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.hospitalizacion_hospitalizacion_id_seq OWNER TO postgres;

--
-- TOC entry 8486 (class 0 OID 0)
-- Dependencies: 456
-- Name: hospitalizacion_hospitalizacion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.hospitalizacion_hospitalizacion_id_seq OWNED BY medico.hospitalizacion.hospitalizacion_id;


--
-- TOC entry 503 (class 1259 OID 19915)
-- Name: imagen_digital; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.imagen_digital (
    imagen_id bigint NOT NULL,
    examen_imagen_id bigint NOT NULL,
    ruta_archivo text NOT NULL,
    tipo_formato_id bigint,
    "tamaño_bytes" bigint,
    numero_orden integer,
    serie_dicom character varying(200),
    descripcion_imagen text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.imagen_digital OWNER TO postgres;

--
-- TOC entry 502 (class 1259 OID 19914)
-- Name: imagen_digital_imagen_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.imagen_digital_imagen_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.imagen_digital_imagen_id_seq OWNER TO postgres;

--
-- TOC entry 8487 (class 0 OID 0)
-- Dependencies: 502
-- Name: imagen_digital_imagen_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.imagen_digital_imagen_id_seq OWNED BY medico.imagen_digital.imagen_id;


--
-- TOC entry 439 (class 1259 OID 18677)
-- Name: indicacion_medica; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.indicacion_medica (
    indicacion_id bigint NOT NULL,
    tipo_indicacion_id bigint,
    atencion_id bigint,
    episodio_id bigint,
    evolucion_id bigint,
    fecha_hora_indicacion timestamp without time zone DEFAULT now() NOT NULL,
    personal_indica_id bigint,
    descripcion text NOT NULL,
    frecuencia character varying(200),
    duracion character varying(200),
    via_administracion_id bigint,
    dosis character varying(200),
    fecha_hora_inicio timestamp without time zone,
    fecha_hora_fin timestamp without time zone,
    prioridad character varying(50),
    estado character varying(50) DEFAULT 'activa'::character varying,
    fecha_hora_suspension timestamp without time zone,
    motivo_suspension text,
    personal_suspende_id bigint,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.indicacion_medica OWNER TO postgres;

--
-- TOC entry 438 (class 1259 OID 18676)
-- Name: indicacion_medica_indicacion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.indicacion_medica_indicacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.indicacion_medica_indicacion_id_seq OWNER TO postgres;

--
-- TOC entry 8488 (class 0 OID 0)
-- Dependencies: 438
-- Name: indicacion_medica_indicacion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.indicacion_medica_indicacion_id_seq OWNED BY medico.indicacion_medica.indicacion_id;


--
-- TOC entry 537 (class 1259 OID 20588)
-- Name: indicador_financiero; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.indicador_financiero (
    indicador_id bigint NOT NULL,
    periodo_id bigint NOT NULL,
    nombre_indicador character varying(200) NOT NULL,
    formula text,
    valor numeric(15,4) NOT NULL,
    unidad character varying(50),
    valor_objetivo numeric(15,4),
    semaforo character varying(20),
    fecha_calculo date DEFAULT CURRENT_DATE NOT NULL,
    observaciones text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.indicador_financiero OWNER TO postgres;

--
-- TOC entry 536 (class 1259 OID 20587)
-- Name: indicador_financiero_indicador_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.indicador_financiero_indicador_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.indicador_financiero_indicador_id_seq OWNER TO postgres;

--
-- TOC entry 8489 (class 0 OID 0)
-- Dependencies: 536
-- Name: indicador_financiero_indicador_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.indicador_financiero_indicador_id_seq OWNED BY medico.indicador_financiero.indicador_id;


--
-- TOC entry 571 (class 1259 OID 21069)
-- Name: indicador_kpi; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.indicador_kpi (
    kpi_id bigint NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(300) NOT NULL,
    descripcion text,
    categoria character varying(100),
    formula text,
    query_sql text,
    unidad_medida character varying(50),
    meta_valor numeric(15,4),
    umbral_critico numeric(15,4),
    umbral_alerta numeric(15,4),
    frecuencia_calculo character varying(50),
    widget_id bigint,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.indicador_kpi OWNER TO postgres;

--
-- TOC entry 570 (class 1259 OID 21068)
-- Name: indicador_kpi_kpi_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.indicador_kpi_kpi_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.indicador_kpi_kpi_id_seq OWNER TO postgres;

--
-- TOC entry 8490 (class 0 OID 0)
-- Dependencies: 570
-- Name: indicador_kpi_kpi_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.indicador_kpi_kpi_id_seq OWNED BY medico.indicador_kpi.kpi_id;


--
-- TOC entry 505 (class 1259 OID 19941)
-- Name: informe_imagen; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.informe_imagen (
    informe_imagen_id bigint NOT NULL,
    examen_imagen_id bigint NOT NULL,
    fecha_hora_informe timestamp without time zone DEFAULT now() NOT NULL,
    personal_informa_id bigint,
    tecnica_descripcion text,
    hallazgos text,
    comparacion_previos text,
    impresion_diagnostica text,
    recomendaciones text,
    estado_resultado_id bigint,
    fecha_hora_entrega timestamp without time zone,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.informe_imagen OWNER TO postgres;

--
-- TOC entry 504 (class 1259 OID 19940)
-- Name: informe_imagen_informe_imagen_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.informe_imagen_informe_imagen_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.informe_imagen_informe_imagen_id_seq OWNER TO postgres;

--
-- TOC entry 8491 (class 0 OID 0)
-- Dependencies: 504
-- Name: informe_imagen_informe_imagen_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.informe_imagen_informe_imagen_id_seq OWNED BY medico.informe_imagen.informe_imagen_id;


--
-- TOC entry 513 (class 1259 OID 20141)
-- Name: integracion_nubefact; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.integracion_nubefact (
    integracion_id bigint NOT NULL,
    comprobante_id bigint NOT NULL,
    fecha_envio timestamp without time zone DEFAULT now() NOT NULL,
    request_json jsonb,
    response_json jsonb,
    codigo_respuesta character varying(50),
    mensaje_respuesta text,
    numero_ticket character varying(100),
    enlace_pdf text,
    enlace_xml text,
    codigo_sunat character varying(50),
    intentos integer DEFAULT 1,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.integracion_nubefact OWNER TO postgres;

--
-- TOC entry 512 (class 1259 OID 20140)
-- Name: integracion_nubefact_integracion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.integracion_nubefact_integracion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.integracion_nubefact_integracion_id_seq OWNER TO postgres;

--
-- TOC entry 8492 (class 0 OID 0)
-- Dependencies: 512
-- Name: integracion_nubefact_integracion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.integracion_nubefact_integracion_id_seq OWNED BY medico.integracion_nubefact.integracion_id;


--
-- TOC entry 451 (class 1259 OID 18890)
-- Name: interconsulta; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.interconsulta (
    interconsulta_id bigint NOT NULL,
    atencion_id bigint,
    episodio_id bigint,
    numero_interconsulta character varying(50) NOT NULL,
    fecha_hora_solicitud timestamp without time zone DEFAULT now() NOT NULL,
    personal_solicita_id bigint,
    especialidad_solicitada_id bigint,
    personal_interconsultor_id bigint,
    motivo_interconsulta text,
    antecedentes_relevantes text,
    pregunta_especifica text,
    prioridad character varying(50),
    fecha_hora_atencion timestamp without time zone,
    evaluacion_interconsultor text,
    diagnostico_interconsultor text,
    recomendaciones text,
    requiere_seguimiento boolean DEFAULT false,
    estado_interconsulta_id bigint,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.interconsulta OWNER TO postgres;

--
-- TOC entry 450 (class 1259 OID 18889)
-- Name: interconsulta_interconsulta_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.interconsulta_interconsulta_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.interconsulta_interconsulta_id_seq OWNER TO postgres;

--
-- TOC entry 8493 (class 0 OID 0)
-- Dependencies: 450
-- Name: interconsulta_interconsulta_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.interconsulta_interconsulta_id_seq OWNED BY medico.interconsulta.interconsulta_id;


--
-- TOC entry 603 (class 1259 OID 21580)
-- Name: log_acceso_hc; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.log_acceso_hc (
    log_acceso_hc_id bigint NOT NULL,
    usuario_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    atencion_id bigint,
    tipo_acceso character varying(50) NOT NULL,
    modulo character varying(100) NOT NULL,
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    ip_origen inet,
    justificacion text,
    tiempo_acceso_segundos integer
);


ALTER TABLE medico.log_acceso_hc OWNER TO postgres;

--
-- TOC entry 602 (class 1259 OID 21579)
-- Name: log_acceso_hc_log_acceso_hc_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.log_acceso_hc_log_acceso_hc_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.log_acceso_hc_log_acceso_hc_id_seq OWNER TO postgres;

--
-- TOC entry 8494 (class 0 OID 0)
-- Dependencies: 602
-- Name: log_acceso_hc_log_acceso_hc_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.log_acceso_hc_log_acceso_hc_id_seq OWNED BY medico.log_acceso_hc.log_acceso_hc_id;


--
-- TOC entry 601 (class 1259 OID 21561)
-- Name: log_acceso_sistema; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.log_acceso_sistema (
    log_acceso_id bigint NOT NULL,
    usuario_id bigint,
    tipo_evento character varying(100) NOT NULL,
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    ip_origen inet,
    navegador character varying(200),
    sistema_operativo character varying(200),
    dispositivo character varying(200),
    ubicacion_geografica character varying(300),
    exitoso boolean DEFAULT true,
    mensaje text
);


ALTER TABLE medico.log_acceso_sistema OWNER TO postgres;

--
-- TOC entry 600 (class 1259 OID 21560)
-- Name: log_acceso_sistema_log_acceso_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.log_acceso_sistema_log_acceso_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.log_acceso_sistema_log_acceso_id_seq OWNER TO postgres;

--
-- TOC entry 8495 (class 0 OID 0)
-- Dependencies: 600
-- Name: log_acceso_sistema_log_acceso_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.log_acceso_sistema_log_acceso_id_seq OWNED BY medico.log_acceso_sistema.log_acceso_id;


--
-- TOC entry 599 (class 1259 OID 21541)
-- Name: log_auditoria_sistema; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.log_auditoria_sistema (
    log_auditoria_id bigint NOT NULL,
    tabla_afectada character varying(100) NOT NULL,
    operacion medico.tipo_operacion NOT NULL,
    registro_id bigint NOT NULL,
    usuario_id bigint,
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    ip_origen inet,
    user_agent text,
    valores_anteriores_json jsonb,
    valores_nuevos_json jsonb,
    motivo_cambio text,
    observaciones text
);


ALTER TABLE medico.log_auditoria_sistema OWNER TO postgres;

--
-- TOC entry 598 (class 1259 OID 21540)
-- Name: log_auditoria_sistema_log_auditoria_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.log_auditoria_sistema_log_auditoria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.log_auditoria_sistema_log_auditoria_id_seq OWNER TO postgres;

--
-- TOC entry 8496 (class 0 OID 0)
-- Dependencies: 598
-- Name: log_auditoria_sistema_log_auditoria_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.log_auditoria_sistema_log_auditoria_id_seq OWNED BY medico.log_auditoria_sistema.log_auditoria_id;


--
-- TOC entry 583 (class 1259 OID 21295)
-- Name: log_ia; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.log_ia (
    log_ia_id bigint NOT NULL,
    modelo_id bigint NOT NULL,
    usuario_id bigint,
    tipo_operacion character varying(100) NOT NULL,
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    entrada_json jsonb,
    salida_json jsonb,
    tiempo_respuesta_ms integer,
    exitoso boolean DEFAULT true,
    mensaje_error text,
    ip_origen inet,
    user_agent text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.log_ia OWNER TO postgres;

--
-- TOC entry 582 (class 1259 OID 21294)
-- Name: log_ia_log_ia_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.log_ia_log_ia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.log_ia_log_ia_id_seq OWNER TO postgres;

--
-- TOC entry 8497 (class 0 OID 0)
-- Dependencies: 582
-- Name: log_ia_log_ia_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.log_ia_log_ia_id_seq OWNED BY medico.log_ia.log_ia_id;


--
-- TOC entry 471 (class 1259 OID 19317)
-- Name: lote_producto; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.lote_producto (
    lote_id bigint NOT NULL,
    producto_id bigint NOT NULL,
    almacen_id bigint NOT NULL,
    numero_lote character varying(100) NOT NULL,
    fecha_fabricacion date,
    fecha_vencimiento date NOT NULL,
    cantidad_actual numeric(12,2) DEFAULT 0 NOT NULL,
    costo_unitario numeric(12,2) NOT NULL,
    proveedor_id bigint,
    ubicacion_fisica character varying(100),
    estado_lote character varying(50) DEFAULT 'disponible'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.lote_producto OWNER TO postgres;

--
-- TOC entry 470 (class 1259 OID 19316)
-- Name: lote_producto_lote_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.lote_producto_lote_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.lote_producto_lote_id_seq OWNER TO postgres;

--
-- TOC entry 8498 (class 0 OID 0)
-- Dependencies: 470
-- Name: lote_producto_lote_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.lote_producto_lote_id_seq OWNED BY medico.lote_producto.lote_id;


--
-- TOC entry 593 (class 1259 OID 21436)
-- Name: mapeo_codigo; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.mapeo_codigo (
    mapeo_codigo_id bigint NOT NULL,
    sistema_origen character varying(100) NOT NULL,
    codigo_origen character varying(100) NOT NULL,
    descripcion_origen text,
    sistema_destino character varying(100) NOT NULL,
    codigo_destino character varying(100) NOT NULL,
    descripcion_destino text,
    tipo_mapeo character varying(100),
    es_bidireccional boolean DEFAULT false,
    personal_registra_id bigint,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.mapeo_codigo OWNER TO postgres;

--
-- TOC entry 592 (class 1259 OID 21435)
-- Name: mapeo_codigo_mapeo_codigo_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.mapeo_codigo_mapeo_codigo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.mapeo_codigo_mapeo_codigo_id_seq OWNER TO postgres;

--
-- TOC entry 8499 (class 0 OID 0)
-- Dependencies: 592
-- Name: mapeo_codigo_mapeo_codigo_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.mapeo_codigo_mapeo_codigo_id_seq OWNED BY medico.mapeo_codigo.mapeo_codigo_id;


--
-- TOC entry 459 (class 1259 OID 19086)
-- Name: medico_hospitalizacion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.medico_hospitalizacion (
    medico_hospitalizacion_id bigint NOT NULL,
    hospitalizacion_id bigint NOT NULL,
    episodio_id bigint,
    personal_id bigint NOT NULL,
    tipo_participacion character varying(100),
    fecha_inicio timestamp without time zone DEFAULT now() NOT NULL,
    fecha_fin timestamp without time zone,
    es_responsable_actual boolean DEFAULT false,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.medico_hospitalizacion OWNER TO postgres;

--
-- TOC entry 458 (class 1259 OID 19085)
-- Name: medico_hospitalizacion_medico_hospitalizacion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.medico_hospitalizacion_medico_hospitalizacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.medico_hospitalizacion_medico_hospitalizacion_id_seq OWNER TO postgres;

--
-- TOC entry 8500 (class 0 OID 0)
-- Dependencies: 458
-- Name: medico_hospitalizacion_medico_hospitalizacion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.medico_hospitalizacion_medico_hospitalizacion_id_seq OWNED BY medico.medico_hospitalizacion.medico_hospitalizacion_id;


--
-- TOC entry 591 (class 1259 OID 21402)
-- Name: mensaje_hl7; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.mensaje_hl7 (
    mensaje_hl7_id bigint NOT NULL,
    tipo_mensaje_id bigint,
    sistema_externo_id bigint,
    control_id character varying(100) NOT NULL,
    mensaje_contenido text NOT NULL,
    direccion character varying(50) NOT NULL,
    fecha_hora_envio timestamp without time zone DEFAULT now() NOT NULL,
    fecha_hora_respuesta timestamp without time zone,
    ack_recibido boolean DEFAULT false,
    ack_contenido text,
    codigo_ack character varying(10),
    estado character varying(50) DEFAULT 'pendiente'::character varying,
    mensaje_error text,
    intentos integer DEFAULT 1,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.mensaje_hl7 OWNER TO postgres;

--
-- TOC entry 590 (class 1259 OID 21401)
-- Name: mensaje_hl7_mensaje_hl7_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.mensaje_hl7_mensaje_hl7_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.mensaje_hl7_mensaje_hl7_id_seq OWNER TO postgres;

--
-- TOC entry 8501 (class 0 OID 0)
-- Dependencies: 590
-- Name: mensaje_hl7_mensaje_hl7_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.mensaje_hl7_mensaje_hl7_id_seq OWNED BY medico.mensaje_hl7.mensaje_hl7_id;


--
-- TOC entry 327 (class 1259 OID 17224)
-- Name: metodo_examen; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.metodo_examen (
    metodo_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.metodo_examen OWNER TO postgres;

--
-- TOC entry 326 (class 1259 OID 17223)
-- Name: metodo_examen_metodo_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.metodo_examen_metodo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.metodo_examen_metodo_id_seq OWNER TO postgres;

--
-- TOC entry 8502 (class 0 OID 0)
-- Dependencies: 326
-- Name: metodo_examen_metodo_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.metodo_examen_metodo_id_seq OWNED BY medico.metodo_examen.metodo_id;


--
-- TOC entry 575 (class 1259 OID 21122)
-- Name: modelo_ia; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.modelo_ia (
    modelo_id bigint NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(300) NOT NULL,
    tipo_modelo_id bigint,
    descripcion text,
    version character varying(50) NOT NULL,
    fecha_entrenamiento date,
    fecha_despliegue date,
    precision_porcentaje numeric(5,2),
    recall_porcentaje numeric(5,2),
    f1_score numeric(5,4),
    especialidad_id bigint,
    area_aplicacion character varying(100),
    ruta_modelo text,
    configuracion_json jsonb,
    requiere_aprobacion_humana boolean DEFAULT true,
    estado character varying(20) DEFAULT 'desarrollo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.modelo_ia OWNER TO postgres;

--
-- TOC entry 574 (class 1259 OID 21121)
-- Name: modelo_ia_modelo_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.modelo_ia_modelo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.modelo_ia_modelo_id_seq OWNER TO postgres;

--
-- TOC entry 8503 (class 0 OID 0)
-- Dependencies: 574
-- Name: modelo_ia_modelo_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.modelo_ia_modelo_id_seq OWNED BY medico.modelo_ia.modelo_id;


--
-- TOC entry 335 (class 1259 OID 17280)
-- Name: moneda; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.moneda (
    moneda_id bigint NOT NULL,
    codigo character varying(5) NOT NULL,
    nombre character varying(50) NOT NULL,
    simbolo character varying(5),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.moneda OWNER TO postgres;

--
-- TOC entry 334 (class 1259 OID 17279)
-- Name: moneda_moneda_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.moneda_moneda_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.moneda_moneda_id_seq OWNER TO postgres;

--
-- TOC entry 8504 (class 0 OID 0)
-- Dependencies: 334
-- Name: moneda_moneda_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.moneda_moneda_id_seq OWNED BY medico.moneda.moneda_id;


--
-- TOC entry 417 (class 1259 OID 18169)
-- Name: motivo_consulta_predefinido; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.motivo_consulta_predefinido (
    motivo_consulta_id bigint NOT NULL,
    especialidad_id bigint,
    descripcion character varying(500) NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.motivo_consulta_predefinido OWNER TO postgres;

--
-- TOC entry 416 (class 1259 OID 18168)
-- Name: motivo_consulta_predefinido_motivo_consulta_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.motivo_consulta_predefinido_motivo_consulta_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.motivo_consulta_predefinido_motivo_consulta_id_seq OWNER TO postgres;

--
-- TOC entry 8505 (class 0 OID 0)
-- Dependencies: 416
-- Name: motivo_consulta_predefinido_motivo_consulta_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.motivo_consulta_predefinido_motivo_consulta_id_seq OWNED BY medico.motivo_consulta_predefinido.motivo_consulta_id;


--
-- TOC entry 473 (class 1259 OID 19354)
-- Name: movimiento_almacen; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.movimiento_almacen (
    movimiento_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    almacen_id bigint NOT NULL,
    tipo_movimiento_id bigint,
    numero_documento character varying(50) NOT NULL,
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    personal_id bigint,
    proveedor_id bigint,
    almacen_destino_id bigint,
    motivo text,
    observaciones text,
    estado character varying(20) DEFAULT 'confirmado'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.movimiento_almacen OWNER TO postgres;

--
-- TOC entry 472 (class 1259 OID 19353)
-- Name: movimiento_almacen_movimiento_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.movimiento_almacen_movimiento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.movimiento_almacen_movimiento_id_seq OWNER TO postgres;

--
-- TOC entry 8506 (class 0 OID 0)
-- Dependencies: 472
-- Name: movimiento_almacen_movimiento_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.movimiento_almacen_movimiento_id_seq OWNED BY medico.movimiento_almacen.movimiento_id;


--
-- TOC entry 519 (class 1259 OID 20250)
-- Name: movimiento_caja; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.movimiento_caja (
    movimiento_caja_id bigint NOT NULL,
    apertura_id bigint NOT NULL,
    tipo_movimiento character varying(20) NOT NULL,
    categoria_movimiento_id bigint,
    numero_operacion character varying(50),
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    comprobante_id bigint,
    pago_comprobante_id bigint,
    monto numeric(12,2) NOT NULL,
    forma_pago_id bigint,
    moneda_id bigint,
    tipo_cambio numeric(8,4) DEFAULT 1.0000,
    concepto text NOT NULL,
    proveedor_id bigint,
    personal_beneficiario_id bigint,
    pago_servicio_id bigint,
    documento_sustento character varying(200),
    observaciones text,
    personal_autoriza_id bigint,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.movimiento_caja OWNER TO postgres;

--
-- TOC entry 518 (class 1259 OID 20249)
-- Name: movimiento_caja_movimiento_caja_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.movimiento_caja_movimiento_caja_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.movimiento_caja_movimiento_caja_id_seq OWNER TO postgres;

--
-- TOC entry 8507 (class 0 OID 0)
-- Dependencies: 518
-- Name: movimiento_caja_movimiento_caja_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.movimiento_caja_movimiento_caja_id_seq OWNED BY medico.movimiento_caja.movimiento_caja_id;


--
-- TOC entry 463 (class 1259 OID 19174)
-- Name: movimiento_cama; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.movimiento_cama (
    movimiento_cama_id bigint NOT NULL,
    hospitalizacion_id bigint NOT NULL,
    cama_origen_id bigint,
    cama_destino_id bigint NOT NULL,
    fecha_hora_movimiento timestamp without time zone DEFAULT now() NOT NULL,
    motivo text,
    personal_autoriza_id bigint,
    observaciones text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.movimiento_cama OWNER TO postgres;

--
-- TOC entry 462 (class 1259 OID 19173)
-- Name: movimiento_cama_movimiento_cama_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.movimiento_cama_movimiento_cama_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.movimiento_cama_movimiento_cama_id_seq OWNER TO postgres;

--
-- TOC entry 8508 (class 0 OID 0)
-- Dependencies: 462
-- Name: movimiento_cama_movimiento_cama_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.movimiento_cama_movimiento_cama_id_seq OWNED BY medico.movimiento_cama.movimiento_cama_id;


--
-- TOC entry 491 (class 1259 OID 19713)
-- Name: muestra_laboratorio; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.muestra_laboratorio (
    muestra_id bigint NOT NULL,
    solicitud_id bigint NOT NULL,
    codigo_muestra character varying(50) NOT NULL,
    tipo_muestra_id bigint,
    fecha_hora_toma timestamp without time zone DEFAULT now() NOT NULL,
    personal_toma_id bigint,
    volumen_ml numeric(8,2),
    numero_tubos integer,
    condiciones_muestra text,
    observaciones text,
    rechazada boolean DEFAULT false,
    motivo_rechazo text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.muestra_laboratorio OWNER TO postgres;

--
-- TOC entry 490 (class 1259 OID 19712)
-- Name: muestra_laboratorio_muestra_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.muestra_laboratorio_muestra_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.muestra_laboratorio_muestra_id_seq OWNER TO postgres;

--
-- TOC entry 8509 (class 0 OID 0)
-- Dependencies: 490
-- Name: muestra_laboratorio_muestra_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.muestra_laboratorio_muestra_id_seq OWNED BY medico.muestra_laboratorio.muestra_id;


--
-- TOC entry 361 (class 1259 OID 17475)
-- Name: opcion_cumplimiento; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.opcion_cumplimiento (
    opcion_cumplimiento_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    valor_numerico numeric(5,2),
    color_hex character varying(7),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.opcion_cumplimiento OWNER TO postgres;

--
-- TOC entry 360 (class 1259 OID 17474)
-- Name: opcion_cumplimiento_opcion_cumplimiento_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.opcion_cumplimiento_opcion_cumplimiento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.opcion_cumplimiento_opcion_cumplimiento_id_seq OWNER TO postgres;

--
-- TOC entry 8510 (class 0 OID 0)
-- Dependencies: 360
-- Name: opcion_cumplimiento_opcion_cumplimiento_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.opcion_cumplimiento_opcion_cumplimiento_id_seq OWNED BY medico.opcion_cumplimiento.opcion_cumplimiento_id;


--
-- TOC entry 281 (class 1259 OID 16880)
-- Name: orden_diagnostico; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.orden_diagnostico (
    orden_diagnostico_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.orden_diagnostico OWNER TO postgres;

--
-- TOC entry 280 (class 1259 OID 16879)
-- Name: orden_diagnostico_orden_diagnostico_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.orden_diagnostico_orden_diagnostico_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.orden_diagnostico_orden_diagnostico_id_seq OWNER TO postgres;

--
-- TOC entry 8511 (class 0 OID 0)
-- Dependencies: 280
-- Name: orden_diagnostico_orden_diagnostico_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.orden_diagnostico_orden_diagnostico_id_seq OWNED BY medico.orden_diagnostico.orden_diagnostico_id;


--
-- TOC entry 375 (class 1259 OID 17582)
-- Name: organizacion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.organizacion (
    organizacion_id bigint NOT NULL,
    ruc character varying(11) NOT NULL,
    razon_social character varying(300) NOT NULL,
    nombre_comercial character varying(300),
    tipo_organizacion_id bigint,
    direccion_fiscal text,
    ubigeo_id bigint,
    telefono character varying(20),
    email character varying(200),
    logo_url text,
    representante_legal character varying(300),
    fecha_constitucion date,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.organizacion OWNER TO postgres;

--
-- TOC entry 8512 (class 0 OID 0)
-- Dependencies: 375
-- Name: TABLE organizacion; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON TABLE medico.organizacion IS 'Tabla principal que representa la clínica/hospital/centro médico';


--
-- TOC entry 374 (class 1259 OID 17581)
-- Name: organizacion_organizacion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.organizacion_organizacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.organizacion_organizacion_id_seq OWNER TO postgres;

--
-- TOC entry 8513 (class 0 OID 0)
-- Dependencies: 374
-- Name: organizacion_organizacion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.organizacion_organizacion_id_seq OWNED BY medico.organizacion.organizacion_id;


--
-- TOC entry 381 (class 1259 OID 17693)
-- Name: paciente; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.paciente (
    paciente_id bigint NOT NULL,
    persona_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    numero_historia_clinica character varying(50) NOT NULL,
    tipo_paciente_id bigint,
    fecha_registro date DEFAULT CURRENT_DATE NOT NULL,
    medico_cabecera_id bigint,
    observaciones text,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.paciente OWNER TO postgres;

--
-- TOC entry 8514 (class 0 OID 0)
-- Dependencies: 381
-- Name: TABLE paciente; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON TABLE medico.paciente IS 'Pacientes registrados en el sistema';


--
-- TOC entry 8515 (class 0 OID 0)
-- Dependencies: 381
-- Name: COLUMN paciente.numero_historia_clinica; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON COLUMN medico.paciente.numero_historia_clinica IS 'Número único de historia clínica por organización';


--
-- TOC entry 389 (class 1259 OID 17796)
-- Name: paciente_alergia; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.paciente_alergia (
    paciente_alergia_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    alergia_id bigint NOT NULL,
    descripcion text,
    fecha_deteccion date,
    observaciones text,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.paciente_alergia OWNER TO postgres;

--
-- TOC entry 388 (class 1259 OID 17795)
-- Name: paciente_alergia_paciente_alergia_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.paciente_alergia_paciente_alergia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.paciente_alergia_paciente_alergia_id_seq OWNER TO postgres;

--
-- TOC entry 8516 (class 0 OID 0)
-- Dependencies: 388
-- Name: paciente_alergia_paciente_alergia_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.paciente_alergia_paciente_alergia_id_seq OWNED BY medico.paciente_alergia.paciente_alergia_id;


--
-- TOC entry 397 (class 1259 OID 17893)
-- Name: paciente_antecedente_familiar; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.paciente_antecedente_familiar (
    paciente_antecedente_familiar_id bigint CONSTRAINT paciente_antecedente_famili_paciente_antecedente_famil_not_null NOT NULL,
    paciente_id bigint NOT NULL,
    antecedente_id bigint NOT NULL,
    cie10_id bigint,
    parentesco_id bigint,
    observaciones text,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.paciente_antecedente_familiar OWNER TO postgres;

--
-- TOC entry 396 (class 1259 OID 17892)
-- Name: paciente_antecedente_familiar_paciente_antecedente_familiar_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.paciente_antecedente_familiar_paciente_antecedente_familiar_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.paciente_antecedente_familiar_paciente_antecedente_familiar_seq OWNER TO postgres;

--
-- TOC entry 8517 (class 0 OID 0)
-- Dependencies: 396
-- Name: paciente_antecedente_familiar_paciente_antecedente_familiar_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.paciente_antecedente_familiar_paciente_antecedente_familiar_seq OWNED BY medico.paciente_antecedente_familiar.paciente_antecedente_familiar_id;


--
-- TOC entry 395 (class 1259 OID 17861)
-- Name: paciente_antecedente_personal; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.paciente_antecedente_personal (
    paciente_antecedente_personal_id bigint CONSTRAINT paciente_antecedente_person_paciente_antecedente_perso_not_null NOT NULL,
    paciente_id bigint NOT NULL,
    antecedente_id bigint NOT NULL,
    cie10_id bigint,
    fecha_diagnostico date,
    tratamiento_recibido text,
    observaciones text,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.paciente_antecedente_personal OWNER TO postgres;

--
-- TOC entry 394 (class 1259 OID 17860)
-- Name: paciente_antecedente_personal_paciente_antecedente_personal_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.paciente_antecedente_personal_paciente_antecedente_personal_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.paciente_antecedente_personal_paciente_antecedente_personal_seq OWNER TO postgres;

--
-- TOC entry 8518 (class 0 OID 0)
-- Dependencies: 394
-- Name: paciente_antecedente_personal_paciente_antecedente_personal_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.paciente_antecedente_personal_paciente_antecedente_personal_seq OWNED BY medico.paciente_antecedente_personal.paciente_antecedente_personal_id;


--
-- TOC entry 385 (class 1259 OID 17754)
-- Name: paciente_aseguradora; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.paciente_aseguradora (
    paciente_aseguradora_id bigint NOT NULL,
    paciente_id bigint NOT NULL,
    aseguradora_id bigint NOT NULL,
    numero_poliza character varying(100),
    fecha_inicio date,
    fecha_fin date,
    categoria_asegurado character varying(100),
    plan character varying(200),
    es_principal boolean DEFAULT false,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.paciente_aseguradora OWNER TO postgres;

--
-- TOC entry 384 (class 1259 OID 17753)
-- Name: paciente_aseguradora_paciente_aseguradora_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.paciente_aseguradora_paciente_aseguradora_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.paciente_aseguradora_paciente_aseguradora_id_seq OWNER TO postgres;

--
-- TOC entry 8519 (class 0 OID 0)
-- Dependencies: 384
-- Name: paciente_aseguradora_paciente_aseguradora_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.paciente_aseguradora_paciente_aseguradora_id_seq OWNED BY medico.paciente_aseguradora.paciente_aseguradora_id;


--
-- TOC entry 380 (class 1259 OID 17692)
-- Name: paciente_paciente_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.paciente_paciente_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.paciente_paciente_id_seq OWNER TO postgres;

--
-- TOC entry 8520 (class 0 OID 0)
-- Dependencies: 380
-- Name: paciente_paciente_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.paciente_paciente_id_seq OWNED BY medico.paciente.paciente_id;


--
-- TOC entry 511 (class 1259 OID 20113)
-- Name: pago_comprobante; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.pago_comprobante (
    pago_comprobante_id bigint NOT NULL,
    comprobante_id bigint NOT NULL,
    fecha_pago date DEFAULT CURRENT_DATE NOT NULL,
    monto_pagado numeric(12,2) NOT NULL,
    forma_pago_id bigint,
    numero_operacion character varying(100),
    banco character varying(200),
    observaciones text,
    movimiento_caja_id bigint,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.pago_comprobante OWNER TO postgres;

--
-- TOC entry 510 (class 1259 OID 20112)
-- Name: pago_comprobante_pago_comprobante_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.pago_comprobante_pago_comprobante_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.pago_comprobante_pago_comprobante_id_seq OWNER TO postgres;

--
-- TOC entry 8521 (class 0 OID 0)
-- Dependencies: 510
-- Name: pago_comprobante_pago_comprobante_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.pago_comprobante_pago_comprobante_id_seq OWNED BY medico.pago_comprobante.pago_comprobante_id;


--
-- TOC entry 527 (class 1259 OID 20400)
-- Name: pago_planilla; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.pago_planilla (
    pago_planilla_id bigint NOT NULL,
    detalle_planilla_id bigint NOT NULL,
    fecha_pago date NOT NULL,
    monto numeric(12,2) NOT NULL,
    forma_pago_id bigint,
    numero_operacion character varying(100),
    movimiento_caja_id bigint,
    banco character varying(200),
    cuenta_bancaria character varying(50),
    observaciones text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.pago_planilla OWNER TO postgres;

--
-- TOC entry 526 (class 1259 OID 20399)
-- Name: pago_planilla_pago_planilla_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.pago_planilla_pago_planilla_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.pago_planilla_pago_planilla_id_seq OWNER TO postgres;

--
-- TOC entry 8522 (class 0 OID 0)
-- Dependencies: 526
-- Name: pago_planilla_pago_planilla_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.pago_planilla_pago_planilla_id_seq OWNED BY medico.pago_planilla.pago_planilla_id;


--
-- TOC entry 529 (class 1259 OID 20432)
-- Name: pago_servicio; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.pago_servicio (
    pago_servicio_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    sede_id bigint,
    tipo_servicio_id bigint,
    proveedor_id bigint,
    periodo character varying(10) NOT NULL,
    numero_suministro character varying(50),
    fecha_emision date,
    fecha_vencimiento date,
    fecha_pago date,
    monto numeric(12,2) NOT NULL,
    mora numeric(12,2) DEFAULT 0,
    total_pagado numeric(12,2) NOT NULL,
    comprobante_proveedor character varying(100),
    observaciones text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.pago_servicio OWNER TO postgres;

--
-- TOC entry 528 (class 1259 OID 20431)
-- Name: pago_servicio_pago_servicio_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.pago_servicio_pago_servicio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.pago_servicio_pago_servicio_id_seq OWNER TO postgres;

--
-- TOC entry 8523 (class 0 OID 0)
-- Dependencies: 528
-- Name: pago_servicio_pago_servicio_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.pago_servicio_pago_servicio_id_seq OWNED BY medico.pago_servicio.pago_servicio_id;


--
-- TOC entry 495 (class 1259 OID 19794)
-- Name: parametro_laboratorio; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.parametro_laboratorio (
    parametro_id bigint NOT NULL,
    tipo_examen_id bigint NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(300) NOT NULL,
    unidad_medida_lab_id bigint,
    valor_referencia_min_masculino numeric(12,4),
    valor_referencia_max_masculino numeric(12,4),
    valor_referencia_min_femenino numeric(12,4),
    valor_referencia_max_femenino numeric(12,4),
    valor_referencia_min_pediatrico numeric(12,4),
    valor_referencia_max_pediatrico numeric(12,4),
    valor_referencia_texto text,
    valor_critico_min numeric(12,4),
    valor_critico_max numeric(12,4),
    orden_presentacion integer,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.parametro_laboratorio OWNER TO postgres;

--
-- TOC entry 494 (class 1259 OID 19793)
-- Name: parametro_laboratorio_parametro_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.parametro_laboratorio_parametro_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.parametro_laboratorio_parametro_id_seq OWNER TO postgres;

--
-- TOC entry 8524 (class 0 OID 0)
-- Dependencies: 494
-- Name: parametro_laboratorio_parametro_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.parametro_laboratorio_parametro_id_seq OWNED BY medico.parametro_laboratorio.parametro_id;


--
-- TOC entry 233 (class 1259 OID 16529)
-- Name: parentesco; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.parentesco (
    parentesco_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(50) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.parentesco OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16528)
-- Name: parentesco_parentesco_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.parentesco_parentesco_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.parentesco_parentesco_id_seq OWNER TO postgres;

--
-- TOC entry 8525 (class 0 OID 0)
-- Dependencies: 232
-- Name: parentesco_parentesco_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.parentesco_parentesco_id_seq OWNED BY medico.parentesco.parentesco_id;


--
-- TOC entry 531 (class 1259 OID 20471)
-- Name: periodo_contable; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.periodo_contable (
    periodo_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    "año" integer NOT NULL,
    mes integer NOT NULL,
    trimestre integer,
    semestre integer,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    estado character varying(20) DEFAULT 'abierto'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.periodo_contable OWNER TO postgres;

--
-- TOC entry 530 (class 1259 OID 20470)
-- Name: periodo_contable_periodo_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.periodo_contable_periodo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.periodo_contable_periodo_id_seq OWNER TO postgres;

--
-- TOC entry 8526 (class 0 OID 0)
-- Dependencies: 530
-- Name: periodo_contable_periodo_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.periodo_contable_periodo_id_seq OWNED BY medico.periodo_contable.periodo_id;


--
-- TOC entry 521 (class 1259 OID 20316)
-- Name: periodo_planilla; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.periodo_planilla (
    periodo_planilla_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    "año" integer NOT NULL,
    mes integer NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    fecha_pago date,
    estado character varying(20) DEFAULT 'abierto'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.periodo_planilla OWNER TO postgres;

--
-- TOC entry 520 (class 1259 OID 20315)
-- Name: periodo_planilla_periodo_planilla_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.periodo_planilla_periodo_planilla_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.periodo_planilla_periodo_planilla_id_seq OWNER TO postgres;

--
-- TOC entry 8527 (class 0 OID 0)
-- Dependencies: 520
-- Name: periodo_planilla_periodo_planilla_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.periodo_planilla_periodo_planilla_id_seq OWNED BY medico.periodo_planilla.periodo_planilla_id;


--
-- TOC entry 541 (class 1259 OID 20645)
-- Name: periodo_reporte_susalud; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.periodo_reporte_susalud (
    periodo_reporte_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    "año" integer NOT NULL,
    mes integer NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_fin date NOT NULL,
    estado character varying(20) DEFAULT 'abierto'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.periodo_reporte_susalud OWNER TO postgres;

--
-- TOC entry 540 (class 1259 OID 20644)
-- Name: periodo_reporte_susalud_periodo_reporte_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.periodo_reporte_susalud_periodo_reporte_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.periodo_reporte_susalud_periodo_reporte_id_seq OWNER TO postgres;

--
-- TOC entry 8528 (class 0 OID 0)
-- Dependencies: 540
-- Name: periodo_reporte_susalud_periodo_reporte_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.periodo_reporte_susalud_periodo_reporte_id_seq OWNED BY medico.periodo_reporte_susalud.periodo_reporte_id;


--
-- TOC entry 405 (class 1259 OID 18010)
-- Name: permiso; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.permiso (
    permiso_id bigint NOT NULL,
    modulo character varying(100) NOT NULL,
    accion character varying(100) NOT NULL,
    descripcion text,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.permiso OWNER TO postgres;

--
-- TOC entry 404 (class 1259 OID 18009)
-- Name: permiso_permiso_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.permiso_permiso_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.permiso_permiso_id_seq OWNER TO postgres;

--
-- TOC entry 8529 (class 0 OID 0)
-- Dependencies: 404
-- Name: permiso_permiso_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.permiso_permiso_id_seq OWNED BY medico.permiso.permiso_id;


--
-- TOC entry 379 (class 1259 OID 17642)
-- Name: persona; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.persona (
    persona_id bigint NOT NULL,
    tipo_documento_id bigint NOT NULL,
    numero_documento character varying(20) NOT NULL,
    apellido_paterno character varying(100) NOT NULL,
    apellido_materno character varying(100),
    nombres character varying(200) NOT NULL,
    fecha_nacimiento date,
    sexo_id bigint,
    estado_civil_id bigint,
    foto_url text,
    huella_digital_url text,
    firma_url text,
    email character varying(200),
    telefono character varying(20),
    celular character varying(20),
    direccion text,
    ubigeo_id bigint,
    grupo_sanguineo_id bigint,
    factor_rh_id bigint,
    ocupacion character varying(200),
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.persona OWNER TO postgres;

--
-- TOC entry 8530 (class 0 OID 0)
-- Dependencies: 379
-- Name: TABLE persona; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON TABLE medico.persona IS 'Tabla base para todas las personas del sistema';


--
-- TOC entry 378 (class 1259 OID 17641)
-- Name: persona_persona_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.persona_persona_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.persona_persona_id_seq OWNER TO postgres;

--
-- TOC entry 8531 (class 0 OID 0)
-- Dependencies: 378
-- Name: persona_persona_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.persona_persona_id_seq OWNED BY medico.persona.persona_id;


--
-- TOC entry 399 (class 1259 OID 17930)
-- Name: personal; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.personal (
    personal_id bigint NOT NULL,
    persona_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    codigo_empleado character varying(50) NOT NULL,
    tipo_personal_id bigint,
    cargo_id bigint,
    fecha_ingreso date NOT NULL,
    fecha_cese date,
    colegiatura character varying(50),
    rne character varying(50),
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.personal OWNER TO postgres;

--
-- TOC entry 401 (class 1259 OID 17969)
-- Name: personal_especialidad; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.personal_especialidad (
    personal_especialidad_id bigint NOT NULL,
    personal_id bigint NOT NULL,
    especialidad_id bigint NOT NULL,
    es_principal boolean DEFAULT false,
    fecha_obtencion date,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.personal_especialidad OWNER TO postgres;

--
-- TOC entry 400 (class 1259 OID 17968)
-- Name: personal_especialidad_personal_especialidad_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.personal_especialidad_personal_especialidad_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.personal_especialidad_personal_especialidad_id_seq OWNER TO postgres;

--
-- TOC entry 8532 (class 0 OID 0)
-- Dependencies: 400
-- Name: personal_especialidad_personal_especialidad_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.personal_especialidad_personal_especialidad_id_seq OWNED BY medico.personal_especialidad.personal_especialidad_id;


--
-- TOC entry 398 (class 1259 OID 17929)
-- Name: personal_personal_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.personal_personal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.personal_personal_id_seq OWNER TO postgres;

--
-- TOC entry 8533 (class 0 OID 0)
-- Dependencies: 398
-- Name: personal_personal_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.personal_personal_id_seq OWNED BY medico.personal.personal_id;


--
-- TOC entry 449 (class 1259 OID 18865)
-- Name: personal_procedimiento; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.personal_procedimiento (
    personal_procedimiento_id bigint NOT NULL,
    procedimiento_id bigint NOT NULL,
    personal_id bigint NOT NULL,
    rol_procedimiento character varying(100),
    es_responsable boolean DEFAULT false,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.personal_procedimiento OWNER TO postgres;

--
-- TOC entry 448 (class 1259 OID 18864)
-- Name: personal_procedimiento_personal_procedimiento_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.personal_procedimiento_personal_procedimiento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.personal_procedimiento_personal_procedimiento_id_seq OWNER TO postgres;

--
-- TOC entry 8534 (class 0 OID 0)
-- Dependencies: 448
-- Name: personal_procedimiento_personal_procedimiento_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.personal_procedimiento_personal_procedimiento_id_seq OWNED BY medico.personal_procedimiento.personal_procedimiento_id;


--
-- TOC entry 555 (class 1259 OID 20870)
-- Name: plan_mejora_auditoria; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.plan_mejora_auditoria (
    plan_mejora_id bigint NOT NULL,
    auditoria_hc_id bigint NOT NULL,
    criterio_id bigint,
    problema_identificado text NOT NULL,
    accion_correctiva text NOT NULL,
    responsable_id bigint,
    fecha_limite date,
    fecha_verificacion date,
    estado_implementacion character varying(50) DEFAULT 'pendiente'::character varying,
    observaciones_seguimiento text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.plan_mejora_auditoria OWNER TO postgres;

--
-- TOC entry 554 (class 1259 OID 20869)
-- Name: plan_mejora_auditoria_plan_mejora_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.plan_mejora_auditoria_plan_mejora_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.plan_mejora_auditoria_plan_mejora_id_seq OWNER TO postgres;

--
-- TOC entry 8535 (class 0 OID 0)
-- Dependencies: 554
-- Name: plan_mejora_auditoria_plan_mejora_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.plan_mejora_auditoria_plan_mejora_id_seq OWNED BY medico.plan_mejora_auditoria.plan_mejora_id;


--
-- TOC entry 539 (class 1259 OID 20612)
-- Name: presupuesto; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.presupuesto (
    presupuesto_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    "año" integer NOT NULL,
    categoria_balance_id bigint,
    subcategoria_balance_id bigint,
    monto_anual numeric(15,2) NOT NULL,
    enero numeric(15,2),
    febrero numeric(15,2),
    marzo numeric(15,2),
    abril numeric(15,2),
    mayo numeric(15,2),
    junio numeric(15,2),
    julio numeric(15,2),
    agosto numeric(15,2),
    septiembre numeric(15,2),
    octubre numeric(15,2),
    noviembre numeric(15,2),
    diciembre numeric(15,2),
    observaciones text,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.presupuesto OWNER TO postgres;

--
-- TOC entry 538 (class 1259 OID 20611)
-- Name: presupuesto_presupuesto_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.presupuesto_presupuesto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.presupuesto_presupuesto_id_seq OWNER TO postgres;

--
-- TOC entry 8536 (class 0 OID 0)
-- Dependencies: 538
-- Name: presupuesto_presupuesto_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.presupuesto_presupuesto_id_seq OWNED BY medico.presupuesto.presupuesto_id;


--
-- TOC entry 319 (class 1259 OID 17167)
-- Name: prioridad_solicitud; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.prioridad_solicitud (
    prioridad_solicitud_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    tiempo_max_respuesta_horas integer,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.prioridad_solicitud OWNER TO postgres;

--
-- TOC entry 318 (class 1259 OID 17166)
-- Name: prioridad_solicitud_prioridad_solicitud_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.prioridad_solicitud_prioridad_solicitud_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.prioridad_solicitud_prioridad_solicitud_id_seq OWNER TO postgres;

--
-- TOC entry 8537 (class 0 OID 0)
-- Dependencies: 318
-- Name: prioridad_solicitud_prioridad_solicitud_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.prioridad_solicitud_prioridad_solicitud_id_seq OWNED BY medico.prioridad_solicitud.prioridad_solicitud_id;


--
-- TOC entry 283 (class 1259 OID 16894)
-- Name: prioridad_triaje; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.prioridad_triaje (
    prioridad_triaje_id bigint NOT NULL,
    codigo character varying(5) NOT NULL,
    nivel character varying(10) NOT NULL,
    nombre character varying(100) NOT NULL,
    color_hex character varying(7),
    tiempo_max_atencion_minutos integer,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.prioridad_triaje OWNER TO postgres;

--
-- TOC entry 282 (class 1259 OID 16893)
-- Name: prioridad_triaje_prioridad_triaje_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.prioridad_triaje_prioridad_triaje_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.prioridad_triaje_prioridad_triaje_id_seq OWNER TO postgres;

--
-- TOC entry 8538 (class 0 OID 0)
-- Dependencies: 282
-- Name: prioridad_triaje_prioridad_triaje_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.prioridad_triaje_prioridad_triaje_id_seq OWNED BY medico.prioridad_triaje.prioridad_triaje_id;


--
-- TOC entry 447 (class 1259 OID 18835)
-- Name: procedimiento_realizado; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.procedimiento_realizado (
    procedimiento_id bigint NOT NULL,
    tipo_procedimiento_id bigint,
    atencion_id bigint,
    episodio_id bigint,
    fecha_hora_inicio timestamp without time zone NOT NULL,
    fecha_hora_fin timestamp without time zone,
    duracion_minutos integer,
    lugar_realizacion character varying(200),
    descripcion_procedimiento text,
    tecnica_utilizada text,
    hallazgos text,
    complicaciones text,
    consentimiento_id bigint,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.procedimiento_realizado OWNER TO postgres;

--
-- TOC entry 446 (class 1259 OID 18834)
-- Name: procedimiento_realizado_procedimiento_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.procedimiento_realizado_procedimiento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.procedimiento_realizado_procedimiento_id_seq OWNER TO postgres;

--
-- TOC entry 8539 (class 0 OID 0)
-- Dependencies: 446
-- Name: procedimiento_realizado_procedimiento_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.procedimiento_realizado_procedimiento_id_seq OWNED BY medico.procedimiento_realizado.procedimiento_id;


--
-- TOC entry 469 (class 1259 OID 19280)
-- Name: producto; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.producto (
    producto_id bigint NOT NULL,
    categoria_id bigint,
    codigo character varying(50) NOT NULL,
    codigo_digemid character varying(50),
    codigo_barra character varying(50),
    nombre_generico character varying(300) NOT NULL,
    nombre_comercial character varying(300),
    presentacion character varying(200),
    concentracion character varying(200),
    forma_farmaceutica_id bigint,
    laboratorio character varying(200),
    unidad_medida_farmacia_id bigint,
    principio_activo character varying(500),
    requiere_receta boolean DEFAULT false,
    es_controlado boolean DEFAULT false,
    es_refrigerado boolean DEFAULT false,
    stock_minimo numeric(12,2),
    stock_maximo numeric(12,2),
    precio_compra_referencial numeric(12,2),
    precio_venta_base numeric(12,2),
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.producto OWNER TO postgres;

--
-- TOC entry 468 (class 1259 OID 19279)
-- Name: producto_producto_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.producto_producto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.producto_producto_id_seq OWNER TO postgres;

--
-- TOC entry 8540 (class 0 OID 0)
-- Dependencies: 468
-- Name: producto_producto_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.producto_producto_id_seq OWNED BY medico.producto.producto_id;


--
-- TOC entry 465 (class 1259 OID 19212)
-- Name: proveedor; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.proveedor (
    proveedor_id bigint NOT NULL,
    tipo_documento_id bigint,
    numero_documento character varying(20) NOT NULL,
    razon_social character varying(300) NOT NULL,
    nombre_comercial character varying(300),
    contacto character varying(200),
    telefono character varying(20),
    email character varying(200),
    direccion text,
    ubigeo_id bigint,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.proveedor OWNER TO postgres;

--
-- TOC entry 464 (class 1259 OID 19211)
-- Name: proveedor_proveedor_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.proveedor_proveedor_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.proveedor_proveedor_id_seq OWNER TO postgres;

--
-- TOC entry 8541 (class 0 OID 0)
-- Dependencies: 464
-- Name: proveedor_proveedor_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.proveedor_proveedor_id_seq OWNED BY medico.proveedor.proveedor_id;


--
-- TOC entry 477 (class 1259 OID 19432)
-- Name: receta; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.receta (
    receta_id bigint NOT NULL,
    atencion_id bigint NOT NULL,
    episodio_id bigint,
    paciente_id bigint NOT NULL,
    personal_id bigint NOT NULL,
    numero_receta character varying(50) NOT NULL,
    fecha_emision timestamp without time zone DEFAULT now() NOT NULL,
    indicaciones_generales text,
    estado_receta_id bigint,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.receta OWNER TO postgres;

--
-- TOC entry 476 (class 1259 OID 19431)
-- Name: receta_receta_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.receta_receta_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.receta_receta_id_seq OWNER TO postgres;

--
-- TOC entry 8542 (class 0 OID 0)
-- Dependencies: 476
-- Name: receta_receta_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.receta_receta_id_seq OWNED BY medico.receta.receta_id;


--
-- TOC entry 587 (class 1259 OID 21345)
-- Name: recurso_fhir; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.recurso_fhir (
    recurso_fhir_id bigint NOT NULL,
    tipo_recurso_id bigint,
    identificador_fhir character varying(255) NOT NULL,
    version_recurso character varying(50),
    tabla_origen character varying(100),
    entidad_id bigint,
    contenido_json jsonb,
    contenido_xml text,
    fecha_creacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_actualizacion timestamp without time zone,
    hash_contenido character varying(64),
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion_auditoria timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion_auditoria timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.recurso_fhir OWNER TO postgres;

--
-- TOC entry 586 (class 1259 OID 21344)
-- Name: recurso_fhir_recurso_fhir_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.recurso_fhir_recurso_fhir_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.recurso_fhir_recurso_fhir_id_seq OWNER TO postgres;

--
-- TOC entry 8543 (class 0 OID 0)
-- Dependencies: 586
-- Name: recurso_fhir_recurso_fhir_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.recurso_fhir_recurso_fhir_id_seq OWNED BY medico.recurso_fhir.recurso_fhir_id;


--
-- TOC entry 429 (class 1259 OID 18491)
-- Name: registro_signos_vitales; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.registro_signos_vitales (
    registro_signos_id bigint NOT NULL,
    tipo_registro_id bigint,
    atencion_id bigint,
    episodio_id bigint,
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    personal_registra_id bigint,
    peso_kg numeric(6,2),
    talla_cm numeric(6,2),
    imc numeric(5,2),
    temperatura_c numeric(4,2),
    temperatura_via character varying(50),
    presion_arterial_sistolica integer,
    presion_arterial_diastolica integer,
    presion_arterial_media integer,
    presion_arterial_posicion character varying(50),
    frecuencia_cardiaca integer,
    frecuencia_respiratoria integer,
    saturacion_oxigeno integer,
    fio2_porcentaje integer,
    perimetro_abdominal_cm numeric(6,2),
    perimetro_cefalico_cm numeric(6,2),
    perimetro_toracico_cm numeric(6,2),
    glasgow_total integer,
    glasgow_ocular integer,
    glasgow_verbal integer,
    glasgow_motor integer,
    escala_dolor integer,
    tipo_dolor character varying(100),
    localizacion_dolor text,
    nivel_conciencia character varying(50),
    pupilas character varying(100),
    apgar_1min integer,
    apgar_5min integer,
    silverman_anderson integer,
    presion_venosa_central integer,
    presion_capilar_pulmonar integer,
    gasto_cardiaco numeric(6,2),
    diuresis_ml numeric(8,2),
    balance_hidrico numeric(8,2),
    via_aerea character varying(100),
    ventilacion_mecanica boolean DEFAULT false,
    parametros_ventilador_json jsonb,
    dispositivos_invasivos_json jsonb,
    observaciones text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.registro_signos_vitales OWNER TO postgres;

--
-- TOC entry 8544 (class 0 OID 0)
-- Dependencies: 429
-- Name: TABLE registro_signos_vitales; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON TABLE medico.registro_signos_vitales IS 'Signos vitales reutilizables en diferentes contextos';


--
-- TOC entry 428 (class 1259 OID 18490)
-- Name: registro_signos_vitales_registro_signos_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.registro_signos_vitales_registro_signos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.registro_signos_vitales_registro_signos_id_seq OWNER TO postgres;

--
-- TOC entry 8545 (class 0 OID 0)
-- Dependencies: 428
-- Name: registro_signos_vitales_registro_signos_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.registro_signos_vitales_registro_signos_id_seq OWNED BY medico.registro_signos_vitales.registro_signos_id;


--
-- TOC entry 557 (class 1259 OID 20903)
-- Name: reporte_configuracion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.reporte_configuracion (
    reporte_id bigint NOT NULL,
    categoria_reporte_id bigint,
    codigo character varying(50) NOT NULL,
    nombre character varying(300) NOT NULL,
    descripcion text,
    query_sql text,
    parametros_json jsonb,
    formato_salida character varying(50),
    requiere_autorizacion boolean DEFAULT false,
    nivel_confidencialidad character varying(50),
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.reporte_configuracion OWNER TO postgres;

--
-- TOC entry 556 (class 1259 OID 20902)
-- Name: reporte_configuracion_reporte_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.reporte_configuracion_reporte_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.reporte_configuracion_reporte_id_seq OWNER TO postgres;

--
-- TOC entry 8546 (class 0 OID 0)
-- Dependencies: 556
-- Name: reporte_configuracion_reporte_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.reporte_configuracion_reporte_id_seq OWNED BY medico.reporte_configuracion.reporte_id;


--
-- TOC entry 559 (class 1259 OID 20928)
-- Name: reporte_parametro; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.reporte_parametro (
    reporte_parametro_id bigint NOT NULL,
    reporte_id bigint NOT NULL,
    nombre_parametro character varying(100) NOT NULL,
    tipo_dato character varying(50) NOT NULL,
    es_obligatorio boolean DEFAULT false,
    valor_default text,
    opciones_json jsonb,
    orden integer,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.reporte_parametro OWNER TO postgres;

--
-- TOC entry 558 (class 1259 OID 20927)
-- Name: reporte_parametro_reporte_parametro_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.reporte_parametro_reporte_parametro_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.reporte_parametro_reporte_parametro_id_seq OWNER TO postgres;

--
-- TOC entry 8547 (class 0 OID 0)
-- Dependencies: 558
-- Name: reporte_parametro_reporte_parametro_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.reporte_parametro_reporte_parametro_id_seq OWNED BY medico.reporte_parametro.reporte_parametro_id;


--
-- TOC entry 561 (class 1259 OID 20951)
-- Name: reporte_rol; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.reporte_rol (
    reporte_rol_id bigint NOT NULL,
    reporte_id bigint NOT NULL,
    rol_id bigint NOT NULL,
    puede_ejecutar boolean DEFAULT true,
    puede_programar boolean DEFAULT false,
    puede_exportar boolean DEFAULT true,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.reporte_rol OWNER TO postgres;

--
-- TOC entry 560 (class 1259 OID 20950)
-- Name: reporte_rol_reporte_rol_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.reporte_rol_reporte_rol_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.reporte_rol_reporte_rol_id_seq OWNER TO postgres;

--
-- TOC entry 8548 (class 0 OID 0)
-- Dependencies: 560
-- Name: reporte_rol_reporte_rol_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.reporte_rol_reporte_rol_id_seq OWNED BY medico.reporte_rol.reporte_rol_id;


--
-- TOC entry 499 (class 1259 OID 19851)
-- Name: resultado_laboratorio; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.resultado_laboratorio (
    resultado_lab_id bigint NOT NULL,
    examen_lab_id bigint NOT NULL,
    fecha_hora_resultado timestamp without time zone DEFAULT now() NOT NULL,
    conclusiones text,
    recomendaciones text,
    personal_valida_id bigint,
    estado_resultado_id bigint,
    fecha_hora_entrega timestamp without time zone,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.resultado_laboratorio OWNER TO postgres;

--
-- TOC entry 498 (class 1259 OID 19850)
-- Name: resultado_laboratorio_resultado_lab_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.resultado_laboratorio_resultado_lab_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.resultado_laboratorio_resultado_lab_id_seq OWNER TO postgres;

--
-- TOC entry 8549 (class 0 OID 0)
-- Dependencies: 498
-- Name: resultado_laboratorio_resultado_lab_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.resultado_laboratorio_resultado_lab_id_seq OWNED BY medico.resultado_laboratorio.resultado_lab_id;


--
-- TOC entry 497 (class 1259 OID 19823)
-- Name: resultado_parametro; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.resultado_parametro (
    resultado_parametro_id bigint NOT NULL,
    examen_lab_id bigint NOT NULL,
    parametro_id bigint NOT NULL,
    valor_numerico numeric(12,4),
    valor_texto text,
    es_anormal boolean DEFAULT false,
    es_critico boolean DEFAULT false,
    observaciones text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.resultado_parametro OWNER TO postgres;

--
-- TOC entry 496 (class 1259 OID 19822)
-- Name: resultado_parametro_resultado_parametro_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.resultado_parametro_resultado_parametro_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.resultado_parametro_resultado_parametro_id_seq OWNER TO postgres;

--
-- TOC entry 8550 (class 0 OID 0)
-- Dependencies: 496
-- Name: resultado_parametro_resultado_parametro_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.resultado_parametro_resultado_parametro_id_seq OWNED BY medico.resultado_parametro.resultado_parametro_id;


--
-- TOC entry 403 (class 1259 OID 17994)
-- Name: rol; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.rol (
    rol_id bigint NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.rol OWNER TO postgres;

--
-- TOC entry 407 (class 1259 OID 18026)
-- Name: rol_permiso; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.rol_permiso (
    rol_permiso_id bigint NOT NULL,
    rol_id bigint NOT NULL,
    permiso_id bigint NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.rol_permiso OWNER TO postgres;

--
-- TOC entry 406 (class 1259 OID 18025)
-- Name: rol_permiso_rol_permiso_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.rol_permiso_rol_permiso_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.rol_permiso_rol_permiso_id_seq OWNER TO postgres;

--
-- TOC entry 8551 (class 0 OID 0)
-- Dependencies: 406
-- Name: rol_permiso_rol_permiso_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.rol_permiso_rol_permiso_id_seq OWNED BY medico.rol_permiso.rol_permiso_id;


--
-- TOC entry 402 (class 1259 OID 17993)
-- Name: rol_rol_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.rol_rol_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.rol_rol_id_seq OWNER TO postgres;

--
-- TOC entry 8552 (class 0 OID 0)
-- Dependencies: 402
-- Name: rol_rol_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.rol_rol_id_seq OWNED BY medico.rol.rol_id;


--
-- TOC entry 377 (class 1259 OID 17611)
-- Name: sede; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.sede (
    sede_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(200) NOT NULL,
    direccion text,
    ubigeo_id bigint,
    telefono character varying(20),
    email character varying(200),
    responsable_id bigint,
    es_principal boolean DEFAULT false,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.sede OWNER TO postgres;

--
-- TOC entry 8553 (class 0 OID 0)
-- Dependencies: 377
-- Name: TABLE sede; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON TABLE medico.sede IS 'Diferentes locaciones físicas de una organización';


--
-- TOC entry 376 (class 1259 OID 17610)
-- Name: sede_sede_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.sede_sede_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.sede_sede_id_seq OWNER TO postgres;

--
-- TOC entry 8554 (class 0 OID 0)
-- Dependencies: 376
-- Name: sede_sede_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.sede_sede_id_seq OWNED BY medico.sede.sede_id;


--
-- TOC entry 611 (class 1259 OID 21791)
-- Name: seq_numero_atencion; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.seq_numero_atencion
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.seq_numero_atencion OWNER TO postgres;

--
-- TOC entry 618 (class 1259 OID 21798)
-- Name: seq_numero_auditoria; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.seq_numero_auditoria
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.seq_numero_auditoria OWNER TO postgres;

--
-- TOC entry 613 (class 1259 OID 21793)
-- Name: seq_numero_cita; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.seq_numero_cita
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.seq_numero_cita OWNER TO postgres;

--
-- TOC entry 617 (class 1259 OID 21797)
-- Name: seq_numero_comprobante; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.seq_numero_comprobante
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.seq_numero_comprobante OWNER TO postgres;

--
-- TOC entry 612 (class 1259 OID 21792)
-- Name: seq_numero_historia_clinica; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.seq_numero_historia_clinica
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.seq_numero_historia_clinica OWNER TO postgres;

--
-- TOC entry 615 (class 1259 OID 21795)
-- Name: seq_numero_hospitalizacion; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.seq_numero_hospitalizacion
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.seq_numero_hospitalizacion OWNER TO postgres;

--
-- TOC entry 619 (class 1259 OID 21799)
-- Name: seq_numero_interconsulta; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.seq_numero_interconsulta
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.seq_numero_interconsulta OWNER TO postgres;

--
-- TOC entry 614 (class 1259 OID 21794)
-- Name: seq_numero_receta; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.seq_numero_receta
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.seq_numero_receta OWNER TO postgres;

--
-- TOC entry 616 (class 1259 OID 21796)
-- Name: seq_numero_solicitud_examen; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.seq_numero_solicitud_examen
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.seq_numero_solicitud_examen OWNER TO postgres;

--
-- TOC entry 413 (class 1259 OID 18104)
-- Name: servicio_medico; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.servicio_medico (
    servicio_id bigint NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(300) NOT NULL,
    tipo_servicio_id bigint,
    especialidad_id bigint,
    duracion_minutos integer,
    precio_base numeric(12,2),
    descripcion text,
    unidad_medida_id bigint,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.servicio_medico OWNER TO postgres;

--
-- TOC entry 412 (class 1259 OID 18103)
-- Name: servicio_medico_servicio_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.servicio_medico_servicio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.servicio_medico_servicio_id_seq OWNER TO postgres;

--
-- TOC entry 8555 (class 0 OID 0)
-- Dependencies: 412
-- Name: servicio_medico_servicio_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.servicio_medico_servicio_id_seq OWNED BY medico.servicio_medico.servicio_id;


--
-- TOC entry 225 (class 1259 OID 16473)
-- Name: sexo; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.sexo (
    sexo_id bigint NOT NULL,
    codigo character varying(2) NOT NULL,
    nombre character varying(50) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.sexo OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16472)
-- Name: sexo_sexo_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.sexo_sexo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.sexo_sexo_id_seq OWNER TO postgres;

--
-- TOC entry 8556 (class 0 OID 0)
-- Dependencies: 224
-- Name: sexo_sexo_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.sexo_sexo_id_seq OWNED BY medico.sexo.sexo_id;


--
-- TOC entry 589 (class 1259 OID 21370)
-- Name: sincronizacion_fhir; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.sincronizacion_fhir (
    sincronizacion_id bigint NOT NULL,
    recurso_fhir_id bigint NOT NULL,
    sistema_externo_id bigint NOT NULL,
    tipo_operacion character varying(50) NOT NULL,
    direccion character varying(50) NOT NULL,
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    request_json jsonb,
    response_json jsonb,
    codigo_http integer,
    exitoso boolean DEFAULT false,
    mensaje_error text,
    tiempo_respuesta_ms integer,
    intentos integer DEFAULT 1,
    proximo_reintento timestamp without time zone,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.sincronizacion_fhir OWNER TO postgres;

--
-- TOC entry 588 (class 1259 OID 21369)
-- Name: sincronizacion_fhir_sincronizacion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.sincronizacion_fhir_sincronizacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.sincronizacion_fhir_sincronizacion_id_seq OWNER TO postgres;

--
-- TOC entry 8557 (class 0 OID 0)
-- Dependencies: 588
-- Name: sincronizacion_fhir_sincronizacion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.sincronizacion_fhir_sincronizacion_id_seq OWNED BY medico.sincronizacion_fhir.sincronizacion_id;


--
-- TOC entry 273 (class 1259 OID 16823)
-- Name: sistema_corporal; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.sistema_corporal (
    sistema_corporal_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    orden integer,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.sistema_corporal OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 16822)
-- Name: sistema_corporal_sistema_corporal_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.sistema_corporal_sistema_corporal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.sistema_corporal_sistema_corporal_id_seq OWNER TO postgres;

--
-- TOC entry 8558 (class 0 OID 0)
-- Dependencies: 272
-- Name: sistema_corporal_sistema_corporal_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.sistema_corporal_sistema_corporal_id_seq OWNED BY medico.sistema_corporal.sistema_corporal_id;


--
-- TOC entry 585 (class 1259 OID 21324)
-- Name: sistema_externo; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.sistema_externo (
    sistema_externo_id bigint NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(300) NOT NULL,
    tipo_sistema character varying(100),
    url_base text,
    version_api character varying(50),
    metodo_autenticacion character varying(100),
    credenciales_json jsonb,
    timeout_segundos integer DEFAULT 30,
    reintentos_max integer DEFAULT 3,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.sistema_externo OWNER TO postgres;

--
-- TOC entry 584 (class 1259 OID 21323)
-- Name: sistema_externo_sistema_externo_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.sistema_externo_sistema_externo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.sistema_externo_sistema_externo_id_seq OWNER TO postgres;

--
-- TOC entry 8559 (class 0 OID 0)
-- Dependencies: 584
-- Name: sistema_externo_sistema_externo_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.sistema_externo_sistema_externo_id_seq OWNED BY medico.sistema_externo.sistema_externo_id;


--
-- TOC entry 487 (class 1259 OID 19625)
-- Name: solicitud_examen; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.solicitud_examen (
    solicitud_id bigint NOT NULL,
    atencion_id bigint NOT NULL,
    episodio_id bigint,
    organizacion_id bigint NOT NULL,
    numero_solicitud character varying(50) NOT NULL,
    fecha_solicitud timestamp without time zone DEFAULT now() NOT NULL,
    personal_solicita_id bigint NOT NULL,
    indicaciones_clinicas text,
    prioridad_solicitud_id bigint,
    estado_solicitud_id bigint,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.solicitud_examen OWNER TO postgres;

--
-- TOC entry 486 (class 1259 OID 19624)
-- Name: solicitud_examen_solicitud_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.solicitud_examen_solicitud_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.solicitud_examen_solicitud_id_seq OWNER TO postgres;

--
-- TOC entry 8560 (class 0 OID 0)
-- Dependencies: 486
-- Name: solicitud_examen_solicitud_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.solicitud_examen_solicitud_id_seq OWNED BY medico.solicitud_examen.solicitud_id;


--
-- TOC entry 355 (class 1259 OID 17429)
-- Name: subcategoria_balance; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.subcategoria_balance (
    subcategoria_balance_id bigint NOT NULL,
    categoria_balance_id bigint,
    codigo character varying(20) NOT NULL,
    nombre character varying(200) NOT NULL,
    orden integer,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.subcategoria_balance OWNER TO postgres;

--
-- TOC entry 354 (class 1259 OID 17428)
-- Name: subcategoria_balance_subcategoria_balance_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.subcategoria_balance_subcategoria_balance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.subcategoria_balance_subcategoria_balance_id_seq OWNER TO postgres;

--
-- TOC entry 8561 (class 0 OID 0)
-- Dependencies: 354
-- Name: subcategoria_balance_subcategoria_balance_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.subcategoria_balance_subcategoria_balance_id_seq OWNED BY medico.subcategoria_balance.subcategoria_balance_id;


--
-- TOC entry 549 (class 1259 OID 20764)
-- Name: subcriterio_auditoria; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.subcriterio_auditoria (
    subcriterio_id bigint NOT NULL,
    criterio_id bigint NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(300) NOT NULL,
    descripcion text,
    peso_porcentual numeric(5,2),
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.subcriterio_auditoria OWNER TO postgres;

--
-- TOC entry 548 (class 1259 OID 20763)
-- Name: subcriterio_auditoria_subcriterio_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.subcriterio_auditoria_subcriterio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.subcriterio_auditoria_subcriterio_id_seq OWNER TO postgres;

--
-- TOC entry 8562 (class 0 OID 0)
-- Dependencies: 548
-- Name: subcriterio_auditoria_subcriterio_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.subcriterio_auditoria_subcriterio_id_seq OWNED BY medico.subcriterio_auditoria.subcriterio_id;


--
-- TOC entry 577 (class 1259 OID 21153)
-- Name: sugerencia_ia; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.sugerencia_ia (
    sugerencia_ia_id bigint NOT NULL,
    modelo_id bigint NOT NULL,
    tipo_sugerencia_id bigint,
    atencion_id bigint,
    paciente_id bigint,
    receta_id bigint,
    solicitud_examen_id bigint,
    examen_imagen_id bigint,
    producto_id bigint,
    contenido_json jsonb NOT NULL,
    explicacion_texto text,
    confianza_porcentaje numeric(5,2) NOT NULL,
    prioridad character varying(50),
    fecha_hora_generacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_hora_revision timestamp without time zone,
    fue_aceptada boolean,
    fue_rechazada boolean,
    motivo_rechazo text,
    personal_revisa_id bigint,
    feedback_usuario text,
    tiempo_respuesta_ms integer,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.sugerencia_ia OWNER TO postgres;

--
-- TOC entry 576 (class 1259 OID 21152)
-- Name: sugerencia_ia_sugerencia_ia_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.sugerencia_ia_sugerencia_ia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.sugerencia_ia_sugerencia_ia_id_seq OWNER TO postgres;

--
-- TOC entry 8563 (class 0 OID 0)
-- Dependencies: 576
-- Name: sugerencia_ia_sugerencia_ia_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.sugerencia_ia_sugerencia_ia_id_seq OWNED BY medico.sugerencia_ia.sugerencia_ia_id;


--
-- TOC entry 297 (class 1259 OID 16995)
-- Name: tipo_almacen; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_almacen (
    tipo_almacen_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_almacen OWNER TO postgres;

--
-- TOC entry 296 (class 1259 OID 16994)
-- Name: tipo_almacen_tipo_almacen_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_almacen_tipo_almacen_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_almacen_tipo_almacen_id_seq OWNER TO postgres;

--
-- TOC entry 8564 (class 0 OID 0)
-- Dependencies: 296
-- Name: tipo_almacen_tipo_almacen_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_almacen_tipo_almacen_id_seq OWNED BY medico.tipo_almacen.tipo_almacen_id;


--
-- TOC entry 289 (class 1259 OID 16937)
-- Name: tipo_alta; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_alta (
    tipo_alta_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_alta OWNER TO postgres;

--
-- TOC entry 288 (class 1259 OID 16936)
-- Name: tipo_alta_tipo_alta_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_alta_tipo_alta_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_alta_tipo_alta_id_seq OWNER TO postgres;

--
-- TOC entry 8565 (class 0 OID 0)
-- Dependencies: 288
-- Name: tipo_alta_tipo_alta_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_alta_tipo_alta_id_seq OWNED BY medico.tipo_alta.tipo_alta_id;


--
-- TOC entry 241 (class 1259 OID 16589)
-- Name: tipo_aseguradora; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_aseguradora (
    tipo_aseguradora_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_aseguradora OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 16588)
-- Name: tipo_aseguradora_tipo_aseguradora_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_aseguradora_tipo_aseguradora_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_aseguradora_tipo_aseguradora_id_seq OWNER TO postgres;

--
-- TOC entry 8566 (class 0 OID 0)
-- Dependencies: 240
-- Name: tipo_aseguradora_tipo_aseguradora_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_aseguradora_tipo_aseguradora_id_seq OWNED BY medico.tipo_aseguradora.tipo_aseguradora_id;


--
-- TOC entry 257 (class 1259 OID 16708)
-- Name: tipo_atencion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_atencion (
    tipo_atencion_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_atencion OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 16707)
-- Name: tipo_atencion_tipo_atencion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_atencion_tipo_atencion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_atencion_tipo_atencion_id_seq OWNER TO postgres;

--
-- TOC entry 8567 (class 0 OID 0)
-- Dependencies: 256
-- Name: tipo_atencion_tipo_atencion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_atencion_tipo_atencion_id_seq OWNED BY medico.tipo_atencion.tipo_atencion_id;


--
-- TOC entry 359 (class 1259 OID 17459)
-- Name: tipo_auditoria; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_auditoria (
    tipo_auditoria_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_auditoria OWNER TO postgres;

--
-- TOC entry 358 (class 1259 OID 17458)
-- Name: tipo_auditoria_tipo_auditoria_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_auditoria_tipo_auditoria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_auditoria_tipo_auditoria_id_seq OWNER TO postgres;

--
-- TOC entry 8568 (class 0 OID 0)
-- Dependencies: 358
-- Name: tipo_auditoria_tipo_auditoria_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_auditoria_tipo_auditoria_id_seq OWNED BY medico.tipo_auditoria.tipo_auditoria_id;


--
-- TOC entry 351 (class 1259 OID 17395)
-- Name: tipo_balance; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_balance (
    tipo_balance_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    periodicidad_meses integer,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_balance OWNER TO postgres;

--
-- TOC entry 350 (class 1259 OID 17394)
-- Name: tipo_balance_tipo_balance_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_balance_tipo_balance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_balance_tipo_balance_id_seq OWNER TO postgres;

--
-- TOC entry 8569 (class 0 OID 0)
-- Dependencies: 350
-- Name: tipo_balance_tipo_balance_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_balance_tipo_balance_id_seq OWNED BY medico.tipo_balance.tipo_balance_id;


--
-- TOC entry 341 (class 1259 OID 17322)
-- Name: tipo_caja; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_caja (
    tipo_caja_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_caja OWNER TO postgres;

--
-- TOC entry 340 (class 1259 OID 17321)
-- Name: tipo_caja_tipo_caja_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_caja_tipo_caja_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_caja_tipo_caja_id_seq OWNER TO postgres;

--
-- TOC entry 8570 (class 0 OID 0)
-- Dependencies: 340
-- Name: tipo_caja_tipo_caja_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_caja_tipo_caja_id_seq OWNED BY medico.tipo_caja.tipo_caja_id;


--
-- TOC entry 253 (class 1259 OID 16679)
-- Name: tipo_cama; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_cama (
    tipo_cama_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    nivel_atencion character varying(50),
    requiere_equipamiento_especial boolean DEFAULT false,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_cama OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 16678)
-- Name: tipo_cama_tipo_cama_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_cama_tipo_cama_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_cama_tipo_cama_id_seq OWNER TO postgres;

--
-- TOC entry 8571 (class 0 OID 0)
-- Dependencies: 252
-- Name: tipo_cama_tipo_cama_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_cama_tipo_cama_id_seq OWNED BY medico.tipo_cama.tipo_cama_id;


--
-- TOC entry 265 (class 1259 OID 16764)
-- Name: tipo_cita; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_cita (
    tipo_cita_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    requiere_orden boolean DEFAULT false,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_cita OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 16763)
-- Name: tipo_cita_tipo_cita_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_cita_tipo_cita_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_cita_tipo_cita_id_seq OWNER TO postgres;

--
-- TOC entry 8572 (class 0 OID 0)
-- Dependencies: 264
-- Name: tipo_cita_tipo_cita_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_cita_tipo_cita_id_seq OWNED BY medico.tipo_cita.tipo_cita_id;


--
-- TOC entry 333 (class 1259 OID 17266)
-- Name: tipo_comprobante; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_comprobante (
    tipo_comprobante_id bigint NOT NULL,
    codigo character varying(5) NOT NULL,
    nombre character varying(100) NOT NULL,
    serie_default character varying(10),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_comprobante OWNER TO postgres;

--
-- TOC entry 332 (class 1259 OID 17265)
-- Name: tipo_comprobante_tipo_comprobante_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_comprobante_tipo_comprobante_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_comprobante_tipo_comprobante_id_seq OWNER TO postgres;

--
-- TOC entry 8573 (class 0 OID 0)
-- Dependencies: 332
-- Name: tipo_comprobante_tipo_comprobante_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_comprobante_tipo_comprobante_id_seq OWNED BY medico.tipo_comprobante.tipo_comprobante_id;


--
-- TOC entry 373 (class 1259 OID 17565)
-- Name: tipo_consentimiento; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_consentimiento (
    tipo_consentimiento_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(200) NOT NULL,
    descripcion text,
    contenido_html text,
    requiere_testigo boolean DEFAULT false,
    version_documento character varying(20),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_consentimiento OWNER TO postgres;

--
-- TOC entry 372 (class 1259 OID 17564)
-- Name: tipo_consentimiento_tipo_consentimiento_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_consentimiento_tipo_consentimiento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_consentimiento_tipo_consentimiento_id_seq OWNER TO postgres;

--
-- TOC entry 8574 (class 0 OID 0)
-- Dependencies: 372
-- Name: tipo_consentimiento_tipo_consentimiento_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_consentimiento_tipo_consentimiento_id_seq OWNED BY medico.tipo_consentimiento.tipo_consentimiento_id;


--
-- TOC entry 249 (class 1259 OID 16651)
-- Name: tipo_consultorio; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_consultorio (
    tipo_consultorio_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_consultorio OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 16650)
-- Name: tipo_consultorio_tipo_consultorio_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_consultorio_tipo_consultorio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_consultorio_tipo_consultorio_id_seq OWNER TO postgres;

--
-- TOC entry 8575 (class 0 OID 0)
-- Dependencies: 248
-- Name: tipo_consultorio_tipo_consultorio_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_consultorio_tipo_consultorio_id_seq OWNED BY medico.tipo_consultorio.tipo_consultorio_id;


--
-- TOC entry 279 (class 1259 OID 16866)
-- Name: tipo_diagnostico; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_diagnostico (
    tipo_diagnostico_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_diagnostico OWNER TO postgres;

--
-- TOC entry 278 (class 1259 OID 16865)
-- Name: tipo_diagnostico_tipo_diagnostico_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_diagnostico_tipo_diagnostico_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_diagnostico_tipo_diagnostico_id_seq OWNER TO postgres;

--
-- TOC entry 8576 (class 0 OID 0)
-- Dependencies: 278
-- Name: tipo_diagnostico_tipo_diagnostico_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_diagnostico_tipo_diagnostico_id_seq OWNED BY medico.tipo_diagnostico.tipo_diagnostico_id;


--
-- TOC entry 223 (class 1259 OID 16459)
-- Name: tipo_documento; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_documento (
    tipo_documento_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    longitud integer,
    validacion_regex character varying(200),
    orden integer,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_documento OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16458)
-- Name: tipo_documento_tipo_documento_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_documento_tipo_documento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_documento_tipo_documento_id_seq OWNER TO postgres;

--
-- TOC entry 8577 (class 0 OID 0)
-- Dependencies: 222
-- Name: tipo_documento_tipo_documento_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_documento_tipo_documento_id_seq OWNED BY medico.tipo_documento.tipo_documento_id;


--
-- TOC entry 261 (class 1259 OID 16736)
-- Name: tipo_episodio; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_episodio (
    tipo_episodio_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_episodio OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 16735)
-- Name: tipo_episodio_tipo_episodio_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_episodio_tipo_episodio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_episodio_tipo_episodio_id_seq OWNER TO postgres;

--
-- TOC entry 8578 (class 0 OID 0)
-- Dependencies: 260
-- Name: tipo_episodio_tipo_episodio_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_episodio_tipo_episodio_id_seq OWNED BY medico.tipo_episodio.tipo_episodio_id;


--
-- TOC entry 325 (class 1259 OID 17210)
-- Name: tipo_equipo_laboratorio; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_equipo_laboratorio (
    tipo_equipo_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    marca character varying(100),
    modelo character varying(100),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_equipo_laboratorio OWNER TO postgres;

--
-- TOC entry 324 (class 1259 OID 17209)
-- Name: tipo_equipo_laboratorio_tipo_equipo_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_equipo_laboratorio_tipo_equipo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_equipo_laboratorio_tipo_equipo_id_seq OWNER TO postgres;

--
-- TOC entry 8579 (class 0 OID 0)
-- Dependencies: 324
-- Name: tipo_equipo_laboratorio_tipo_equipo_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_equipo_laboratorio_tipo_equipo_id_seq OWNED BY medico.tipo_equipo_laboratorio.tipo_equipo_id;


--
-- TOC entry 275 (class 1259 OID 16837)
-- Name: tipo_evolucion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_evolucion (
    tipo_evolucion_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    requiere_profesional_especializado boolean DEFAULT false,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_evolucion OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 16836)
-- Name: tipo_evolucion_tipo_evolucion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_evolucion_tipo_evolucion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_evolucion_tipo_evolucion_id_seq OWNER TO postgres;

--
-- TOC entry 8580 (class 0 OID 0)
-- Dependencies: 274
-- Name: tipo_evolucion_tipo_evolucion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_evolucion_tipo_evolucion_id_seq OWNED BY medico.tipo_evolucion.tipo_evolucion_id;


--
-- TOC entry 485 (class 1259 OID 19594)
-- Name: tipo_examen; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_examen (
    tipo_examen_id bigint NOT NULL,
    categoria_examen_id bigint,
    area_examen_id bigint,
    codigo character varying(50) NOT NULL,
    nombre character varying(300) NOT NULL,
    descripcion text,
    precio numeric(12,2),
    tiempo_resultado_horas integer,
    requiere_preparacion boolean DEFAULT false,
    indicaciones_preparacion text,
    requiere_consentimiento boolean DEFAULT false,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.tipo_examen OWNER TO postgres;

--
-- TOC entry 271 (class 1259 OID 16809)
-- Name: tipo_examen_fisico; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_examen_fisico (
    tipo_examen_fisico_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_examen_fisico OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 16808)
-- Name: tipo_examen_fisico_tipo_examen_fisico_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_examen_fisico_tipo_examen_fisico_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_examen_fisico_tipo_examen_fisico_id_seq OWNER TO postgres;

--
-- TOC entry 8581 (class 0 OID 0)
-- Dependencies: 270
-- Name: tipo_examen_fisico_tipo_examen_fisico_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_examen_fisico_tipo_examen_fisico_id_seq OWNED BY medico.tipo_examen_fisico.tipo_examen_fisico_id;


--
-- TOC entry 484 (class 1259 OID 19593)
-- Name: tipo_examen_tipo_examen_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_examen_tipo_examen_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_examen_tipo_examen_id_seq OWNER TO postgres;

--
-- TOC entry 8582 (class 0 OID 0)
-- Dependencies: 484
-- Name: tipo_examen_tipo_examen_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_examen_tipo_examen_id_seq OWNED BY medico.tipo_examen.tipo_examen_id;


--
-- TOC entry 301 (class 1259 OID 17029)
-- Name: tipo_forma_farmaceutica; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_forma_farmaceutica (
    forma_farmaceutica_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_forma_farmaceutica OWNER TO postgres;

--
-- TOC entry 300 (class 1259 OID 17028)
-- Name: tipo_forma_farmaceutica_forma_farmaceutica_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_forma_farmaceutica_forma_farmaceutica_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_forma_farmaceutica_forma_farmaceutica_id_seq OWNER TO postgres;

--
-- TOC entry 8583 (class 0 OID 0)
-- Dependencies: 300
-- Name: tipo_forma_farmaceutica_forma_farmaceutica_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_forma_farmaceutica_forma_farmaceutica_id_seq OWNED BY medico.tipo_forma_farmaceutica.forma_farmaceutica_id;


--
-- TOC entry 331 (class 1259 OID 17252)
-- Name: tipo_formato_imagen; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_formato_imagen (
    tipo_formato_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    extension character varying(10),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_formato_imagen OWNER TO postgres;

--
-- TOC entry 330 (class 1259 OID 17251)
-- Name: tipo_formato_imagen_tipo_formato_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_formato_imagen_tipo_formato_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_formato_imagen_tipo_formato_id_seq OWNER TO postgres;

--
-- TOC entry 8584 (class 0 OID 0)
-- Dependencies: 330
-- Name: tipo_formato_imagen_tipo_formato_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_formato_imagen_tipo_formato_id_seq OWNED BY medico.tipo_formato_imagen.tipo_formato_id;


--
-- TOC entry 277 (class 1259 OID 16852)
-- Name: tipo_indicacion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_indicacion (
    tipo_indicacion_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_indicacion OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 16851)
-- Name: tipo_indicacion_tipo_indicacion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_indicacion_tipo_indicacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_indicacion_tipo_indicacion_id_seq OWNER TO postgres;

--
-- TOC entry 8585 (class 0 OID 0)
-- Dependencies: 276
-- Name: tipo_indicacion_tipo_indicacion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_indicacion_tipo_indicacion_id_seq OWNED BY medico.tipo_indicacion.tipo_indicacion_id;


--
-- TOC entry 371 (class 1259 OID 17549)
-- Name: tipo_mensaje_hl7; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_mensaje_hl7 (
    tipo_mensaje_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    version_hl7 character varying(20),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_mensaje_hl7 OWNER TO postgres;

--
-- TOC entry 370 (class 1259 OID 17548)
-- Name: tipo_mensaje_hl7_tipo_mensaje_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_mensaje_hl7_tipo_mensaje_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_mensaje_hl7_tipo_mensaje_id_seq OWNER TO postgres;

--
-- TOC entry 8586 (class 0 OID 0)
-- Dependencies: 370
-- Name: tipo_mensaje_hl7_tipo_mensaje_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_mensaje_hl7_tipo_mensaje_id_seq OWNED BY medico.tipo_mensaje_hl7.tipo_mensaje_id;


--
-- TOC entry 365 (class 1259 OID 17503)
-- Name: tipo_modelo_ia; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_modelo_ia (
    tipo_modelo_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_modelo_ia OWNER TO postgres;

--
-- TOC entry 364 (class 1259 OID 17502)
-- Name: tipo_modelo_ia_tipo_modelo_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_modelo_ia_tipo_modelo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_modelo_ia_tipo_modelo_id_seq OWNER TO postgres;

--
-- TOC entry 8587 (class 0 OID 0)
-- Dependencies: 364
-- Name: tipo_modelo_ia_tipo_modelo_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_modelo_ia_tipo_modelo_id_seq OWNED BY medico.tipo_modelo_ia.tipo_modelo_id;


--
-- TOC entry 309 (class 1259 OID 17092)
-- Name: tipo_movimiento_almacen; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_movimiento_almacen (
    tipo_movimiento_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(200) NOT NULL,
    afecta_stock character varying(20),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_movimiento_almacen OWNER TO postgres;

--
-- TOC entry 308 (class 1259 OID 17091)
-- Name: tipo_movimiento_almacen_tipo_movimiento_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_movimiento_almacen_tipo_movimiento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_movimiento_almacen_tipo_movimiento_id_seq OWNER TO postgres;

--
-- TOC entry 8588 (class 0 OID 0)
-- Dependencies: 308
-- Name: tipo_movimiento_almacen_tipo_movimiento_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_movimiento_almacen_tipo_movimiento_id_seq OWNED BY medico.tipo_movimiento_almacen.tipo_movimiento_id;


--
-- TOC entry 323 (class 1259 OID 17195)
-- Name: tipo_muestra; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_muestra (
    tipo_muestra_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    requiere_condiciones_especiales boolean DEFAULT false,
    temperatura_conservacion character varying(50),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_muestra OWNER TO postgres;

--
-- TOC entry 322 (class 1259 OID 17194)
-- Name: tipo_muestra_tipo_muestra_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_muestra_tipo_muestra_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_muestra_tipo_muestra_id_seq OWNER TO postgres;

--
-- TOC entry 8589 (class 0 OID 0)
-- Dependencies: 322
-- Name: tipo_muestra_tipo_muestra_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_muestra_tipo_muestra_id_seq OWNED BY medico.tipo_muestra.tipo_muestra_id;


--
-- TOC entry 237 (class 1259 OID 16559)
-- Name: tipo_organizacion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_organizacion (
    tipo_organizacion_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_organizacion OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16558)
-- Name: tipo_organizacion_tipo_organizacion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_organizacion_tipo_organizacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_organizacion_tipo_organizacion_id_seq OWNER TO postgres;

--
-- TOC entry 8590 (class 0 OID 0)
-- Dependencies: 236
-- Name: tipo_organizacion_tipo_organizacion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_organizacion_tipo_organizacion_id_seq OWNED BY medico.tipo_organizacion.tipo_organizacion_id;


--
-- TOC entry 239 (class 1259 OID 16575)
-- Name: tipo_paciente; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_paciente (
    tipo_paciente_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_paciente OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16574)
-- Name: tipo_paciente_tipo_paciente_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_paciente_tipo_paciente_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_paciente_tipo_paciente_id_seq OWNER TO postgres;

--
-- TOC entry 8591 (class 0 OID 0)
-- Dependencies: 238
-- Name: tipo_paciente_tipo_paciente_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_paciente_tipo_paciente_id_seq OWNED BY medico.tipo_paciente.tipo_paciente_id;


--
-- TOC entry 243 (class 1259 OID 16603)
-- Name: tipo_personal; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_personal (
    tipo_personal_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    requiere_colegiatura boolean DEFAULT false,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_personal OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16602)
-- Name: tipo_personal_tipo_personal_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_personal_tipo_personal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_personal_tipo_personal_id_seq OWNER TO postgres;

--
-- TOC entry 8592 (class 0 OID 0)
-- Dependencies: 242
-- Name: tipo_personal_tipo_personal_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_personal_tipo_personal_id_seq OWNED BY medico.tipo_personal.tipo_personal_id;


--
-- TOC entry 293 (class 1259 OID 16965)
-- Name: tipo_procedimiento; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_procedimiento (
    tipo_procedimiento_id bigint NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(200) NOT NULL,
    categoria character varying(100),
    requiere_consentimiento boolean DEFAULT false,
    requiere_sala_operaciones boolean DEFAULT false,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_procedimiento OWNER TO postgres;

--
-- TOC entry 292 (class 1259 OID 16964)
-- Name: tipo_procedimiento_tipo_procedimiento_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_procedimiento_tipo_procedimiento_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_procedimiento_tipo_procedimiento_id_seq OWNER TO postgres;

--
-- TOC entry 8593 (class 0 OID 0)
-- Dependencies: 292
-- Name: tipo_procedimiento_tipo_procedimiento_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_procedimiento_tipo_procedimiento_id_seq OWNED BY medico.tipo_procedimiento.tipo_procedimiento_id;


--
-- TOC entry 369 (class 1259 OID 17533)
-- Name: tipo_recurso_fhir; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_recurso_fhir (
    tipo_recurso_id bigint NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(100) NOT NULL,
    version_fhir character varying(20),
    url_profile text,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_recurso_fhir OWNER TO postgres;

--
-- TOC entry 368 (class 1259 OID 17532)
-- Name: tipo_recurso_fhir_tipo_recurso_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_recurso_fhir_tipo_recurso_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_recurso_fhir_tipo_recurso_id_seq OWNER TO postgres;

--
-- TOC entry 8594 (class 0 OID 0)
-- Dependencies: 368
-- Name: tipo_recurso_fhir_tipo_recurso_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_recurso_fhir_tipo_recurso_id_seq OWNED BY medico.tipo_recurso_fhir.tipo_recurso_id;


--
-- TOC entry 269 (class 1259 OID 16793)
-- Name: tipo_registro_signos_vitales; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_registro_signos_vitales (
    tipo_registro_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_registro_signos_vitales OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 16792)
-- Name: tipo_registro_signos_vitales_tipo_registro_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_registro_signos_vitales_tipo_registro_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_registro_signos_vitales_tipo_registro_id_seq OWNER TO postgres;

--
-- TOC entry 8595 (class 0 OID 0)
-- Dependencies: 268
-- Name: tipo_registro_signos_vitales_tipo_registro_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_registro_signos_vitales_tipo_registro_id_seq OWNED BY medico.tipo_registro_signos_vitales.tipo_registro_id;


--
-- TOC entry 347 (class 1259 OID 17365)
-- Name: tipo_servicio_basico; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_servicio_basico (
    tipo_servicio_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_servicio_basico OWNER TO postgres;

--
-- TOC entry 346 (class 1259 OID 17364)
-- Name: tipo_servicio_basico_tipo_servicio_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_servicio_basico_tipo_servicio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_servicio_basico_tipo_servicio_id_seq OWNER TO postgres;

--
-- TOC entry 8596 (class 0 OID 0)
-- Dependencies: 346
-- Name: tipo_servicio_basico_tipo_servicio_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_servicio_basico_tipo_servicio_id_seq OWNED BY medico.tipo_servicio_basico.tipo_servicio_id;


--
-- TOC entry 251 (class 1259 OID 16665)
-- Name: tipo_servicio_medico; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_servicio_medico (
    tipo_servicio_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_servicio_medico OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 16664)
-- Name: tipo_servicio_medico_tipo_servicio_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_servicio_medico_tipo_servicio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_servicio_medico_tipo_servicio_id_seq OWNER TO postgres;

--
-- TOC entry 8597 (class 0 OID 0)
-- Dependencies: 250
-- Name: tipo_servicio_medico_tipo_servicio_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_servicio_medico_tipo_servicio_id_seq OWNED BY medico.tipo_servicio_medico.tipo_servicio_id;


--
-- TOC entry 367 (class 1259 OID 17519)
-- Name: tipo_sugerencia_ia; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_sugerencia_ia (
    tipo_sugerencia_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_sugerencia_ia OWNER TO postgres;

--
-- TOC entry 366 (class 1259 OID 17518)
-- Name: tipo_sugerencia_ia_tipo_sugerencia_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_sugerencia_ia_tipo_sugerencia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_sugerencia_ia_tipo_sugerencia_id_seq OWNER TO postgres;

--
-- TOC entry 8598 (class 0 OID 0)
-- Dependencies: 366
-- Name: tipo_sugerencia_ia_tipo_sugerencia_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_sugerencia_ia_tipo_sugerencia_id_seq OWNED BY medico.tipo_sugerencia_ia.tipo_sugerencia_id;


--
-- TOC entry 357 (class 1259 OID 17443)
-- Name: tipo_trama_susalud; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_trama_susalud (
    tipo_trama_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    version_formato character varying(20),
    estructura_json jsonb,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_trama_susalud OWNER TO postgres;

--
-- TOC entry 356 (class 1259 OID 17442)
-- Name: tipo_trama_susalud_tipo_trama_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_trama_susalud_tipo_trama_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_trama_susalud_tipo_trama_id_seq OWNER TO postgres;

--
-- TOC entry 8599 (class 0 OID 0)
-- Dependencies: 356
-- Name: tipo_trama_susalud_tipo_trama_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_trama_susalud_tipo_trama_id_seq OWNED BY medico.tipo_trama_susalud.tipo_trama_id;


--
-- TOC entry 291 (class 1259 OID 16951)
-- Name: tipo_transicion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.tipo_transicion (
    tipo_transicion_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(200) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.tipo_transicion OWNER TO postgres;

--
-- TOC entry 290 (class 1259 OID 16950)
-- Name: tipo_transicion_tipo_transicion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.tipo_transicion_tipo_transicion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.tipo_transicion_tipo_transicion_id_seq OWNER TO postgres;

--
-- TOC entry 8600 (class 0 OID 0)
-- Dependencies: 290
-- Name: tipo_transicion_tipo_transicion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.tipo_transicion_tipo_transicion_id_seq OWNED BY medico.tipo_transicion.tipo_transicion_id;


--
-- TOC entry 543 (class 1259 OID 20670)
-- Name: trama_susalud; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.trama_susalud (
    trama_id bigint NOT NULL,
    organizacion_id bigint NOT NULL,
    periodo_reporte_id bigint NOT NULL,
    tipo_trama_id bigint,
    numero_lote character varying(50),
    fecha_generacion timestamp without time zone DEFAULT now() NOT NULL,
    fecha_envio timestamp without time zone,
    archivo_txt_nombre character varying(300),
    archivo_txt_ruta text,
    archivo_validacion_ruta text,
    archivo_respuesta_ruta text,
    total_registros integer DEFAULT 0,
    registros_aceptados integer DEFAULT 0,
    registros_rechazados integer DEFAULT 0,
    codigo_respuesta_susalud character varying(50),
    mensaje_respuesta_susalud text,
    estado character varying(50) DEFAULT 'generada'::character varying,
    observaciones text,
    personal_genera_id bigint,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.trama_susalud OWNER TO postgres;

--
-- TOC entry 542 (class 1259 OID 20669)
-- Name: trama_susalud_trama_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.trama_susalud_trama_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.trama_susalud_trama_id_seq OWNER TO postgres;

--
-- TOC entry 8601 (class 0 OID 0)
-- Dependencies: 542
-- Name: trama_susalud_trama_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.trama_susalud_trama_id_seq OWNED BY medico.trama_susalud.trama_id;


--
-- TOC entry 427 (class 1259 OID 18417)
-- Name: transicion_atencion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.transicion_atencion (
    transicion_id bigint NOT NULL,
    atencion_id bigint NOT NULL,
    episodio_origen_id bigint,
    episodio_destino_id bigint,
    tipo_transicion_id bigint,
    fecha_hora_transicion timestamp without time zone DEFAULT now() NOT NULL,
    personal_autoriza_id bigint,
    motivo_transicion text,
    condicion_paciente_transicion text,
    servicio_origen_id bigint,
    servicio_destino_id bigint,
    cama_origen_id bigint,
    cama_destino_id bigint,
    diagnostico_momento_transicion_id bigint,
    indicaciones_transicion text,
    observaciones text,
    fecha_hora_salida_origen timestamp without time zone,
    fecha_hora_llegada_destino timestamp without time zone,
    "personal_acompaña_id" bigint,
    medio_transporte character varying(100),
    requirio_oxigeno boolean DEFAULT false,
    requirio_monitoreo boolean DEFAULT false,
    incidentes_traslado text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.transicion_atencion OWNER TO postgres;

--
-- TOC entry 8602 (class 0 OID 0)
-- Dependencies: 427
-- Name: TABLE transicion_atencion; Type: COMMENT; Schema: medico; Owner: postgres
--

COMMENT ON TABLE medico.transicion_atencion IS 'Registro de movimientos entre episodios';


--
-- TOC entry 426 (class 1259 OID 18416)
-- Name: transicion_atencion_transicion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.transicion_atencion_transicion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.transicion_atencion_transicion_id_seq OWNER TO postgres;

--
-- TOC entry 8603 (class 0 OID 0)
-- Dependencies: 426
-- Name: transicion_atencion_transicion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.transicion_atencion_transicion_id_seq OWNED BY medico.transicion_atencion.transicion_id;


--
-- TOC entry 431 (class 1259 OID 18528)
-- Name: triaje; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.triaje (
    triaje_id bigint NOT NULL,
    atencion_id bigint NOT NULL,
    registro_signos_vitales_id bigint,
    fecha_hora timestamp without time zone DEFAULT now() NOT NULL,
    personal_triaje_id bigint,
    prioridad_triaje_id bigint,
    motivo_consulta_breve text,
    observaciones_triaje text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.triaje OWNER TO postgres;

--
-- TOC entry 430 (class 1259 OID 18527)
-- Name: triaje_triaje_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.triaje_triaje_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.triaje_triaje_id_seq OWNER TO postgres;

--
-- TOC entry 8604 (class 0 OID 0)
-- Dependencies: 430
-- Name: triaje_triaje_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.triaje_triaje_id_seq OWNED BY medico.triaje.triaje_id;


--
-- TOC entry 235 (class 1259 OID 16543)
-- Name: ubigeo; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.ubigeo (
    ubigeo_id bigint NOT NULL,
    codigo character varying(6) NOT NULL,
    departamento character varying(100) NOT NULL,
    provincia character varying(100) NOT NULL,
    distrito character varying(100) NOT NULL,
    codigo_departamento character varying(2),
    codigo_provincia character varying(4),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.ubigeo OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16542)
-- Name: ubigeo_ubigeo_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.ubigeo_ubigeo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.ubigeo_ubigeo_id_seq OWNER TO postgres;

--
-- TOC entry 8605 (class 0 OID 0)
-- Dependencies: 234
-- Name: ubigeo_ubigeo_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.ubigeo_ubigeo_id_seq OWNED BY medico.ubigeo.ubigeo_id;


--
-- TOC entry 303 (class 1259 OID 17043)
-- Name: unidad_medida_farmacia; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.unidad_medida_farmacia (
    unidad_medida_farmacia_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    abreviatura character varying(20),
    tipo character varying(50),
    factor_conversion numeric(12,6),
    unidad_base_id bigint,
    orden integer,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.unidad_medida_farmacia OWNER TO postgres;

--
-- TOC entry 302 (class 1259 OID 17042)
-- Name: unidad_medida_farmacia_unidad_medida_farmacia_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.unidad_medida_farmacia_unidad_medida_farmacia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.unidad_medida_farmacia_unidad_medida_farmacia_id_seq OWNER TO postgres;

--
-- TOC entry 8606 (class 0 OID 0)
-- Dependencies: 302
-- Name: unidad_medida_farmacia_unidad_medida_farmacia_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.unidad_medida_farmacia_unidad_medida_farmacia_id_seq OWNED BY medico.unidad_medida_farmacia.unidad_medida_farmacia_id;


--
-- TOC entry 307 (class 1259 OID 17078)
-- Name: unidad_medida_general; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.unidad_medida_general (
    unidad_medida_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    abreviatura character varying(20),
    tipo character varying(50),
    aplicacion character varying(100),
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.unidad_medida_general OWNER TO postgres;

--
-- TOC entry 306 (class 1259 OID 17077)
-- Name: unidad_medida_general_unidad_medida_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.unidad_medida_general_unidad_medida_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.unidad_medida_general_unidad_medida_id_seq OWNER TO postgres;

--
-- TOC entry 8607 (class 0 OID 0)
-- Dependencies: 306
-- Name: unidad_medida_general_unidad_medida_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.unidad_medida_general_unidad_medida_id_seq OWNED BY medico.unidad_medida_general.unidad_medida_id;


--
-- TOC entry 305 (class 1259 OID 17062)
-- Name: unidad_medida_laboratorio; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.unidad_medida_laboratorio (
    unidad_medida_lab_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    abreviatura character varying(20),
    tipo character varying(50),
    descripcion text,
    sistema_medida character varying(50),
    factor_conversion_si numeric(12,6),
    orden integer,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.unidad_medida_laboratorio OWNER TO postgres;

--
-- TOC entry 304 (class 1259 OID 17061)
-- Name: unidad_medida_laboratorio_unidad_medida_lab_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.unidad_medida_laboratorio_unidad_medida_lab_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.unidad_medida_laboratorio_unidad_medida_lab_id_seq OWNER TO postgres;

--
-- TOC entry 8608 (class 0 OID 0)
-- Dependencies: 304
-- Name: unidad_medida_laboratorio_unidad_medida_lab_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.unidad_medida_laboratorio_unidad_medida_lab_id_seq OWNED BY medico.unidad_medida_laboratorio.unidad_medida_lab_id;


--
-- TOC entry 409 (class 1259 OID 18048)
-- Name: usuario; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.usuario (
    usuario_id bigint NOT NULL,
    personal_id bigint NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol_id bigint,
    ultimo_acceso timestamp without time zone,
    estado character varying(20) DEFAULT 'activo'::character varying,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.usuario OWNER TO postgres;

--
-- TOC entry 408 (class 1259 OID 18047)
-- Name: usuario_usuario_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.usuario_usuario_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.usuario_usuario_id_seq OWNER TO postgres;

--
-- TOC entry 8609 (class 0 OID 0)
-- Dependencies: 408
-- Name: usuario_usuario_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.usuario_usuario_id_seq OWNED BY medico.usuario.usuario_id;


--
-- TOC entry 607 (class 1259 OID 21771)
-- Name: v_atenciones_episodios; Type: VIEW; Schema: medico; Owner: postgres
--

CREATE VIEW medico.v_atenciones_episodios AS
SELECT
    NULL::bigint AS atencion_id,
    NULL::character varying(50) AS numero_atencion,
    NULL::timestamp without time zone AS fecha_hora_registro,
    NULL::timestamp without time zone AS fecha_hora_inicio,
    NULL::timestamp without time zone AS fecha_hora_fin,
    NULL::character varying(50) AS numero_historia_clinica,
    NULL::text AS paciente,
    NULL::character varying(100) AS tipo_atencion_inicial,
    NULL::character varying(100) AS tipo_atencion_actual,
    NULL::character varying(100) AS estado_atencion,
    NULL::bigint AS total_episodios,
    NULL::text AS episodios,
    NULL::character varying(300) AS organizacion;


ALTER VIEW medico.v_atenciones_episodios OWNER TO postgres;

--
-- TOC entry 609 (class 1259 OID 21781)
-- Name: v_citas_del_dia; Type: VIEW; Schema: medico; Owner: postgres
--

CREATE VIEW medico.v_citas_del_dia AS
 SELECT c.cita_id,
    c.numero_cita,
    c.fecha_hora_programada,
    c.fecha_hora_inicio_real,
    concat(per_pac.apellido_paterno, ' ', per_pac.apellido_materno, ', ', per_pac.nombres) AS paciente,
    per_pac.celular AS telefono_paciente,
    tc.nombre AS tipo_cita,
    ec.nombre AS estado_cita,
    ec.color_hex,
    concat(per_med.apellido_paterno, ' ', per_med.nombres) AS medico,
    esp.nombre AS especialidad,
    cons.nombre AS consultorio,
    sm.nombre AS servicio,
    c.motivo_consulta
   FROM ((((((((((medico.cita c
     JOIN medico.paciente pac ON ((c.paciente_id = pac.paciente_id)))
     JOIN medico.persona per_pac ON ((pac.persona_id = per_pac.persona_id)))
     JOIN medico.agenda ag ON ((c.agenda_id = ag.agenda_id)))
     JOIN medico.personal pers ON ((ag.personal_id = pers.personal_id)))
     JOIN medico.persona per_med ON ((pers.persona_id = per_med.persona_id)))
     JOIN medico.consultorio cons ON ((ag.consultorio_id = cons.consultorio_id)))
     JOIN medico.servicio_medico sm ON ((ag.servicio_id = sm.servicio_id)))
     LEFT JOIN medico.especialidad_medica esp ON ((sm.especialidad_id = esp.especialidad_id)))
     LEFT JOIN medico.tipo_cita tc ON ((c.tipo_cita_id = tc.tipo_cita_id)))
     LEFT JOIN medico.estado_cita ec ON ((c.estado_cita_id = ec.estado_cita_id)))
  WHERE ((c.eliminado = false) AND (date(c.fecha_hora_programada) = CURRENT_DATE));


ALTER VIEW medico.v_citas_del_dia OWNER TO postgres;

--
-- TOC entry 610 (class 1259 OID 21786)
-- Name: v_hospitalizaciones_activas; Type: VIEW; Schema: medico; Owner: postgres
--

CREATE VIEW medico.v_hospitalizaciones_activas AS
 SELECT h.hospitalizacion_id,
    h.numero_hospitalizacion,
    h.fecha_hora_ingreso_hospitalario,
    date_part('day'::text, (now() - (h.fecha_hora_ingreso_hospitalario)::timestamp with time zone)) AS dias_hospitalizacion,
    pac.numero_historia_clinica,
    concat(per.apellido_paterno, ' ', per.apellido_materno, ', ', per.nombres) AS paciente,
    medico.calcular_edad(per.fecha_nacimiento) AS edad,
    s.nombre AS sexo,
    cam.codigo AS cama,
    cam.habitacion,
    cam.piso,
    tc.nombre AS tipo_cama,
    srv.nombre AS servicio,
    string_agg(DISTINCT concat(per_med.apellido_paterno, ' ', per_med.nombres), ', '::text) AS medicos_tratantes,
    cie.codigo AS diagnostico_codigo,
    cie.descripcion AS diagnostico
   FROM (((((((((((medico.hospitalizacion h
     JOIN medico.paciente pac ON ((h.paciente_id = pac.paciente_id)))
     JOIN medico.persona per ON ((pac.persona_id = per.persona_id)))
     LEFT JOIN medico.sexo s ON ((per.sexo_id = s.sexo_id)))
     LEFT JOIN medico.cama cam ON ((h.cama_actual_id = cam.cama_id)))
     LEFT JOIN medico.tipo_cama tc ON ((cam.tipo_cama_id = tc.tipo_cama_id)))
     LEFT JOIN medico.servicio_medico srv ON ((h.servicio_actual_id = srv.servicio_id)))
     LEFT JOIN medico.episodio_clinico ep ON ((h.episodio_id = ep.episodio_id)))
     LEFT JOIN medico.cie10 cie ON ((ep.diagnostico_ingreso_episodio_id = cie.cie10_id)))
     LEFT JOIN medico.medico_hospitalizacion mh ON (((h.hospitalizacion_id = mh.hospitalizacion_id) AND (mh.es_responsable_actual = true))))
     LEFT JOIN medico.personal pers_med ON ((mh.personal_id = pers_med.personal_id)))
     LEFT JOIN medico.persona per_med ON ((pers_med.persona_id = per_med.persona_id)))
  WHERE ((h.eliminado = false) AND ((h.estado)::text = 'activo'::text) AND (h.fecha_hora_alta_hospitalaria IS NULL))
  GROUP BY h.hospitalizacion_id, h.numero_hospitalizacion, h.fecha_hora_ingreso_hospitalario, pac.numero_historia_clinica, per.apellido_paterno, per.apellido_materno, per.nombres, per.fecha_nacimiento, s.nombre, cam.codigo, cam.habitacion, cam.piso, tc.nombre, srv.nombre, cie.codigo, cie.descripcion;


ALTER VIEW medico.v_hospitalizaciones_activas OWNER TO postgres;

--
-- TOC entry 606 (class 1259 OID 21766)
-- Name: v_pacientes_completo; Type: VIEW; Schema: medico; Owner: postgres
--

CREATE VIEW medico.v_pacientes_completo AS
 SELECT pac.paciente_id,
    pac.numero_historia_clinica,
    per.nombres,
    per.apellido_paterno,
    per.apellido_materno,
    concat(per.apellido_paterno, ' ', per.apellido_materno, ', ', per.nombres) AS nombre_completo,
    td.nombre AS tipo_documento,
    per.numero_documento,
    per.fecha_nacimiento,
    medico.calcular_edad(per.fecha_nacimiento) AS edad,
    s.nombre AS sexo,
    ec.nombre AS estado_civil,
    per.celular,
    per.email,
    gs.nombre AS grupo_sanguineo,
    fr.nombre AS factor_rh,
    pac.estado,
    org.razon_social AS organizacion
   FROM (((((((medico.paciente pac
     JOIN medico.persona per ON ((pac.persona_id = per.persona_id)))
     JOIN medico.organizacion org ON ((pac.organizacion_id = org.organizacion_id)))
     LEFT JOIN medico.tipo_documento td ON ((per.tipo_documento_id = td.tipo_documento_id)))
     LEFT JOIN medico.sexo s ON ((per.sexo_id = s.sexo_id)))
     LEFT JOIN medico.estado_civil ec ON ((per.estado_civil_id = ec.estado_civil_id)))
     LEFT JOIN medico.grupo_sanguineo gs ON ((per.grupo_sanguineo_id = gs.grupo_sanguineo_id)))
     LEFT JOIN medico.factor_rh fr ON ((per.factor_rh_id = fr.factor_rh_id)))
  WHERE (pac.eliminado = false);


ALTER VIEW medico.v_pacientes_completo OWNER TO postgres;

--
-- TOC entry 608 (class 1259 OID 21776)
-- Name: v_stock_productos; Type: VIEW; Schema: medico; Owner: postgres
--

CREATE VIEW medico.v_stock_productos AS
 SELECT p.producto_id,
    p.codigo,
    p.nombre_generico,
    p.nombre_comercial,
    p.presentacion,
    cat.nombre AS categoria,
    uff.nombre AS forma_farmaceutica,
    a.almacen_id,
    a.nombre AS almacen,
    sum(lp.cantidad_actual) AS stock_total,
    p.stock_minimo,
    p.stock_maximo,
        CASE
            WHEN (sum(lp.cantidad_actual) <= p.stock_minimo) THEN 'CRITICO'::text
            WHEN (sum(lp.cantidad_actual) <= (p.stock_minimo * 1.5)) THEN 'BAJO'::text
            WHEN (sum(lp.cantidad_actual) >= p.stock_maximo) THEN 'EXCESO'::text
            ELSE 'NORMAL'::text
        END AS estado_stock,
    count(
        CASE
            WHEN ((lp.estado_lote)::text = 'vencido'::text) THEN 1
            ELSE NULL::integer
        END) AS lotes_vencidos,
    count(
        CASE
            WHEN ((lp.estado_lote)::text = 'por_vencer'::text) THEN 1
            ELSE NULL::integer
        END) AS lotes_por_vencer,
    min(lp.fecha_vencimiento) AS proxima_fecha_vencimiento
   FROM ((((medico.producto p
     LEFT JOIN medico.categoria_producto cat ON ((p.categoria_id = cat.categoria_id)))
     LEFT JOIN medico.tipo_forma_farmaceutica uff ON ((p.forma_farmaceutica_id = uff.forma_farmaceutica_id)))
     LEFT JOIN medico.lote_producto lp ON (((p.producto_id = lp.producto_id) AND (lp.eliminado = false))))
     LEFT JOIN medico.almacen a ON ((lp.almacen_id = a.almacen_id)))
  WHERE (p.eliminado = false)
  GROUP BY p.producto_id, p.codigo, p.nombre_generico, p.nombre_comercial, p.presentacion, cat.nombre, uff.nombre, a.almacen_id, a.nombre, p.stock_minimo, p.stock_maximo;


ALTER VIEW medico.v_stock_productos OWNER TO postgres;

--
-- TOC entry 573 (class 1259 OID 21093)
-- Name: valor_kpi; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.valor_kpi (
    valor_kpi_id bigint NOT NULL,
    kpi_id bigint NOT NULL,
    periodo_id bigint,
    fecha_calculo date DEFAULT CURRENT_DATE NOT NULL,
    valor numeric(15,4) NOT NULL,
    valor_anterior numeric(15,4),
    variacion_porcentaje numeric(8,2),
    cumple_meta boolean DEFAULT false,
    observaciones text,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.valor_kpi OWNER TO postgres;

--
-- TOC entry 572 (class 1259 OID 21092)
-- Name: valor_kpi_valor_kpi_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.valor_kpi_valor_kpi_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.valor_kpi_valor_kpi_id_seq OWNER TO postgres;

--
-- TOC entry 8610 (class 0 OID 0)
-- Dependencies: 572
-- Name: valor_kpi_valor_kpi_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.valor_kpi_valor_kpi_id_seq OWNED BY medico.valor_kpi.valor_kpi_id;


--
-- TOC entry 313 (class 1259 OID 17120)
-- Name: via_administracion; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.via_administracion (
    via_administracion_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.via_administracion OWNER TO postgres;

--
-- TOC entry 312 (class 1259 OID 17119)
-- Name: via_administracion_via_administracion_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.via_administracion_via_administracion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.via_administracion_via_administracion_id_seq OWNER TO postgres;

--
-- TOC entry 8611 (class 0 OID 0)
-- Dependencies: 312
-- Name: via_administracion_via_administracion_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.via_administracion_via_administracion_id_seq OWNED BY medico.via_administracion.via_administracion_id;


--
-- TOC entry 287 (class 1259 OID 16923)
-- Name: via_ingreso_hospitalario; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.via_ingreso_hospitalario (
    via_ingreso_id bigint NOT NULL,
    codigo character varying(20) NOT NULL,
    nombre character varying(100) NOT NULL,
    eliminado boolean DEFAULT false NOT NULL
);


ALTER TABLE medico.via_ingreso_hospitalario OWNER TO postgres;

--
-- TOC entry 286 (class 1259 OID 16922)
-- Name: via_ingreso_hospitalario_via_ingreso_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.via_ingreso_hospitalario_via_ingreso_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.via_ingreso_hospitalario_via_ingreso_id_seq OWNER TO postgres;

--
-- TOC entry 8612 (class 0 OID 0)
-- Dependencies: 286
-- Name: via_ingreso_hospitalario_via_ingreso_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.via_ingreso_hospitalario_via_ingreso_id_seq OWNED BY medico.via_ingreso_hospitalario.via_ingreso_id;


--
-- TOC entry 567 (class 1259 OID 21023)
-- Name: widget_dashboard; Type: TABLE; Schema: medico; Owner: postgres
--

CREATE TABLE medico.widget_dashboard (
    widget_id bigint NOT NULL,
    dashboard_id bigint NOT NULL,
    nombre character varying(300) NOT NULL,
    tipo_widget character varying(100) NOT NULL,
    configuracion_json jsonb,
    query_sql text,
    posicion_x integer,
    posicion_y integer,
    ancho integer,
    alto integer,
    refresh_minutos integer,
    orden integer,
    eliminado boolean DEFAULT false NOT NULL,
    usuario_creacion_id bigint,
    fecha_creacion timestamp without time zone DEFAULT now(),
    usuario_actualizacion_id bigint,
    fecha_actualizacion timestamp without time zone DEFAULT now(),
    usuario_eliminacion_id bigint,
    fecha_eliminacion timestamp without time zone
);


ALTER TABLE medico.widget_dashboard OWNER TO postgres;

--
-- TOC entry 566 (class 1259 OID 21022)
-- Name: widget_dashboard_widget_id_seq; Type: SEQUENCE; Schema: medico; Owner: postgres
--

CREATE SEQUENCE medico.widget_dashboard_widget_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE medico.widget_dashboard_widget_id_seq OWNER TO postgres;

--
-- TOC entry 8613 (class 0 OID 0)
-- Dependencies: 566
-- Name: widget_dashboard_widget_id_seq; Type: SEQUENCE OWNED BY; Schema: medico; Owner: postgres
--

ALTER SEQUENCE medico.widget_dashboard_widget_id_seq OWNED BY medico.widget_dashboard.widget_id;


--
-- TOC entry 6214 (class 2604 OID 18191)
-- Name: agenda agenda_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.agenda ALTER COLUMN agenda_id SET DEFAULT nextval('medico.agenda_agenda_id_seq'::regclass);


--
-- TOC entry 6153 (class 2604 OID 17783)
-- Name: alergia alergia_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.alergia ALTER COLUMN alergia_id SET DEFAULT nextval('medico.alergia_alergia_id_seq'::regclass);


--
-- TOC entry 6655 (class 2604 OID 21220)
-- Name: alerta_ia alerta_ia_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.alerta_ia ALTER COLUMN alerta_ia_id SET DEFAULT nextval('medico.alerta_ia_alerta_ia_id_seq'::regclass);


--
-- TOC entry 6334 (class 2604 OID 19244)
-- Name: almacen almacen_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.almacen ALTER COLUMN almacen_id SET DEFAULT nextval('medico.almacen_almacen_id_seq'::regclass);


--
-- TOC entry 6163 (class 2604 OID 17843)
-- Name: antecedente_medico antecedente_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.antecedente_medico ALTER COLUMN antecedente_id SET DEFAULT nextval('medico.antecedente_medico_antecedente_id_seq'::regclass);


--
-- TOC entry 6472 (class 2604 OID 20202)
-- Name: apertura_caja apertura_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.apertura_caja ALTER COLUMN apertura_id SET DEFAULT nextval('medico.apertura_caja_apertura_id_seq'::regclass);


--
-- TOC entry 6056 (class 2604 OID 17156)
-- Name: area_examen area_examen_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.area_examen ALTER COLUMN area_examen_id SET DEFAULT nextval('medico.area_examen_area_examen_id_seq'::regclass);


--
-- TOC entry 6142 (class 2604 OID 17733)
-- Name: aseguradora aseguradora_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.aseguradora ALTER COLUMN aseguradora_id SET DEFAULT nextval('medico.aseguradora_aseguradora_id_seq'::regclass);


--
-- TOC entry 6223 (class 2604 OID 18277)
-- Name: atencion atencion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.atencion ALTER COLUMN atencion_id SET DEFAULT nextval('medico.atencion_atencion_id_seq'::regclass);


--
-- TOC entry 6580 (class 2604 OID 20791)
-- Name: auditoria_hc auditoria_hc_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.auditoria_hc ALTER COLUMN auditoria_hc_id SET DEFAULT nextval('medico.auditoria_hc_auditoria_hc_id_seq'::regclass);


--
-- TOC entry 6524 (class 2604 OID 20499)
-- Name: balance balance_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.balance ALTER COLUMN balance_id SET DEFAULT nextval('medico.balance_balance_id_seq'::regclass);


--
-- TOC entry 6466 (class 2604 OID 20167)
-- Name: caja caja_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.caja ALTER COLUMN caja_id SET DEFAULT nextval('medico.caja_caja_id_seq'::regclass);


--
-- TOC entry 6207 (class 2604 OID 18141)
-- Name: cama cama_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cama ALTER COLUMN cama_id SET DEFAULT nextval('medico.cama_cama_id_seq'::regclass);


--
-- TOC entry 5977 (class 2604 OID 16621)
-- Name: cargo cargo_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cargo ALTER COLUMN cargo_id SET DEFAULT nextval('medico.cargo_cargo_id_seq'::regclass);


--
-- TOC entry 6096 (class 2604 OID 17412)
-- Name: categoria_balance categoria_balance_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_balance ALTER COLUMN categoria_balance_id SET DEFAULT nextval('medico.categoria_balance_categoria_balance_id_seq'::regclass);


--
-- TOC entry 6054 (class 2604 OID 17137)
-- Name: categoria_examen categoria_examen_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_examen ALTER COLUMN categoria_examen_id SET DEFAULT nextval('medico.categoria_examen_categoria_examen_id_seq'::regclass);


--
-- TOC entry 6085 (class 2604 OID 17353)
-- Name: categoria_movimiento categoria_movimiento_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_movimiento ALTER COLUMN categoria_movimiento_id SET DEFAULT nextval('medico.categoria_movimiento_categoria_movimiento_id_seq'::regclass);


--
-- TOC entry 6037 (class 2604 OID 17012)
-- Name: categoria_producto categoria_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_producto ALTER COLUMN categoria_id SET DEFAULT nextval('medico.categoria_producto_categoria_id_seq'::regclass);


--
-- TOC entry 6107 (class 2604 OID 17492)
-- Name: categoria_reporte categoria_reporte_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_reporte ALTER COLUMN categoria_reporte_id SET DEFAULT nextval('medico.categoria_reporte_categoria_reporte_id_seq'::regclass);


--
-- TOC entry 6160 (class 2604 OID 17826)
-- Name: cie10 cie10_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cie10 ALTER COLUMN cie10_id SET DEFAULT nextval('medico.cie10_cie10_id_seq'::regclass);


--
-- TOC entry 6276 (class 2604 OID 18760)
-- Name: cie10_personalizado cie10_personalizado_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cie10_personalizado ALTER COLUMN cie10_personalizado_id SET DEFAULT nextval('medico.cie10_personalizado_cie10_personalizado_id_seq'::regclass);


--
-- TOC entry 6219 (class 2604 OID 18227)
-- Name: cita cita_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cita ALTER COLUMN cita_id SET DEFAULT nextval('medico.cita_cita_id_seq'::regclass);


--
-- TOC entry 6440 (class 2604 OID 19976)
-- Name: comprobante comprobante_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.comprobante ALTER COLUMN comprobante_id SET DEFAULT nextval('medico.comprobante_comprobante_id_seq'::regclass);


--
-- TOC entry 6079 (class 2604 OID 17311)
-- Name: concepto_facturacion concepto_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.concepto_facturacion ALTER COLUMN concepto_id SET DEFAULT nextval('medico.concepto_facturacion_concepto_id_seq'::regclass);


--
-- TOC entry 6090 (class 2604 OID 17382)
-- Name: concepto_planilla concepto_planilla_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.concepto_planilla ALTER COLUMN concepto_planilla_id SET DEFAULT nextval('medico.concepto_planilla_concepto_planilla_id_seq'::regclass);


--
-- TOC entry 6506 (class 2604 OID 20376)
-- Name: concepto_planilla_personal concepto_planilla_personal_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.concepto_planilla_personal ALTER COLUMN concepto_planilla_personal_id SET DEFAULT nextval('medico.concepto_planilla_personal_concepto_planilla_personal_id_seq'::regclass);


--
-- TOC entry 6726 (class 2604 OID 21614)
-- Name: configuracion_sistema configuracion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.configuracion_sistema ALTER COLUMN configuracion_id SET DEFAULT nextval('medico.configuracion_sistema_configuracion_id_seq'::regclass);


--
-- TOC entry 6705 (class 2604 OID 21466)
-- Name: consentimiento_informado consentimiento_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.consentimiento_informado ALTER COLUMN consentimiento_id SET DEFAULT nextval('medico.consentimiento_informado_consentimiento_id_seq'::regclass);


--
-- TOC entry 6197 (class 2604 OID 18079)
-- Name: consultorio consultorio_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.consultorio ALTER COLUMN consultorio_id SET DEFAULT nextval('medico.consultorio_consultorio_id_seq'::regclass);


--
-- TOC entry 6571 (class 2604 OID 20743)
-- Name: criterio_auditoria criterio_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.criterio_auditoria ALTER COLUMN criterio_id SET DEFAULT nextval('medico.criterio_auditoria_criterio_id_seq'::regclass);


--
-- TOC entry 6620 (class 2604 OID 21010)
-- Name: dashboard_gerencial dashboard_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.dashboard_gerencial ALTER COLUMN dashboard_id SET DEFAULT nextval('medico.dashboard_gerencial_dashboard_id_seq'::regclass);


--
-- TOC entry 6629 (class 2604 OID 21048)
-- Name: dashboard_rol dashboard_rol_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.dashboard_rol ALTER COLUMN dashboard_rol_id SET DEFAULT nextval('medico.dashboard_rol_dashboard_rol_id_seq'::regclass);


--
-- TOC entry 6587 (class 2604 OID 20838)
-- Name: detalle_auditoria detalle_auditoria_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_auditoria ALTER COLUMN detalle_auditoria_id SET DEFAULT nextval('medico.detalle_auditoria_detalle_auditoria_id_seq'::regclass);


--
-- TOC entry 6538 (class 2604 OID 20559)
-- Name: detalle_balance detalle_balance_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_balance ALTER COLUMN detalle_balance_id SET DEFAULT nextval('medico.detalle_balance_detalle_balance_id_seq'::regclass);


--
-- TOC entry 6449 (class 2604 OID 20047)
-- Name: detalle_comprobante detalle_comprobante_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_comprobante ALTER COLUMN detalle_comprobante_id SET DEFAULT nextval('medico.detalle_comprobante_detalle_comprobante_id_seq'::regclass);


--
-- TOC entry 6379 (class 2604 OID 19565)
-- Name: detalle_dispensacion detalle_dispensacion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_dispensacion ALTER COLUMN detalle_dispensacion_id SET DEFAULT nextval('medico.detalle_dispensacion_detalle_dispensacion_id_seq'::regclass);


--
-- TOC entry 6256 (class 2604 OID 18604)
-- Name: detalle_examen_fisico detalle_examen_fisico_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_examen_fisico ALTER COLUMN detalle_examen_fisico_id SET DEFAULT nextval('medico.detalle_examen_fisico_detalle_examen_fisico_id_seq'::regclass);


--
-- TOC entry 6359 (class 2604 OID 19409)
-- Name: detalle_movimiento_almacen detalle_movimiento_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_movimiento_almacen ALTER COLUMN detalle_movimiento_id SET DEFAULT nextval('medico.detalle_movimiento_almacen_detalle_movimiento_id_seq'::regclass);


--
-- TOC entry 6500 (class 2604 OID 20344)
-- Name: detalle_planilla detalle_planilla_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_planilla ALTER COLUMN detalle_planilla_id SET DEFAULT nextval('medico.detalle_planilla_detalle_planilla_id_seq'::regclass);


--
-- TOC entry 6368 (class 2604 OID 19482)
-- Name: detalle_receta detalle_receta_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_receta ALTER COLUMN detalle_receta_id SET DEFAULT nextval('medico.detalle_receta_detalle_receta_id_seq'::regclass);


--
-- TOC entry 6396 (class 2604 OID 19680)
-- Name: detalle_solicitud_examen detalle_solicitud_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_solicitud_examen ALTER COLUMN detalle_solicitud_id SET DEFAULT nextval('medico.detalle_solicitud_examen_detalle_solicitud_id_seq'::regclass);


--
-- TOC entry 6566 (class 2604 OID 20715)
-- Name: detalle_trama_atencion detalle_trama_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_trama_atencion ALTER COLUMN detalle_trama_id SET DEFAULT nextval('medico.detalle_trama_atencion_detalle_trama_id_seq'::regclass);


--
-- TOC entry 6282 (class 2604 OID 18793)
-- Name: diagnostico_atencion diagnostico_atencion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.diagnostico_atencion ALTER COLUMN diagnostico_atencion_id SET DEFAULT nextval('medico.diagnostico_atencion_diagnostico_atencion_id_seq'::regclass);


--
-- TOC entry 6373 (class 2604 OID 19525)
-- Name: dispensacion dispensacion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.dispensacion ALTER COLUMN dispensacion_id SET DEFAULT nextval('medico.dispensacion_dispensacion_id_seq'::regclass);


--
-- TOC entry 6710 (class 2604 OID 21504)
-- Name: documento_clinico documento_clinico_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.documento_clinico ALTER COLUMN documento_clinico_id SET DEFAULT nextval('medico.documento_clinico_documento_clinico_id_seq'::regclass);


--
-- TOC entry 6271 (class 2604 OID 18733)
-- Name: ejecucion_indicacion ejecucion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.ejecucion_indicacion ALTER COLUMN ejecucion_id SET DEFAULT nextval('medico.ejecucion_indicacion_ejecucion_id_seq'::regclass);


--
-- TOC entry 6614 (class 2604 OID 20981)
-- Name: ejecucion_reporte ejecucion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.ejecucion_reporte ALTER COLUMN ejecucion_id SET DEFAULT nextval('medico.ejecucion_reporte_ejecucion_id_seq'::regclass);


--
-- TOC entry 6661 (class 2604 OID 21271)
-- Name: entrenamiento_modelo entrenamiento_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.entrenamiento_modelo ALTER COLUMN entrenamiento_id SET DEFAULT nextval('medico.entrenamiento_modelo_entrenamiento_id_seq'::regclass);


--
-- TOC entry 6228 (class 2604 OID 18354)
-- Name: episodio_clinico episodio_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.episodio_clinico ALTER COLUMN episodio_id SET DEFAULT nextval('medico.episodio_clinico_episodio_id_seq'::regclass);


--
-- TOC entry 5979 (class 2604 OID 16637)
-- Name: especialidad_medica especialidad_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.especialidad_medica ALTER COLUMN especialidad_id SET DEFAULT nextval('medico.especialidad_medica_especialidad_id_seq'::regclass);


--
-- TOC entry 5993 (class 2604 OID 16725)
-- Name: estado_atencion estado_atencion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_atencion ALTER COLUMN estado_atencion_id SET DEFAULT nextval('medico.estado_atencion_estado_atencion_id_seq'::regclass);


--
-- TOC entry 6083 (class 2604 OID 17339)
-- Name: estado_caja estado_caja_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_caja ALTER COLUMN estado_caja_id SET DEFAULT nextval('medico.estado_caja_estado_caja_id_seq'::regclass);


--
-- TOC entry 5989 (class 2604 OID 16697)
-- Name: estado_cama estado_cama_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_cama ALTER COLUMN estado_cama_id SET DEFAULT nextval('medico.estado_cama_estado_cama_id_seq'::regclass);


--
-- TOC entry 6002 (class 2604 OID 16782)
-- Name: estado_cita estado_cita_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_cita ALTER COLUMN estado_cita_id SET DEFAULT nextval('medico.estado_cita_estado_cita_id_seq'::regclass);


--
-- TOC entry 5958 (class 2604 OID 16490)
-- Name: estado_civil estado_civil_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_civil ALTER COLUMN estado_civil_id SET DEFAULT nextval('medico.estado_civil_estado_civil_id_seq'::regclass);


--
-- TOC entry 5997 (class 2604 OID 16753)
-- Name: estado_episodio estado_episodio_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_episodio ALTER COLUMN estado_episodio_id SET DEFAULT nextval('medico.estado_episodio_estado_episodio_id_seq'::regclass);


--
-- TOC entry 6033 (class 2604 OID 16984)
-- Name: estado_interconsulta estado_interconsulta_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_interconsulta ALTER COLUMN estado_interconsulta_id SET DEFAULT nextval('medico.estado_interconsulta_estado_interconsulta_id_seq'::regclass);


--
-- TOC entry 6050 (class 2604 OID 17109)
-- Name: estado_receta estado_receta_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_receta ALTER COLUMN estado_receta_id SET DEFAULT nextval('medico.estado_receta_estado_receta_id_seq'::regclass);


--
-- TOC entry 6069 (class 2604 OID 17241)
-- Name: estado_resultado_laboratorio estado_resultado_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_resultado_laboratorio ALTER COLUMN estado_resultado_id SET DEFAULT nextval('medico.estado_resultado_laboratorio_estado_resultado_id_seq'::regclass);


--
-- TOC entry 6060 (class 2604 OID 17184)
-- Name: estado_solicitud_examen estado_solicitud_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_solicitud_examen ALTER COLUMN estado_solicitud_id SET DEFAULT nextval('medico.estado_solicitud_examen_estado_solicitud_id_seq'::regclass);


--
-- TOC entry 6260 (class 2604 OID 18629)
-- Name: evolucion_clinica evolucion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.evolucion_clinica ALTER COLUMN evolucion_id SET DEFAULT nextval('medico.evolucion_clinica_evolucion_id_seq'::regclass);


--
-- TOC entry 6251 (class 2604 OID 18568)
-- Name: examen_fisico examen_fisico_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_fisico ALTER COLUMN examen_fisico_id SET DEFAULT nextval('medico.examen_fisico_examen_fisico_id_seq'::regclass);


--
-- TOC entry 6426 (class 2604 OID 19886)
-- Name: examen_imagen examen_imagen_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_imagen ALTER COLUMN examen_imagen_id SET DEFAULT nextval('medico.examen_imagen_examen_imagen_id_seq'::regclass);


--
-- TOC entry 6406 (class 2604 OID 19752)
-- Name: examen_laboratorio examen_lab_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_laboratorio ALTER COLUMN examen_lab_id SET DEFAULT nextval('medico.examen_laboratorio_examen_lab_id_seq'::regclass);


--
-- TOC entry 5962 (class 2604 OID 16518)
-- Name: factor_rh factor_rh_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.factor_rh ALTER COLUMN factor_rh_id SET DEFAULT nextval('medico.factor_rh_factor_rh_id_seq'::regclass);


--
-- TOC entry 6021 (class 2604 OID 16912)
-- Name: forma_llegada forma_llegada_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.forma_llegada ALTER COLUMN forma_llegada_id SET DEFAULT nextval('medico.forma_llegada_forma_llegada_id_seq'::regclass);


--
-- TOC entry 6077 (class 2604 OID 17297)
-- Name: forma_pago forma_pago_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.forma_pago ALTER COLUMN forma_pago_id SET DEFAULT nextval('medico.forma_pago_forma_pago_id_seq'::regclass);


--
-- TOC entry 5960 (class 2604 OID 16504)
-- Name: grupo_sanguineo grupo_sanguineo_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.grupo_sanguineo ALTER COLUMN grupo_sanguineo_id SET DEFAULT nextval('medico.grupo_sanguineo_grupo_sanguineo_id_seq'::regclass);


--
-- TOC entry 6301 (class 2604 OID 18943)
-- Name: historia_clinica_ambulatoria historia_ambulatoria_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_ambulatoria ALTER COLUMN historia_ambulatoria_id SET DEFAULT nextval('medico.historia_clinica_ambulatoria_historia_ambulatoria_id_seq'::regclass);


--
-- TOC entry 6305 (class 2604 OID 18978)
-- Name: historia_clinica_emergencia historia_emergencia_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_emergencia ALTER COLUMN historia_emergencia_id SET DEFAULT nextval('medico.historia_clinica_emergencia_historia_emergencia_id_seq'::regclass);


--
-- TOC entry 6320 (class 2604 OID 19121)
-- Name: historia_clinica_hospitalizacion historia_hospitalizacion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_hospitalizacion ALTER COLUMN historia_hospitalizacion_id SET DEFAULT nextval('medico.historia_clinica_hospitalizacio_historia_hospitalizacion_id_seq'::regclass);


--
-- TOC entry 6309 (class 2604 OID 19039)
-- Name: hospitalizacion hospitalizacion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.hospitalizacion ALTER COLUMN hospitalizacion_id SET DEFAULT nextval('medico.hospitalizacion_hospitalizacion_id_seq'::regclass);


--
-- TOC entry 6431 (class 2604 OID 19918)
-- Name: imagen_digital imagen_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.imagen_digital ALTER COLUMN imagen_id SET DEFAULT nextval('medico.imagen_digital_imagen_id_seq'::regclass);


--
-- TOC entry 6265 (class 2604 OID 18680)
-- Name: indicacion_medica indicacion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicacion_medica ALTER COLUMN indicacion_id SET DEFAULT nextval('medico.indicacion_medica_indicacion_id_seq'::regclass);


--
-- TOC entry 6542 (class 2604 OID 20591)
-- Name: indicador_financiero indicador_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicador_financiero ALTER COLUMN indicador_id SET DEFAULT nextval('medico.indicador_financiero_indicador_id_seq'::regclass);


--
-- TOC entry 6633 (class 2604 OID 21072)
-- Name: indicador_kpi kpi_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicador_kpi ALTER COLUMN kpi_id SET DEFAULT nextval('medico.indicador_kpi_kpi_id_seq'::regclass);


--
-- TOC entry 6435 (class 2604 OID 19944)
-- Name: informe_imagen informe_imagen_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.informe_imagen ALTER COLUMN informe_imagen_id SET DEFAULT nextval('medico.informe_imagen_informe_imagen_id_seq'::regclass);


--
-- TOC entry 6460 (class 2604 OID 20144)
-- Name: integracion_nubefact integracion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.integracion_nubefact ALTER COLUMN integracion_id SET DEFAULT nextval('medico.integracion_nubefact_integracion_id_seq'::regclass);


--
-- TOC entry 6295 (class 2604 OID 18893)
-- Name: interconsulta interconsulta_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.interconsulta ALTER COLUMN interconsulta_id SET DEFAULT nextval('medico.interconsulta_interconsulta_id_seq'::regclass);


--
-- TOC entry 6724 (class 2604 OID 21583)
-- Name: log_acceso_hc log_acceso_hc_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.log_acceso_hc ALTER COLUMN log_acceso_hc_id SET DEFAULT nextval('medico.log_acceso_hc_log_acceso_hc_id_seq'::regclass);


--
-- TOC entry 6721 (class 2604 OID 21564)
-- Name: log_acceso_sistema log_acceso_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.log_acceso_sistema ALTER COLUMN log_acceso_id SET DEFAULT nextval('medico.log_acceso_sistema_log_acceso_id_seq'::regclass);


--
-- TOC entry 6719 (class 2604 OID 21544)
-- Name: log_auditoria_sistema log_auditoria_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.log_auditoria_sistema ALTER COLUMN log_auditoria_id SET DEFAULT nextval('medico.log_auditoria_sistema_log_auditoria_id_seq'::regclass);


--
-- TOC entry 6665 (class 2604 OID 21298)
-- Name: log_ia log_ia_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.log_ia ALTER COLUMN log_ia_id SET DEFAULT nextval('medico.log_ia_log_ia_id_seq'::regclass);


--
-- TOC entry 6347 (class 2604 OID 19320)
-- Name: lote_producto lote_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.lote_producto ALTER COLUMN lote_id SET DEFAULT nextval('medico.lote_producto_lote_id_seq'::regclass);


--
-- TOC entry 6699 (class 2604 OID 21439)
-- Name: mapeo_codigo mapeo_codigo_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.mapeo_codigo ALTER COLUMN mapeo_codigo_id SET DEFAULT nextval('medico.mapeo_codigo_mapeo_codigo_id_seq'::regclass);


--
-- TOC entry 6314 (class 2604 OID 19089)
-- Name: medico_hospitalizacion medico_hospitalizacion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.medico_hospitalizacion ALTER COLUMN medico_hospitalizacion_id SET DEFAULT nextval('medico.medico_hospitalizacion_medico_hospitalizacion_id_seq'::regclass);


--
-- TOC entry 6691 (class 2604 OID 21405)
-- Name: mensaje_hl7 mensaje_hl7_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.mensaje_hl7 ALTER COLUMN mensaje_hl7_id SET DEFAULT nextval('medico.mensaje_hl7_mensaje_hl7_id_seq'::regclass);


--
-- TOC entry 6067 (class 2604 OID 17227)
-- Name: metodo_examen metodo_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.metodo_examen ALTER COLUMN metodo_id SET DEFAULT nextval('medico.metodo_examen_metodo_id_seq'::regclass);


--
-- TOC entry 6644 (class 2604 OID 21125)
-- Name: modelo_ia modelo_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.modelo_ia ALTER COLUMN modelo_id SET DEFAULT nextval('medico.modelo_ia_modelo_id_seq'::regclass);


--
-- TOC entry 6075 (class 2604 OID 17283)
-- Name: moneda moneda_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.moneda ALTER COLUMN moneda_id SET DEFAULT nextval('medico.moneda_moneda_id_seq'::regclass);


--
-- TOC entry 6211 (class 2604 OID 18172)
-- Name: motivo_consulta_predefinido motivo_consulta_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.motivo_consulta_predefinido ALTER COLUMN motivo_consulta_id SET DEFAULT nextval('medico.motivo_consulta_predefinido_motivo_consulta_id_seq'::regclass);


--
-- TOC entry 6353 (class 2604 OID 19357)
-- Name: movimiento_almacen movimiento_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_almacen ALTER COLUMN movimiento_id SET DEFAULT nextval('medico.movimiento_almacen_movimiento_id_seq'::regclass);


--
-- TOC entry 6489 (class 2604 OID 20253)
-- Name: movimiento_caja movimiento_caja_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_caja ALTER COLUMN movimiento_caja_id SET DEFAULT nextval('medico.movimiento_caja_movimiento_caja_id_seq'::regclass);


--
-- TOC entry 6324 (class 2604 OID 19177)
-- Name: movimiento_cama movimiento_cama_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_cama ALTER COLUMN movimiento_cama_id SET DEFAULT nextval('medico.movimiento_cama_movimiento_cama_id_seq'::regclass);


--
-- TOC entry 6400 (class 2604 OID 19716)
-- Name: muestra_laboratorio muestra_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.muestra_laboratorio ALTER COLUMN muestra_id SET DEFAULT nextval('medico.muestra_laboratorio_muestra_id_seq'::regclass);


--
-- TOC entry 6105 (class 2604 OID 17478)
-- Name: opcion_cumplimiento opcion_cumplimiento_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.opcion_cumplimiento ALTER COLUMN opcion_cumplimiento_id SET DEFAULT nextval('medico.opcion_cumplimiento_opcion_cumplimiento_id_seq'::regclass);


--
-- TOC entry 6017 (class 2604 OID 16883)
-- Name: orden_diagnostico orden_diagnostico_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.orden_diagnostico ALTER COLUMN orden_diagnostico_id SET DEFAULT nextval('medico.orden_diagnostico_orden_diagnostico_id_seq'::regclass);


--
-- TOC entry 6120 (class 2604 OID 17585)
-- Name: organizacion organizacion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.organizacion ALTER COLUMN organizacion_id SET DEFAULT nextval('medico.organizacion_organizacion_id_seq'::regclass);


--
-- TOC entry 6136 (class 2604 OID 17696)
-- Name: paciente paciente_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente ALTER COLUMN paciente_id SET DEFAULT nextval('medico.paciente_paciente_id_seq'::regclass);


--
-- TOC entry 6155 (class 2604 OID 17799)
-- Name: paciente_alergia paciente_alergia_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_alergia ALTER COLUMN paciente_alergia_id SET DEFAULT nextval('medico.paciente_alergia_paciente_alergia_id_seq'::regclass);


--
-- TOC entry 6170 (class 2604 OID 17896)
-- Name: paciente_antecedente_familiar paciente_antecedente_familiar_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_antecedente_familiar ALTER COLUMN paciente_antecedente_familiar_id SET DEFAULT nextval('medico.paciente_antecedente_familiar_paciente_antecedente_familiar_seq'::regclass);


--
-- TOC entry 6165 (class 2604 OID 17864)
-- Name: paciente_antecedente_personal paciente_antecedente_personal_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_antecedente_personal ALTER COLUMN paciente_antecedente_personal_id SET DEFAULT nextval('medico.paciente_antecedente_personal_paciente_antecedente_personal_seq'::regclass);


--
-- TOC entry 6147 (class 2604 OID 17757)
-- Name: paciente_aseguradora paciente_aseguradora_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_aseguradora ALTER COLUMN paciente_aseguradora_id SET DEFAULT nextval('medico.paciente_aseguradora_paciente_aseguradora_id_seq'::regclass);


--
-- TOC entry 6455 (class 2604 OID 20116)
-- Name: pago_comprobante pago_comprobante_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.pago_comprobante ALTER COLUMN pago_comprobante_id SET DEFAULT nextval('medico.pago_comprobante_pago_comprobante_id_seq'::regclass);


--
-- TOC entry 6510 (class 2604 OID 20403)
-- Name: pago_planilla pago_planilla_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.pago_planilla ALTER COLUMN pago_planilla_id SET DEFAULT nextval('medico.pago_planilla_pago_planilla_id_seq'::regclass);


--
-- TOC entry 6514 (class 2604 OID 20435)
-- Name: pago_servicio pago_servicio_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.pago_servicio ALTER COLUMN pago_servicio_id SET DEFAULT nextval('medico.pago_servicio_pago_servicio_id_seq'::regclass);


--
-- TOC entry 6411 (class 2604 OID 19797)
-- Name: parametro_laboratorio parametro_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.parametro_laboratorio ALTER COLUMN parametro_id SET DEFAULT nextval('medico.parametro_laboratorio_parametro_id_seq'::regclass);


--
-- TOC entry 5964 (class 2604 OID 16532)
-- Name: parentesco parentesco_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.parentesco ALTER COLUMN parentesco_id SET DEFAULT nextval('medico.parentesco_parentesco_id_seq'::regclass);


--
-- TOC entry 6519 (class 2604 OID 20474)
-- Name: periodo_contable periodo_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.periodo_contable ALTER COLUMN periodo_id SET DEFAULT nextval('medico.periodo_contable_periodo_id_seq'::regclass);


--
-- TOC entry 6495 (class 2604 OID 20319)
-- Name: periodo_planilla periodo_planilla_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.periodo_planilla ALTER COLUMN periodo_planilla_id SET DEFAULT nextval('medico.periodo_planilla_periodo_planilla_id_seq'::regclass);


--
-- TOC entry 6552 (class 2604 OID 20648)
-- Name: periodo_reporte_susalud periodo_reporte_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.periodo_reporte_susalud ALTER COLUMN periodo_reporte_id SET DEFAULT nextval('medico.periodo_reporte_susalud_periodo_reporte_id_seq'::regclass);


--
-- TOC entry 6188 (class 2604 OID 18013)
-- Name: permiso permiso_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.permiso ALTER COLUMN permiso_id SET DEFAULT nextval('medico.permiso_permiso_id_seq'::regclass);


--
-- TOC entry 6131 (class 2604 OID 17645)
-- Name: persona persona_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.persona ALTER COLUMN persona_id SET DEFAULT nextval('medico.persona_persona_id_seq'::regclass);


--
-- TOC entry 6175 (class 2604 OID 17933)
-- Name: personal personal_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.personal ALTER COLUMN personal_id SET DEFAULT nextval('medico.personal_personal_id_seq'::regclass);


--
-- TOC entry 6180 (class 2604 OID 17972)
-- Name: personal_especialidad personal_especialidad_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.personal_especialidad ALTER COLUMN personal_especialidad_id SET DEFAULT nextval('medico.personal_especialidad_personal_especialidad_id_seq'::regclass);


--
-- TOC entry 6290 (class 2604 OID 18868)
-- Name: personal_procedimiento personal_procedimiento_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.personal_procedimiento ALTER COLUMN personal_procedimiento_id SET DEFAULT nextval('medico.personal_procedimiento_personal_procedimiento_id_seq'::regclass);


--
-- TOC entry 6591 (class 2604 OID 20873)
-- Name: plan_mejora_auditoria plan_mejora_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.plan_mejora_auditoria ALTER COLUMN plan_mejora_id SET DEFAULT nextval('medico.plan_mejora_auditoria_plan_mejora_id_seq'::regclass);


--
-- TOC entry 6547 (class 2604 OID 20615)
-- Name: presupuesto presupuesto_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.presupuesto ALTER COLUMN presupuesto_id SET DEFAULT nextval('medico.presupuesto_presupuesto_id_seq'::regclass);


--
-- TOC entry 6058 (class 2604 OID 17170)
-- Name: prioridad_solicitud prioridad_solicitud_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.prioridad_solicitud ALTER COLUMN prioridad_solicitud_id SET DEFAULT nextval('medico.prioridad_solicitud_prioridad_solicitud_id_seq'::regclass);


--
-- TOC entry 6019 (class 2604 OID 16897)
-- Name: prioridad_triaje prioridad_triaje_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.prioridad_triaje ALTER COLUMN prioridad_triaje_id SET DEFAULT nextval('medico.prioridad_triaje_prioridad_triaje_id_seq'::regclass);


--
-- TOC entry 6286 (class 2604 OID 18838)
-- Name: procedimiento_realizado procedimiento_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.procedimiento_realizado ALTER COLUMN procedimiento_id SET DEFAULT nextval('medico.procedimiento_realizado_procedimiento_id_seq'::regclass);


--
-- TOC entry 6339 (class 2604 OID 19283)
-- Name: producto producto_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.producto ALTER COLUMN producto_id SET DEFAULT nextval('medico.producto_producto_id_seq'::regclass);


--
-- TOC entry 6329 (class 2604 OID 19215)
-- Name: proveedor proveedor_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.proveedor ALTER COLUMN proveedor_id SET DEFAULT nextval('medico.proveedor_proveedor_id_seq'::regclass);


--
-- TOC entry 6363 (class 2604 OID 19435)
-- Name: receta receta_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.receta ALTER COLUMN receta_id SET DEFAULT nextval('medico.receta_receta_id_seq'::regclass);


--
-- TOC entry 6678 (class 2604 OID 21348)
-- Name: recurso_fhir recurso_fhir_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.recurso_fhir ALTER COLUMN recurso_fhir_id SET DEFAULT nextval('medico.recurso_fhir_recurso_fhir_id_seq'::regclass);


--
-- TOC entry 6240 (class 2604 OID 18494)
-- Name: registro_signos_vitales registro_signos_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.registro_signos_vitales ALTER COLUMN registro_signos_id SET DEFAULT nextval('medico.registro_signos_vitales_registro_signos_id_seq'::regclass);


--
-- TOC entry 6596 (class 2604 OID 20906)
-- Name: reporte_configuracion reporte_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.reporte_configuracion ALTER COLUMN reporte_id SET DEFAULT nextval('medico.reporte_configuracion_reporte_id_seq'::regclass);


--
-- TOC entry 6602 (class 2604 OID 20931)
-- Name: reporte_parametro reporte_parametro_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.reporte_parametro ALTER COLUMN reporte_parametro_id SET DEFAULT nextval('medico.reporte_parametro_reporte_parametro_id_seq'::regclass);


--
-- TOC entry 6607 (class 2604 OID 20954)
-- Name: reporte_rol reporte_rol_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.reporte_rol ALTER COLUMN reporte_rol_id SET DEFAULT nextval('medico.reporte_rol_reporte_rol_id_seq'::regclass);


--
-- TOC entry 6421 (class 2604 OID 19854)
-- Name: resultado_laboratorio resultado_lab_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.resultado_laboratorio ALTER COLUMN resultado_lab_id SET DEFAULT nextval('medico.resultado_laboratorio_resultado_lab_id_seq'::regclass);


--
-- TOC entry 6415 (class 2604 OID 19826)
-- Name: resultado_parametro resultado_parametro_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.resultado_parametro ALTER COLUMN resultado_parametro_id SET DEFAULT nextval('medico.resultado_parametro_resultado_parametro_id_seq'::regclass);


--
-- TOC entry 6185 (class 2604 OID 17997)
-- Name: rol rol_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.rol ALTER COLUMN rol_id SET DEFAULT nextval('medico.rol_rol_id_seq'::regclass);


--
-- TOC entry 6190 (class 2604 OID 18029)
-- Name: rol_permiso rol_permiso_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.rol_permiso ALTER COLUMN rol_permiso_id SET DEFAULT nextval('medico.rol_permiso_rol_permiso_id_seq'::regclass);


--
-- TOC entry 6125 (class 2604 OID 17614)
-- Name: sede sede_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sede ALTER COLUMN sede_id SET DEFAULT nextval('medico.sede_sede_id_seq'::regclass);


--
-- TOC entry 6202 (class 2604 OID 18107)
-- Name: servicio_medico servicio_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.servicio_medico ALTER COLUMN servicio_id SET DEFAULT nextval('medico.servicio_medico_servicio_id_seq'::regclass);


--
-- TOC entry 5956 (class 2604 OID 16476)
-- Name: sexo sexo_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sexo ALTER COLUMN sexo_id SET DEFAULT nextval('medico.sexo_sexo_id_seq'::regclass);


--
-- TOC entry 6684 (class 2604 OID 21373)
-- Name: sincronizacion_fhir sincronizacion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sincronizacion_fhir ALTER COLUMN sincronizacion_id SET DEFAULT nextval('medico.sincronizacion_fhir_sincronizacion_id_seq'::regclass);


--
-- TOC entry 6008 (class 2604 OID 16826)
-- Name: sistema_corporal sistema_corporal_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sistema_corporal ALTER COLUMN sistema_corporal_id SET DEFAULT nextval('medico.sistema_corporal_sistema_corporal_id_seq'::regclass);


--
-- TOC entry 6671 (class 2604 OID 21327)
-- Name: sistema_externo sistema_externo_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sistema_externo ALTER COLUMN sistema_externo_id SET DEFAULT nextval('medico.sistema_externo_sistema_externo_id_seq'::regclass);


--
-- TOC entry 6391 (class 2604 OID 19628)
-- Name: solicitud_examen solicitud_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.solicitud_examen ALTER COLUMN solicitud_id SET DEFAULT nextval('medico.solicitud_examen_solicitud_id_seq'::regclass);


--
-- TOC entry 6099 (class 2604 OID 17432)
-- Name: subcategoria_balance subcategoria_balance_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.subcategoria_balance ALTER COLUMN subcategoria_balance_id SET DEFAULT nextval('medico.subcategoria_balance_subcategoria_balance_id_seq'::regclass);


--
-- TOC entry 6576 (class 2604 OID 20767)
-- Name: subcriterio_auditoria subcriterio_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.subcriterio_auditoria ALTER COLUMN subcriterio_id SET DEFAULT nextval('medico.subcriterio_auditoria_subcriterio_id_seq'::regclass);


--
-- TOC entry 6650 (class 2604 OID 21156)
-- Name: sugerencia_ia sugerencia_ia_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sugerencia_ia ALTER COLUMN sugerencia_ia_id SET DEFAULT nextval('medico.sugerencia_ia_sugerencia_ia_id_seq'::regclass);


--
-- TOC entry 6035 (class 2604 OID 16998)
-- Name: tipo_almacen tipo_almacen_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_almacen ALTER COLUMN tipo_almacen_id SET DEFAULT nextval('medico.tipo_almacen_tipo_almacen_id_seq'::regclass);


--
-- TOC entry 6025 (class 2604 OID 16940)
-- Name: tipo_alta tipo_alta_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_alta ALTER COLUMN tipo_alta_id SET DEFAULT nextval('medico.tipo_alta_tipo_alta_id_seq'::regclass);


--
-- TOC entry 5972 (class 2604 OID 16592)
-- Name: tipo_aseguradora tipo_aseguradora_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_aseguradora ALTER COLUMN tipo_aseguradora_id SET DEFAULT nextval('medico.tipo_aseguradora_tipo_aseguradora_id_seq'::regclass);


--
-- TOC entry 5991 (class 2604 OID 16711)
-- Name: tipo_atencion tipo_atencion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_atencion ALTER COLUMN tipo_atencion_id SET DEFAULT nextval('medico.tipo_atencion_tipo_atencion_id_seq'::regclass);


--
-- TOC entry 6103 (class 2604 OID 17462)
-- Name: tipo_auditoria tipo_auditoria_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_auditoria ALTER COLUMN tipo_auditoria_id SET DEFAULT nextval('medico.tipo_auditoria_tipo_auditoria_id_seq'::regclass);


--
-- TOC entry 6094 (class 2604 OID 17398)
-- Name: tipo_balance tipo_balance_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_balance ALTER COLUMN tipo_balance_id SET DEFAULT nextval('medico.tipo_balance_tipo_balance_id_seq'::regclass);


--
-- TOC entry 6081 (class 2604 OID 17325)
-- Name: tipo_caja tipo_caja_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_caja ALTER COLUMN tipo_caja_id SET DEFAULT nextval('medico.tipo_caja_tipo_caja_id_seq'::regclass);


--
-- TOC entry 5986 (class 2604 OID 16682)
-- Name: tipo_cama tipo_cama_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_cama ALTER COLUMN tipo_cama_id SET DEFAULT nextval('medico.tipo_cama_tipo_cama_id_seq'::regclass);


--
-- TOC entry 5999 (class 2604 OID 16767)
-- Name: tipo_cita tipo_cita_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_cita ALTER COLUMN tipo_cita_id SET DEFAULT nextval('medico.tipo_cita_tipo_cita_id_seq'::regclass);


--
-- TOC entry 6073 (class 2604 OID 17269)
-- Name: tipo_comprobante tipo_comprobante_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_comprobante ALTER COLUMN tipo_comprobante_id SET DEFAULT nextval('medico.tipo_comprobante_tipo_comprobante_id_seq'::regclass);


--
-- TOC entry 6117 (class 2604 OID 17568)
-- Name: tipo_consentimiento tipo_consentimiento_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_consentimiento ALTER COLUMN tipo_consentimiento_id SET DEFAULT nextval('medico.tipo_consentimiento_tipo_consentimiento_id_seq'::regclass);


--
-- TOC entry 5982 (class 2604 OID 16654)
-- Name: tipo_consultorio tipo_consultorio_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_consultorio ALTER COLUMN tipo_consultorio_id SET DEFAULT nextval('medico.tipo_consultorio_tipo_consultorio_id_seq'::regclass);


--
-- TOC entry 6015 (class 2604 OID 16869)
-- Name: tipo_diagnostico tipo_diagnostico_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_diagnostico ALTER COLUMN tipo_diagnostico_id SET DEFAULT nextval('medico.tipo_diagnostico_tipo_diagnostico_id_seq'::regclass);


--
-- TOC entry 5954 (class 2604 OID 16462)
-- Name: tipo_documento tipo_documento_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_documento ALTER COLUMN tipo_documento_id SET DEFAULT nextval('medico.tipo_documento_tipo_documento_id_seq'::regclass);


--
-- TOC entry 5995 (class 2604 OID 16739)
-- Name: tipo_episodio tipo_episodio_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_episodio ALTER COLUMN tipo_episodio_id SET DEFAULT nextval('medico.tipo_episodio_tipo_episodio_id_seq'::regclass);


--
-- TOC entry 6065 (class 2604 OID 17213)
-- Name: tipo_equipo_laboratorio tipo_equipo_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_equipo_laboratorio ALTER COLUMN tipo_equipo_id SET DEFAULT nextval('medico.tipo_equipo_laboratorio_tipo_equipo_id_seq'::regclass);


--
-- TOC entry 6010 (class 2604 OID 16840)
-- Name: tipo_evolucion tipo_evolucion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_evolucion ALTER COLUMN tipo_evolucion_id SET DEFAULT nextval('medico.tipo_evolucion_tipo_evolucion_id_seq'::regclass);


--
-- TOC entry 6384 (class 2604 OID 19597)
-- Name: tipo_examen tipo_examen_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_examen ALTER COLUMN tipo_examen_id SET DEFAULT nextval('medico.tipo_examen_tipo_examen_id_seq'::regclass);


--
-- TOC entry 6006 (class 2604 OID 16812)
-- Name: tipo_examen_fisico tipo_examen_fisico_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_examen_fisico ALTER COLUMN tipo_examen_fisico_id SET DEFAULT nextval('medico.tipo_examen_fisico_tipo_examen_fisico_id_seq'::regclass);


--
-- TOC entry 6040 (class 2604 OID 17032)
-- Name: tipo_forma_farmaceutica forma_farmaceutica_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_forma_farmaceutica ALTER COLUMN forma_farmaceutica_id SET DEFAULT nextval('medico.tipo_forma_farmaceutica_forma_farmaceutica_id_seq'::regclass);


--
-- TOC entry 6071 (class 2604 OID 17255)
-- Name: tipo_formato_imagen tipo_formato_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_formato_imagen ALTER COLUMN tipo_formato_id SET DEFAULT nextval('medico.tipo_formato_imagen_tipo_formato_id_seq'::regclass);


--
-- TOC entry 6013 (class 2604 OID 16855)
-- Name: tipo_indicacion tipo_indicacion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_indicacion ALTER COLUMN tipo_indicacion_id SET DEFAULT nextval('medico.tipo_indicacion_tipo_indicacion_id_seq'::regclass);


--
-- TOC entry 6115 (class 2604 OID 17552)
-- Name: tipo_mensaje_hl7 tipo_mensaje_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_mensaje_hl7 ALTER COLUMN tipo_mensaje_id SET DEFAULT nextval('medico.tipo_mensaje_hl7_tipo_mensaje_id_seq'::regclass);


--
-- TOC entry 6109 (class 2604 OID 17506)
-- Name: tipo_modelo_ia tipo_modelo_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_modelo_ia ALTER COLUMN tipo_modelo_id SET DEFAULT nextval('medico.tipo_modelo_ia_tipo_modelo_id_seq'::regclass);


--
-- TOC entry 6048 (class 2604 OID 17095)
-- Name: tipo_movimiento_almacen tipo_movimiento_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_movimiento_almacen ALTER COLUMN tipo_movimiento_id SET DEFAULT nextval('medico.tipo_movimiento_almacen_tipo_movimiento_id_seq'::regclass);


--
-- TOC entry 6062 (class 2604 OID 17198)
-- Name: tipo_muestra tipo_muestra_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_muestra ALTER COLUMN tipo_muestra_id SET DEFAULT nextval('medico.tipo_muestra_tipo_muestra_id_seq'::regclass);


--
-- TOC entry 5968 (class 2604 OID 16562)
-- Name: tipo_organizacion tipo_organizacion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_organizacion ALTER COLUMN tipo_organizacion_id SET DEFAULT nextval('medico.tipo_organizacion_tipo_organizacion_id_seq'::regclass);


--
-- TOC entry 5970 (class 2604 OID 16578)
-- Name: tipo_paciente tipo_paciente_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_paciente ALTER COLUMN tipo_paciente_id SET DEFAULT nextval('medico.tipo_paciente_tipo_paciente_id_seq'::regclass);


--
-- TOC entry 5974 (class 2604 OID 16606)
-- Name: tipo_personal tipo_personal_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_personal ALTER COLUMN tipo_personal_id SET DEFAULT nextval('medico.tipo_personal_tipo_personal_id_seq'::regclass);


--
-- TOC entry 6029 (class 2604 OID 16968)
-- Name: tipo_procedimiento tipo_procedimiento_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_procedimiento ALTER COLUMN tipo_procedimiento_id SET DEFAULT nextval('medico.tipo_procedimiento_tipo_procedimiento_id_seq'::regclass);


--
-- TOC entry 6113 (class 2604 OID 17536)
-- Name: tipo_recurso_fhir tipo_recurso_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_recurso_fhir ALTER COLUMN tipo_recurso_id SET DEFAULT nextval('medico.tipo_recurso_fhir_tipo_recurso_id_seq'::regclass);


--
-- TOC entry 6004 (class 2604 OID 16796)
-- Name: tipo_registro_signos_vitales tipo_registro_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_registro_signos_vitales ALTER COLUMN tipo_registro_id SET DEFAULT nextval('medico.tipo_registro_signos_vitales_tipo_registro_id_seq'::regclass);


--
-- TOC entry 6088 (class 2604 OID 17368)
-- Name: tipo_servicio_basico tipo_servicio_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_servicio_basico ALTER COLUMN tipo_servicio_id SET DEFAULT nextval('medico.tipo_servicio_basico_tipo_servicio_id_seq'::regclass);


--
-- TOC entry 5984 (class 2604 OID 16668)
-- Name: tipo_servicio_medico tipo_servicio_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_servicio_medico ALTER COLUMN tipo_servicio_id SET DEFAULT nextval('medico.tipo_servicio_medico_tipo_servicio_id_seq'::regclass);


--
-- TOC entry 6111 (class 2604 OID 17522)
-- Name: tipo_sugerencia_ia tipo_sugerencia_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_sugerencia_ia ALTER COLUMN tipo_sugerencia_id SET DEFAULT nextval('medico.tipo_sugerencia_ia_tipo_sugerencia_id_seq'::regclass);


--
-- TOC entry 6101 (class 2604 OID 17446)
-- Name: tipo_trama_susalud tipo_trama_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_trama_susalud ALTER COLUMN tipo_trama_id SET DEFAULT nextval('medico.tipo_trama_susalud_tipo_trama_id_seq'::regclass);


--
-- TOC entry 6027 (class 2604 OID 16954)
-- Name: tipo_transicion tipo_transicion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_transicion ALTER COLUMN tipo_transicion_id SET DEFAULT nextval('medico.tipo_transicion_tipo_transicion_id_seq'::regclass);


--
-- TOC entry 6557 (class 2604 OID 20673)
-- Name: trama_susalud trama_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.trama_susalud ALTER COLUMN trama_id SET DEFAULT nextval('medico.trama_susalud_trama_id_seq'::regclass);


--
-- TOC entry 6233 (class 2604 OID 18420)
-- Name: transicion_atencion transicion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.transicion_atencion ALTER COLUMN transicion_id SET DEFAULT nextval('medico.transicion_atencion_transicion_id_seq'::regclass);


--
-- TOC entry 6246 (class 2604 OID 18531)
-- Name: triaje triaje_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.triaje ALTER COLUMN triaje_id SET DEFAULT nextval('medico.triaje_triaje_id_seq'::regclass);


--
-- TOC entry 5966 (class 2604 OID 16546)
-- Name: ubigeo ubigeo_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.ubigeo ALTER COLUMN ubigeo_id SET DEFAULT nextval('medico.ubigeo_ubigeo_id_seq'::regclass);


--
-- TOC entry 6042 (class 2604 OID 17046)
-- Name: unidad_medida_farmacia unidad_medida_farmacia_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.unidad_medida_farmacia ALTER COLUMN unidad_medida_farmacia_id SET DEFAULT nextval('medico.unidad_medida_farmacia_unidad_medida_farmacia_id_seq'::regclass);


--
-- TOC entry 6046 (class 2604 OID 17081)
-- Name: unidad_medida_general unidad_medida_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.unidad_medida_general ALTER COLUMN unidad_medida_id SET DEFAULT nextval('medico.unidad_medida_general_unidad_medida_id_seq'::regclass);


--
-- TOC entry 6044 (class 2604 OID 17065)
-- Name: unidad_medida_laboratorio unidad_medida_lab_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.unidad_medida_laboratorio ALTER COLUMN unidad_medida_lab_id SET DEFAULT nextval('medico.unidad_medida_laboratorio_unidad_medida_lab_id_seq'::regclass);


--
-- TOC entry 6192 (class 2604 OID 18051)
-- Name: usuario usuario_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.usuario ALTER COLUMN usuario_id SET DEFAULT nextval('medico.usuario_usuario_id_seq'::regclass);


--
-- TOC entry 6638 (class 2604 OID 21096)
-- Name: valor_kpi valor_kpi_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.valor_kpi ALTER COLUMN valor_kpi_id SET DEFAULT nextval('medico.valor_kpi_valor_kpi_id_seq'::regclass);


--
-- TOC entry 6052 (class 2604 OID 17123)
-- Name: via_administracion via_administracion_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.via_administracion ALTER COLUMN via_administracion_id SET DEFAULT nextval('medico.via_administracion_via_administracion_id_seq'::regclass);


--
-- TOC entry 6023 (class 2604 OID 16926)
-- Name: via_ingreso_hospitalario via_ingreso_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.via_ingreso_hospitalario ALTER COLUMN via_ingreso_id SET DEFAULT nextval('medico.via_ingreso_hospitalario_via_ingreso_id_seq'::regclass);


--
-- TOC entry 6625 (class 2604 OID 21026)
-- Name: widget_dashboard widget_id; Type: DEFAULT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.widget_dashboard ALTER COLUMN widget_id SET DEFAULT nextval('medico.widget_dashboard_widget_id_seq'::regclass);


--
-- TOC entry 8186 (class 0 OID 18188)
-- Dependencies: 419
-- Data for Name: agenda; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.agenda (agenda_id, personal_id, consultorio_id, servicio_id, fecha, hora_inicio, hora_fin, intervalo_minutos, cupo_maximo, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8154 (class 0 OID 17780)
-- Dependencies: 387
-- Data for Name: alergia; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.alergia (alergia_id, codigo, nombre, tipo_alergia, gravedad, eliminado) FROM stdin;
\.


--
-- TOC entry 8346 (class 0 OID 21217)
-- Dependencies: 579
-- Data for Name: alerta_ia; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.alerta_ia (alerta_ia_id, modelo_id, tipo_alerta, paciente_id, atencion_id, receta_id, producto_id, nivel_severidad, mensaje, recomendacion, fecha_hora_generacion, fue_atendida, personal_atiende_id, accion_tomada, fecha_hora_atencion, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8234 (class 0 OID 19241)
-- Dependencies: 467
-- Data for Name: almacen; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.almacen (almacen_id, organizacion_id, sede_id, codigo, nombre, tipo_almacen_id, responsable_id, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8160 (class 0 OID 17840)
-- Dependencies: 393
-- Data for Name: antecedente_medico; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.antecedente_medico (antecedente_id, cie10_id, codigo, nombre, tipo_antecedente, categoria, eliminado) FROM stdin;
\.


--
-- TOC entry 8284 (class 0 OID 20199)
-- Dependencies: 517
-- Data for Name: apertura_caja; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.apertura_caja (apertura_id, caja_id, personal_id, fecha_apertura, fecha_cierre, turno, monto_inicial, monto_ingresos, monto_egresos, monto_final_sistema, efectivo_contado, tarjeta_credito, tarjeta_debito, transferencias, depositos, cheques, otros, monto_final_fisico, diferencia, observaciones, personal_supervisa_id, estado_caja_id, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8084 (class 0 OID 17153)
-- Dependencies: 317
-- Data for Name: area_examen; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.area_examen (area_examen_id, categoria_examen_id, codigo, nombre, eliminado) FROM stdin;
1	4	SANGRE	Exámenes en Sangre	f
2	5	ORINA	Exámenes en Orina	f
3	7	HECES	Exámenes en Heces	f
\.


--
-- TOC entry 8150 (class 0 OID 17730)
-- Dependencies: 383
-- Data for Name: aseguradora; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.aseguradora (aseguradora_id, ruc, razon_social, tipo_aseguradora_id, contacto, telefono, email, direccion, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8190 (class 0 OID 18274)
-- Dependencies: 423
-- Data for Name: atencion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.atencion (atencion_id, organizacion_id, sede_id, paciente_id, cita_id, numero_atencion, tipo_atencion_id, tipo_atencion_actual_id, fecha_hora_registro, fecha_hora_inicio, fecha_hora_fin, consultorio_id, cama_id, personal_responsable_id, estado_atencion_id, atencion_origen_id, observaciones_generales, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8318 (class 0 OID 20788)
-- Dependencies: 551
-- Data for Name: auditoria_hc; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.auditoria_hc (auditoria_hc_id, organizacion_id, atencion_id, hospitalizacion_id, tipo_auditoria_id, numero_auditoria, fecha_auditoria, auditor_id, hallazgos_generales, recomendaciones_generales, puntaje_total, puntaje_maximo, porcentaje_cumplimiento, calificacion, requiere_plan_mejora, fecha_seguimiento, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8300 (class 0 OID 20496)
-- Dependencies: 533
-- Data for Name: balance; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.balance (balance_id, organizacion_id, periodo_id, tipo_balance_id, fecha_generacion, total_ingresos, total_egresos, utilidad_bruta, gastos_operativos, gastos_administrativos, gastos_financieros, utilidad_operativa, utilidad_neta, observaciones, personal_elabora_id, personal_aprueba_id, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8282 (class 0 OID 20164)
-- Dependencies: 515
-- Data for Name: caja; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.caja (caja_id, organizacion_id, sede_id, codigo, nombre, tipo_caja_id, monto_inicial_default, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8182 (class 0 OID 18138)
-- Dependencies: 415
-- Data for Name: cama; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.cama (cama_id, sede_id, codigo, pabellon, piso, habitacion, numero_cama, tipo_cama_id, estado_cama_id, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8012 (class 0 OID 16618)
-- Dependencies: 245
-- Data for Name: cargo; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.cargo (cargo_id, codigo, nombre, tipo_personal_id, descripcion, eliminado) FROM stdin;
92	DIRECTOR_MED	Director Médico	106	Director del área médica	f
93	JEFE_SERVICIO	Jefe de Servicio	106	Jefe de servicio médico	f
94	MEDICO_ASISTENTE	Médico Asistente	106	Médico asistencial	f
95	MEDICO_RESIDENTE	Médico Residente	106	Médico en formación de especialidad	f
96	JEFE_ENFERMERIA	Jefe(a) de Enfermería	107	Jefe del servicio de enfermería	f
97	ENF_SERVICIO	Enfermera(o) de Servicio	107	Enfermera asistencial de servicio	f
98	TCO_ENF_SERV	Técnico(a) de Enfermería	114	Técnico de enfermería asistencial	f
99	FARMACEUTICO	Químico Farmacéutico	112	Responsable de farmacia	f
100	JEFE_LABORATORIO	Jefe de Laboratorio	111	Responsable del laboratorio clínico	f
101	RECEPCIONISTA	Recepcionista	117	Personal de recepción y admisión	f
102	CAJERO	Cajero(a)	117	Personal de caja	f
103	CONTADOR	Contador(a)	117	Responsable de contabilidad	f
104	GERENTE	Gerente General	117	Gerencia general	f
\.


--
-- TOC entry 8120 (class 0 OID 17409)
-- Dependencies: 353
-- Data for Name: categoria_balance; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.categoria_balance (categoria_balance_id, codigo, nombre, tipo_categoria, padre_id, nivel, eliminado) FROM stdin;
15	INGRESOS	Ingresos Totales	ingreso	\N	1	f
16	INGRESOS_OP	Ingresos Operativos	ingreso	\N	2	f
17	INGRESOS_NO_OP	Ingresos No Operativos	ingreso	\N	2	f
18	EGRESOS	Egresos Totales	egreso	\N	1	f
19	EGRESOS_OP	Egresos Operativos	egreso	\N	2	f
20	EGRESOS_ADM	Gastos Administrativos	egreso	\N	2	f
21	EGRESOS_FIN	Gastos Financieros	egreso	\N	2	f
\.


--
-- TOC entry 8082 (class 0 OID 17134)
-- Dependencies: 315
-- Data for Name: categoria_examen; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.categoria_examen (categoria_examen_id, codigo, nombre, padre_id, eliminado) FROM stdin;
1	LABORATORIO	Exámenes de Laboratorio	\N	f
2	IMAGENES	Exámenes de Imágenes	\N	f
3	PROCEDIMIENTOS	Procedimientos Diagnósticos	\N	f
4	HEMATOLOGIA	Hematología	1	f
5	BIOQUIMICA	Bioquímica	1	f
6	INMUNOLOGIA	Inmunología	1	f
7	MICROBIOLOGIA	Microbiología	1	f
8	RADIOLOGIA	Radiología	2	f
9	ECOGRAFIA	Ecografía	2	f
10	TOMOGRAFIA	Tomografía	2	f
11	RESONANCIA	Resonancia Magnética	2	f
\.


--
-- TOC entry 8112 (class 0 OID 17350)
-- Dependencies: 345
-- Data for Name: categoria_movimiento; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.categoria_movimiento (categoria_movimiento_id, codigo, nombre, tipo_movimiento, afecta_flujo, eliminado) FROM stdin;
50	INGR_VENTA	Venta de Servicios	ingreso	t	f
51	INGR_FARMACIA	Venta de Farmacia	ingreso	t	f
52	INGR_OTROS	Otros Ingresos	ingreso	t	f
53	EGR_COMPRA	Compra de Insumos	egreso	t	f
54	EGR_SERVICIO	Pago de Servicios	egreso	t	f
55	EGR_PLANILLA	Pago de Planilla	egreso	t	f
56	EGR_OTROS	Otros Egresos	egreso	t	f
\.


--
-- TOC entry 8066 (class 0 OID 17009)
-- Dependencies: 299
-- Data for Name: categoria_producto; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.categoria_producto (categoria_id, codigo, nombre, tipo_producto, padre_id, nivel, eliminado) FROM stdin;
1	MEDICAMENTOS	Medicamentos	medicamento	\N	1	f
2	INSUMOS_MED	Insumos Médicos	insumo	\N	1	f
3	REACTIVOS	Reactivos de Laboratorio	reactivo	\N	1	f
4	EQUIPOS	Equipos Médicos	equipo	\N	1	f
5	MED_ANTIBIOTICOS	Antibióticos	medicamento	1	2	f
6	MED_ANALGESICOS	Analgésicos	medicamento	1	2	f
7	MED_ANTIHIPERT	Antihipertensivos	medicamento	1	2	f
\.


--
-- TOC entry 8130 (class 0 OID 17489)
-- Dependencies: 363
-- Data for Name: categoria_reporte; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.categoria_reporte (categoria_reporte_id, codigo, nombre, icono, orden, eliminado) FROM stdin;
1	ASISTENCIAL	Reportes Asistenciales	fa-hospital	1	f
2	FINANCIERO	Reportes Financieros	fa-dollar-sign	2	f
3	ESTADISTICO	Reportes Estadísticos	fa-chart-bar	3	f
4	AUDITORIA	Reportes de Auditoría	fa-clipboard-check	4	f
5	FARMACIA	Reportes de Farmacia	fa-pills	5	f
6	LABORATORIO	Reportes de Laboratorio	fa-flask	6	f
\.


--
-- TOC entry 8158 (class 0 OID 17823)
-- Dependencies: 391
-- Data for Name: cie10; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.cie10 (cie10_id, codigo, descripcion, categoria, subcategoria, tipo_lista, sexo_aplicable, edad_min, edad_max, uso_estadistico, eliminado) FROM stdin;
\.


--
-- TOC entry 8210 (class 0 OID 18757)
-- Dependencies: 443
-- Data for Name: cie10_personalizado; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.cie10_personalizado (cie10_personalizado_id, cie10_id, organizacion_id, personal_id, descripcion_personalizada, codigo_interno, uso_frecuente, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8188 (class 0 OID 18224)
-- Dependencies: 421
-- Data for Name: cita; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.cita (cita_id, agenda_id, paciente_id, numero_cita, tipo_cita_id, motivo_consulta, motivo_consulta_predefinido_id, fecha_hora_programada, fecha_hora_inicio_real, fecha_hora_fin_real, duracion_minutos, estado_cita_id, observaciones, personal_registra_id, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8274 (class 0 OID 19973)
-- Dependencies: 507
-- Data for Name: comprobante; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.comprobante (comprobante_id, organizacion_id, tipo_comprobante_id, serie, numero, fecha_emision, fecha_vencimiento, paciente_id, atencion_id, tipo_documento_cliente_id, numero_documento_cliente, razon_social_cliente, direccion_cliente, email_cliente, moneda_id, tipo_cambio, forma_pago_id, subtotal, descuento_global, igv, total, comprobante_referencia_id, motivo_nota, estado_sunat, xml_url, pdf_url, cdr_url, hash_cpe, fecha_envio_sunat, observaciones, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8106 (class 0 OID 17308)
-- Dependencies: 339
-- Data for Name: concepto_facturacion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.concepto_facturacion (concepto_id, codigo, nombre, eliminado) FROM stdin;
57	CONSULTA	Consulta Médica	f
58	PROCEDIMIENTO	Procedimiento	f
59	CIRUGIA	Cirugía	f
60	HOSPITALIZACION	Hospitalización	f
61	FARMACIA	Medicamentos	f
62	LABORATORIO	Exámenes de Laboratorio	f
63	IMAGENES	Exámenes de Imágenes	f
64	EMERGENCIA	Atención de Emergencia	f
\.


--
-- TOC entry 8116 (class 0 OID 17379)
-- Dependencies: 349
-- Data for Name: concepto_planilla; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.concepto_planilla (concepto_planilla_id, codigo, nombre, tipo_concepto, es_imponible, es_tributable, eliminado) FROM stdin;
78	SUELDO_BASICO	Sueldo Básico	ingreso	t	t	f
79	ASIG_FAMILIAR	Asignación Familiar	ingreso	t	t	f
80	BONO_PRODUCTIVIDAD	Bono por Productividad	ingreso	t	t	f
81	HORAS_EXTRAS	Horas Extras	ingreso	t	t	f
82	SUBSIDIO	Subsidio	ingreso	f	f	f
83	DESC_AFP	Descuento AFP	descuento	f	f	f
84	DESC_ONP	Descuento ONP	descuento	f	f	f
85	DESC_RENTA_5TA	Descuento Renta 5ta Categoría	descuento	f	f	f
86	DESC_ADELANTO	Adelanto de Sueldo	descuento	f	f	f
87	DESC_PRESTAMO	Descuento por Préstamo	descuento	f	f	f
88	APORT_ESSALUD	Aporte EsSalud (Empleador)	aportacion	f	f	f
\.


--
-- TOC entry 8292 (class 0 OID 20373)
-- Dependencies: 525
-- Data for Name: concepto_planilla_personal; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.concepto_planilla_personal (concepto_planilla_personal_id, detalle_planilla_id, concepto_planilla_id, monto, observaciones, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8372 (class 0 OID 21611)
-- Dependencies: 605
-- Data for Name: configuracion_sistema; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.configuracion_sistema (configuracion_id, organizacion_id, clave, valor, tipo_dato, descripcion, categoria, modificable_usuario, fecha_modificacion, usuario_modifica_id) FROM stdin;
\.


--
-- TOC entry 8362 (class 0 OID 21463)
-- Dependencies: 595
-- Data for Name: consentimiento_informado; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.consentimiento_informado (consentimiento_id, paciente_id, atencion_id, tipo_consentimiento_id, fecha_hora, personal_informa_id, contenido_personalizado_html, riesgos_explicados, alternativas_explicadas, acepta, firma_paciente_url, huella_paciente_url, testigo_nombre, testigo_documento, firma_testigo_url, firma_profesional_url, observaciones, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8178 (class 0 OID 18076)
-- Dependencies: 411
-- Data for Name: consultorio; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.consultorio (consultorio_id, sede_id, codigo, nombre, tipo_consultorio_id, piso, area_m2, capacidad_personas, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8314 (class 0 OID 20740)
-- Dependencies: 547
-- Data for Name: criterio_auditoria; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.criterio_auditoria (criterio_id, tipo_auditoria_id, codigo, nombre, descripcion, peso_porcentual, valor_maximo, es_obligatorio, orden, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
1	1	HC_COMPLETA	Historia Clínica Completa	Verificar que la HC contenga todos los componentes requeridos	30.00	100.00	t	1	f	\N	2025-10-02 01:45:07.80276	\N	2025-10-02 01:45:07.80276	\N	\N
2	1	DIAGNOSTICO_CORRECTO	Diagnóstico Apropiado	Evaluación de la pertinencia del diagnóstico	25.00	100.00	t	2	f	\N	2025-10-02 01:45:07.80276	\N	2025-10-02 01:45:07.80276	\N	\N
3	1	TRATAMIENTO_ADECUADO	Tratamiento Adecuado	Verificar que el tratamiento sea apropiado para el diagnóstico	25.00	100.00	t	3	f	\N	2025-10-02 01:45:07.80276	\N	2025-10-02 01:45:07.80276	\N	\N
4	1	EVOLUCION_ADECUADA	Evolución y Seguimiento	Registro apropiado de evoluciones médicas	20.00	100.00	t	4	f	\N	2025-10-02 01:45:07.80276	\N	2025-10-02 01:45:07.80276	\N	\N
\.


--
-- TOC entry 8332 (class 0 OID 21007)
-- Dependencies: 565
-- Data for Name: dashboard_gerencial; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.dashboard_gerencial (dashboard_id, nombre, descripcion, categoria, configuracion_json, layout_json, refresh_automatico_minutos, orden, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8336 (class 0 OID 21045)
-- Dependencies: 569
-- Data for Name: dashboard_rol; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.dashboard_rol (dashboard_rol_id, dashboard_id, rol_id, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8320 (class 0 OID 20835)
-- Dependencies: 553
-- Data for Name: detalle_auditoria; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.detalle_auditoria (detalle_auditoria_id, auditoria_hc_id, criterio_id, subcriterio_id, opcion_cumplimiento_id, observacion, puntaje_obtenido, evidencia_documento_url, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8302 (class 0 OID 20556)
-- Dependencies: 535
-- Data for Name: detalle_balance; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.detalle_balance (detalle_balance_id, balance_id, categoria_balance_id, subcategoria_balance_id, concepto, monto, porcentaje_total, observaciones, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8276 (class 0 OID 20044)
-- Dependencies: 509
-- Data for Name: detalle_comprobante; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.detalle_comprobante (detalle_comprobante_id, comprobante_id, item, concepto_id, atencion_id, servicio_id, detalle_dispensacion_id, detalle_solicitud_examen_id, hospitalizacion_id, producto_id, descripcion, cantidad, unidad_medida_id, precio_unitario, descuento_porcentaje, descuento_monto, subtotal, igv, total, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8250 (class 0 OID 19562)
-- Dependencies: 483
-- Data for Name: detalle_dispensacion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.detalle_dispensacion (detalle_dispensacion_id, dispensacion_id, detalle_receta_id, lote_id, cantidad_entregada, precio_unitario, descuento, total, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8202 (class 0 OID 18601)
-- Dependencies: 435
-- Data for Name: detalle_examen_fisico; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.detalle_examen_fisico (detalle_examen_fisico_id, examen_fisico_id, sistema_corporal_id, hallazgos_normales, hallazgos_anormales, descripcion_detallada, orden, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8242 (class 0 OID 19406)
-- Dependencies: 475
-- Data for Name: detalle_movimiento_almacen; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.detalle_movimiento_almacen (detalle_movimiento_id, movimiento_id, lote_id, cantidad, costo_unitario, precio_unitario, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8290 (class 0 OID 20341)
-- Dependencies: 523
-- Data for Name: detalle_planilla; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.detalle_planilla (detalle_planilla_id, periodo_planilla_id, personal_id, dias_laborados, dias_subsidio, sueldo_basico, total_remuneraciones, total_descuentos, total_aportaciones, neto_pagar, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8246 (class 0 OID 19479)
-- Dependencies: 479
-- Data for Name: detalle_receta; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.detalle_receta (detalle_receta_id, receta_id, diagnostico_atencion_id, producto_id, cantidad_prescrita, dosis, frecuencia, duracion_dias, via_administracion_id, indicaciones_especificas, unidad_medida_farmacia_id, cantidad_dispensada, cantidad_pendiente, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8256 (class 0 OID 19677)
-- Dependencies: 489
-- Data for Name: detalle_solicitud_examen; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.detalle_solicitud_examen (detalle_solicitud_id, solicitud_id, tipo_examen_id, diagnostico_atencion_id, observaciones_solicitud, estado_solicitud_id, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8312 (class 0 OID 20712)
-- Dependencies: 545
-- Data for Name: detalle_trama_atencion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.detalle_trama_atencion (detalle_trama_id, trama_id, atencion_id, linea_numero, datos_enviados_json, estado_registro, mensaje_error, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8212 (class 0 OID 18790)
-- Dependencies: 445
-- Data for Name: diagnostico_atencion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.diagnostico_atencion (diagnostico_atencion_id, atencion_id, episodio_id, cie10_id, cie10_personalizado_id, tipo_diagnostico_id, orden_diagnostico_id, descripcion_ampliada, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8248 (class 0 OID 19522)
-- Dependencies: 481
-- Data for Name: dispensacion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.dispensacion (dispensacion_id, receta_id, almacen_id, fecha_hora, personal_id, movimiento_almacen_id, tipo_dispensacion, observaciones, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8364 (class 0 OID 21501)
-- Dependencies: 597
-- Data for Name: documento_clinico; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.documento_clinico (documento_clinico_id, tipo_documento, paciente_id, atencion_id, personal_genera_id, numero_documento, fecha_emision, contenido_html, archivo_pdf_url, requiere_firma_digital, firma_digital_hash, impreso, fecha_impresion, veces_impreso, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8208 (class 0 OID 18730)
-- Dependencies: 441
-- Data for Name: ejecucion_indicacion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.ejecucion_indicacion (ejecucion_id, indicacion_id, fecha_hora_programada, fecha_hora_real, personal_ejecuta_id, realizado, motivo_no_realizacion, observaciones, reaccion_adversa, lote_id, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8330 (class 0 OID 20978)
-- Dependencies: 563
-- Data for Name: ejecucion_reporte; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.ejecucion_reporte (ejecucion_id, reporte_id, usuario_id, fecha_hora_ejecucion, parametros_usados_json, tiempo_ejecucion_segundos, archivo_resultado_url, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8348 (class 0 OID 21268)
-- Dependencies: 581
-- Data for Name: entrenamiento_modelo; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.entrenamiento_modelo (entrenamiento_id, modelo_id, version_entrenamiento, fecha_inicio, fecha_fin, dataset_utilizado, cantidad_registros, parametros_json, metricas_json, mejor_epoca, personal_responsable_id, observaciones, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8192 (class 0 OID 18351)
-- Dependencies: 425
-- Data for Name: episodio_clinico; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.episodio_clinico (episodio_id, atencion_id, tipo_episodio_id, numero_episodio, fecha_hora_inicio, fecha_hora_fin, servicio_id, cama_id, personal_responsable_id, diagnostico_ingreso_episodio_id, diagnostico_salida_episodio_id, estado_episodio_id, episodio_origen_id, motivo_transicion, observaciones, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8014 (class 0 OID 16634)
-- Dependencies: 247
-- Data for Name: especialidad_medica; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.especialidad_medica (especialidad_id, codigo, nombre, descripcion, requiere_rne, eliminado) FROM stdin;
176	MED_INTERNA	Medicina Interna	Especialidad en medicina interna	t	f
177	PEDIATRIA	Pediatría	Especialidad en atención infantil	t	f
178	GINECOLOGIA	Ginecología y Obstetricia	Especialidad en salud de la mujer	t	f
179	CIRUGIA_GRAL	Cirugía General	Especialidad quirúrgica general	t	f
180	TRAUMATOLOGIA	Traumatología y Ortopedia	Especialidad en sistema musculoesquelético	t	f
181	CARDIOLOGIA	Cardiología	Especialidad en enfermedades cardiovasculares	t	f
182	NEUMOLOGIA	Neumología	Especialidad en enfermedades respiratorias	t	f
183	GASTROENTGIA	Gastroenterología	Especialidad en sistema digestivo	t	f
184	NEFROLOGIA	Nefrología	Especialidad en enfermedades renales	t	f
185	UROLOGIA	Urología	Especialidad en sistema urinario	t	f
186	OFTALMOLOGIA	Oftalmología	Especialidad en enfermedades oculares	t	f
187	ORL	Otorrinolaringología	Especialidad en oídos, nariz y garganta	t	f
188	DERMATOLOGIA	Dermatología	Especialidad en enfermedades de la piel	t	f
189	NEUROLOGIA	Neurología	Especialidad en sistema nervioso	t	f
190	PSIQUIATRIA	Psiquiatría	Especialidad en salud mental	t	f
191	ENDOCRINOLOGIA	Endocrinología	Especialidad en sistema endocrino	t	f
192	REUMATOLOGIA	Reumatología	Especialidad en enfermedades reumáticas	t	f
193	ONCOLOGIA	Oncología Médica	Especialidad en cáncer	t	f
194	ANESTESIOLOGIA	Anestesiología	Especialidad en anestesia	t	f
195	RADIOLOGIA	Radiología	Especialidad en diagnóstico por imágenes	t	f
196	PATOLOGIA	Patología Clínica	Especialidad en análisis de laboratorio	t	f
197	MED_EMERGENCIA	Medicina de Emergencias	Especialidad en atención de emergencias	t	f
198	MED_INTENSIVA	Medicina Intensiva	Especialidad en cuidados intensivos	t	f
199	MED_FAMILIAR	Medicina Familiar	Especialidad en atención familiar integral	t	f
200	MED_GENERAL	Medicina General	Médico general sin especialidad	f	f
\.


--
-- TOC entry 8026 (class 0 OID 16722)
-- Dependencies: 259
-- Data for Name: estado_atencion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.estado_atencion (estado_atencion_id, codigo, nombre, color_hex, eliminado) FROM stdin;
1	REGISTRADA	Registrada	#6C757D	f
2	EN_TRIAJE	En Triaje	#FFC107	f
3	EN_EVALUACION	En Evaluación	#17A2B8	f
4	EN_TRATAMIENTO	En Tratamiento	#007BFF	f
5	EN_OBSERVACION	En Observación	#FD7E14	f
6	REQUIERE_HOSP	Requiere Hospitalización	#DC3545	f
7	HOSPITALIZADO	Hospitalizado	#E83E8C	f
8	FINALIZADA	Finalizada	#28A745	f
9	ALTA	Alta	#20C997	f
10	CANCELADA	Cancelada	#6C757D	f
\.


--
-- TOC entry 8110 (class 0 OID 17336)
-- Dependencies: 343
-- Data for Name: estado_caja; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.estado_caja (estado_caja_id, codigo, nombre, eliminado) FROM stdin;
1	CERRADA	Cerrada	f
2	ABIERTA	Abierta	f
3	EN_ARQUEO	En Arqueo	f
4	SUSPENDIDA	Suspendida	f
\.


--
-- TOC entry 8022 (class 0 OID 16694)
-- Dependencies: 255
-- Data for Name: estado_cama; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.estado_cama (estado_cama_id, codigo, nombre, color_hex, eliminado) FROM stdin;
36	DISPONIBLE	Disponible	#28A745	f
37	OCUPADA	Ocupada	#DC3545	f
38	LIMPIEZA	En Limpieza	#FFC107	f
39	MANTENIMIENTO	En Mantenimiento	#6C757D	f
40	RESERVADA	Reservada	#17A2B8	f
\.


--
-- TOC entry 8034 (class 0 OID 16779)
-- Dependencies: 267
-- Data for Name: estado_cita; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.estado_cita (estado_cita_id, codigo, nombre, color_hex, eliminado) FROM stdin;
1	PROGRAMADA	Programada	#007BFF	f
2	CONFIRMADA	Confirmada	#28A745	f
3	EN_ATENCION	En Atención	#FFC107	f
4	ATENDIDA	Atendida	#20C997	f
5	CANCELADA	Cancelada	#6C757D	f
6	NO_ASISTIO	No Asistió	#DC3545	f
\.


--
-- TOC entry 7994 (class 0 OID 16487)
-- Dependencies: 227
-- Data for Name: estado_civil; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.estado_civil (estado_civil_id, codigo, nombre, eliminado) FROM stdin;
1	SOLTERO	Soltero(a)	f
2	CASADO	Casado(a)	f
3	VIUDO	Viudo(a)	f
4	DIVORCIADO	Divorciado(a)	f
5	CONVIVIENTE	Conviviente	f
\.


--
-- TOC entry 8030 (class 0 OID 16750)
-- Dependencies: 263
-- Data for Name: estado_episodio; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.estado_episodio (estado_episodio_id, codigo, nombre, eliminado) FROM stdin;
1	ACTIVO	Activo	f
2	FINALIZADO	Finalizado	f
3	TRANSFERIDO	Transferido	f
4	CANCELADO	Cancelado	f
\.


--
-- TOC entry 8062 (class 0 OID 16981)
-- Dependencies: 295
-- Data for Name: estado_interconsulta; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.estado_interconsulta (estado_interconsulta_id, codigo, nombre, eliminado) FROM stdin;
36	SOLICITADA	Solicitada	f
37	ACEPTADA	Aceptada	f
38	EN_EVALUACION	En Evaluación	f
39	ATENDIDA	Atendida	f
40	CANCELADA	Cancelada	f
\.


--
-- TOC entry 8078 (class 0 OID 17106)
-- Dependencies: 311
-- Data for Name: estado_receta; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.estado_receta (estado_receta_id, codigo, nombre, eliminado) FROM stdin;
1	PENDIENTE	Pendiente	f
2	DISPENSADA_PARCIAL	Dispensada Parcial	f
3	DISPENSADA_TOTAL	Dispensada Total	f
4	ANULADA	Anulada	f
9	VENCIDA	Vencida	f
\.


--
-- TOC entry 8096 (class 0 OID 17238)
-- Dependencies: 329
-- Data for Name: estado_resultado_laboratorio; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.estado_resultado_laboratorio (estado_resultado_id, codigo, nombre, eliminado) FROM stdin;
36	PENDIENTE	Pendiente	f
37	EN_PROCESO	En Proceso	f
38	VALIDADO	Validado	f
39	ENTREGADO	Entregado	f
40	CORREGIDO	Corregido	f
\.


--
-- TOC entry 8088 (class 0 OID 17181)
-- Dependencies: 321
-- Data for Name: estado_solicitud_examen; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.estado_solicitud_examen (estado_solicitud_id, codigo, nombre, eliminado) FROM stdin;
36	REGISTRADA	Registrada	f
37	EN_PROCESO	En Proceso	f
38	COMPLETADA	Completada	f
39	ENTREGADA	Entregada	f
40	CANCELADA	Cancelada	f
\.


--
-- TOC entry 8204 (class 0 OID 18626)
-- Dependencies: 437
-- Data for Name: evolucion_clinica; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.evolucion_clinica (evolucion_id, tipo_evolucion_id, atencion_id, episodio_id, numero_dia_hospitalizacion, fecha_hora, personal_evoluciona_id, especialidad_id, subjetivo_texto, objetivo_texto, analisis_texto, plan_texto, evolucion_narrativa, registro_signos_vitales_id, examen_fisico_id, observaciones, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8200 (class 0 OID 18565)
-- Dependencies: 433
-- Data for Name: examen_fisico; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.examen_fisico (examen_fisico_id, tipo_examen_fisico_id, atencion_id, episodio_id, fecha_hora, personal_examina_id, aspecto_general, estado_nutricional, estado_hidratacion, coloracion_piel, observaciones_generales, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8268 (class 0 OID 19883)
-- Dependencies: 501
-- Data for Name: examen_imagen; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.examen_imagen (examen_imagen_id, detalle_solicitud_id, fecha_hora_realizacion, personal_realiza_id, tipo_equipo_id, tecnica_utilizada, contraste_utilizado, volumen_contraste_ml, dosis_radiacion_mgy, numero_imagenes, observaciones_tecnicas, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8260 (class 0 OID 19749)
-- Dependencies: 493
-- Data for Name: examen_laboratorio; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.examen_laboratorio (examen_lab_id, detalle_solicitud_id, muestra_id, fecha_hora_proceso, personal_procesa_id, tipo_equipo_id, metodo_id, estado_resultado_id, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 7998 (class 0 OID 16515)
-- Dependencies: 231
-- Data for Name: factor_rh; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.factor_rh (factor_rh_id, codigo, nombre, eliminado) FROM stdin;
1	+	Positivo	f
2	-	Negativo	f
\.


--
-- TOC entry 8052 (class 0 OID 16909)
-- Dependencies: 285
-- Data for Name: forma_llegada; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.forma_llegada (forma_llegada_id, codigo, nombre, eliminado) FROM stdin;
36	CAMINANDO	Caminando	f
37	SILLA_RUEDAS	En Silla de Ruedas	f
38	CAMILLA	En Camilla	f
39	AMBULANCIA	En Ambulancia	f
40	CARGADO	Cargado	f
\.


--
-- TOC entry 8104 (class 0 OID 17294)
-- Dependencies: 337
-- Data for Name: forma_pago; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.forma_pago (forma_pago_id, codigo, nombre, eliminado) FROM stdin;
1	EFECTIVO	Efectivo	f
2	TARJETA_CREDITO	Tarjeta de Crédito	f
3	TARJETA_DEBITO	Tarjeta de Débito	f
4	TRANSFERENCIA	Transferencia Bancaria	f
5	DEPOSITO	Depósito Bancario	f
6	CHEQUE	Cheque	f
7	CREDITO	Crédito	f
\.


--
-- TOC entry 7996 (class 0 OID 16501)
-- Dependencies: 229
-- Data for Name: grupo_sanguineo; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.grupo_sanguineo (grupo_sanguineo_id, codigo, nombre, eliminado) FROM stdin;
1	A	A	f
2	B	B	f
3	AB	AB	f
4	O	O	f
\.


--
-- TOC entry 8220 (class 0 OID 18940)
-- Dependencies: 453
-- Data for Name: historia_clinica_ambulatoria; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.historia_clinica_ambulatoria (historia_ambulatoria_id, atencion_id, episodio_id, registro_signos_vitales_id, examen_fisico_id, motivo_consulta, tiempo_enfermedad, forma_inicio, curso_enfermedad, relato_cronologico, sintomas_principales, funciones_biologicas_apetito, funciones_biologicas_sed, "funciones_biologicas_sueño", funciones_biologicas_diuresis, funciones_biologicas_deposiciones, funciones_biologicas_otros, impresion_diagnostica, plan_diagnostico, plan_terapeutico, educacion_paciente, pronostico, fecha_proximo_control, observaciones, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8222 (class 0 OID 18975)
-- Dependencies: 455
-- Data for Name: historia_clinica_emergencia; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.historia_clinica_emergencia (historia_emergencia_id, atencion_id, episodio_id, registro_signos_vitales_id, fecha_hora_ingreso_emergencia, forma_llegada_id, prioridad_triaje_id, "acompañante_nombre", "acompañante_parentesco_id", "acompañante_telefono", "acompañante_documento", motivo_ingreso, relato_breve_emergencia, circunstancia_evento, impresion_inicial, tipo_destino, servicio_destino_id, establecimiento_destino, condicion_destino, diagnostico_salida_emergencia_id, indicaciones_alta_emergencia, fecha_hora_salida_emergencia, personal_alta_id, observaciones, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8228 (class 0 OID 19118)
-- Dependencies: 461
-- Data for Name: historia_clinica_hospitalizacion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.historia_clinica_hospitalizacion (historia_hospitalizacion_id, hospitalizacion_id, episodio_id, atencion_id, registro_signos_vitales_ingreso_id, examen_fisico_ingreso_id, via_ingreso_id, fecha_hora_ingreso, enfermedad_actual, tiempo_enfermedad, forma_inicio, curso_enfermedad, sintomas_principales, relato_cronologico, revision_sistemas_respiratorio, revision_sistemas_cardiovascular, revision_sistemas_digestivo, revision_sistemas_genitourinario, revision_sistemas_neurologico, revision_sistemas_musculoesqueletico, revision_sistemas_otros, antecedentes_personales_resumen, antecedentes_familiares_resumen, alergias_resumen, medicacion_habitual, hospitalizaciones_previas_resumen, cirugias_previas_resumen, impresion_diagnostica_ingreso, plan_trabajo_inicial, pronostico_inicial, fecha_hora_elaboracion_epicrisis, personal_elabora_epicrisis_id, resumen_hospitalizacion, evolucion_general, examenes_auxiliares_resumen, tratamiento_recibido_resumen, condicion_alta, diagnostico_alta_principal_id, pronostico_alta, recomendaciones_alta, medicacion_alta, controles_posteriores, limitaciones_restricciones, observaciones_epicrisis, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8224 (class 0 OID 19036)
-- Dependencies: 457
-- Data for Name: hospitalizacion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.hospitalizacion (hospitalizacion_id, episodio_id, atencion_id, paciente_id, numero_hospitalizacion, fecha_hora_ingreso_hospitalario, fecha_hora_alta_hospitalaria, cama_actual_id, servicio_actual_id, tipo_alta_id, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8270 (class 0 OID 19915)
-- Dependencies: 503
-- Data for Name: imagen_digital; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.imagen_digital (imagen_id, examen_imagen_id, ruta_archivo, tipo_formato_id, "tamaño_bytes", numero_orden, serie_dicom, descripcion_imagen, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8206 (class 0 OID 18677)
-- Dependencies: 439
-- Data for Name: indicacion_medica; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.indicacion_medica (indicacion_id, tipo_indicacion_id, atencion_id, episodio_id, evolucion_id, fecha_hora_indicacion, personal_indica_id, descripcion, frecuencia, duracion, via_administracion_id, dosis, fecha_hora_inicio, fecha_hora_fin, prioridad, estado, fecha_hora_suspension, motivo_suspension, personal_suspende_id, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8304 (class 0 OID 20588)
-- Dependencies: 537
-- Data for Name: indicador_financiero; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.indicador_financiero (indicador_id, periodo_id, nombre_indicador, formula, valor, unidad, valor_objetivo, semaforo, fecha_calculo, observaciones, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8338 (class 0 OID 21069)
-- Dependencies: 571
-- Data for Name: indicador_kpi; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.indicador_kpi (kpi_id, codigo, nombre, descripcion, categoria, formula, query_sql, unidad_medida, meta_valor, umbral_critico, umbral_alerta, frecuencia_calculo, widget_id, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8272 (class 0 OID 19941)
-- Dependencies: 505
-- Data for Name: informe_imagen; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.informe_imagen (informe_imagen_id, examen_imagen_id, fecha_hora_informe, personal_informa_id, tecnica_descripcion, hallazgos, comparacion_previos, impresion_diagnostica, recomendaciones, estado_resultado_id, fecha_hora_entrega, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8280 (class 0 OID 20141)
-- Dependencies: 513
-- Data for Name: integracion_nubefact; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.integracion_nubefact (integracion_id, comprobante_id, fecha_envio, request_json, response_json, codigo_respuesta, mensaje_respuesta, numero_ticket, enlace_pdf, enlace_xml, codigo_sunat, intentos, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8218 (class 0 OID 18890)
-- Dependencies: 451
-- Data for Name: interconsulta; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.interconsulta (interconsulta_id, atencion_id, episodio_id, numero_interconsulta, fecha_hora_solicitud, personal_solicita_id, especialidad_solicitada_id, personal_interconsultor_id, motivo_interconsulta, antecedentes_relevantes, pregunta_especifica, prioridad, fecha_hora_atencion, evaluacion_interconsultor, diagnostico_interconsultor, recomendaciones, requiere_seguimiento, estado_interconsulta_id, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8370 (class 0 OID 21580)
-- Dependencies: 603
-- Data for Name: log_acceso_hc; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.log_acceso_hc (log_acceso_hc_id, usuario_id, paciente_id, atencion_id, tipo_acceso, modulo, fecha_hora, ip_origen, justificacion, tiempo_acceso_segundos) FROM stdin;
\.


--
-- TOC entry 8368 (class 0 OID 21561)
-- Dependencies: 601
-- Data for Name: log_acceso_sistema; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.log_acceso_sistema (log_acceso_id, usuario_id, tipo_evento, fecha_hora, ip_origen, navegador, sistema_operativo, dispositivo, ubicacion_geografica, exitoso, mensaje) FROM stdin;
\.


--
-- TOC entry 8366 (class 0 OID 21541)
-- Dependencies: 599
-- Data for Name: log_auditoria_sistema; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.log_auditoria_sistema (log_auditoria_id, tabla_afectada, operacion, registro_id, usuario_id, fecha_hora, ip_origen, user_agent, valores_anteriores_json, valores_nuevos_json, motivo_cambio, observaciones) FROM stdin;
\.


--
-- TOC entry 8350 (class 0 OID 21295)
-- Dependencies: 583
-- Data for Name: log_ia; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.log_ia (log_ia_id, modelo_id, usuario_id, tipo_operacion, fecha_hora, entrada_json, salida_json, tiempo_respuesta_ms, exitoso, mensaje_error, ip_origen, user_agent, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8238 (class 0 OID 19317)
-- Dependencies: 471
-- Data for Name: lote_producto; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.lote_producto (lote_id, producto_id, almacen_id, numero_lote, fecha_fabricacion, fecha_vencimiento, cantidad_actual, costo_unitario, proveedor_id, ubicacion_fisica, estado_lote, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8360 (class 0 OID 21436)
-- Dependencies: 593
-- Data for Name: mapeo_codigo; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.mapeo_codigo (mapeo_codigo_id, sistema_origen, codigo_origen, descripcion_origen, sistema_destino, codigo_destino, descripcion_destino, tipo_mapeo, es_bidireccional, personal_registra_id, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8226 (class 0 OID 19086)
-- Dependencies: 459
-- Data for Name: medico_hospitalizacion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.medico_hospitalizacion (medico_hospitalizacion_id, hospitalizacion_id, episodio_id, personal_id, tipo_participacion, fecha_inicio, fecha_fin, es_responsable_actual, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8358 (class 0 OID 21402)
-- Dependencies: 591
-- Data for Name: mensaje_hl7; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.mensaje_hl7 (mensaje_hl7_id, tipo_mensaje_id, sistema_externo_id, control_id, mensaje_contenido, direccion, fecha_hora_envio, fecha_hora_respuesta, ack_recibido, ack_contenido, codigo_ack, estado, mensaje_error, intentos, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8094 (class 0 OID 17224)
-- Dependencies: 327
-- Data for Name: metodo_examen; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.metodo_examen (metodo_id, codigo, nombre, eliminado) FROM stdin;
43	AUTOMATIZADO	Método Automatizado	f
44	MANUAL	Método Manual	f
45	SEMITITATIVO	Método Semicuantitativo	f
46	ESPECFOTOMETRIA	Espectrofotometría	f
47	INMUNOLOGIA	Método Inmunológico	f
48	MICROSCOPIO	Microscopía	f
\.


--
-- TOC entry 8342 (class 0 OID 21122)
-- Dependencies: 575
-- Data for Name: modelo_ia; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.modelo_ia (modelo_id, codigo, nombre, tipo_modelo_id, descripcion, version, fecha_entrenamiento, fecha_despliegue, precision_porcentaje, recall_porcentaje, f1_score, especialidad_id, area_aplicacion, ruta_modelo, configuracion_json, requiere_aprobacion_humana, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8102 (class 0 OID 17280)
-- Dependencies: 335
-- Data for Name: moneda; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.moneda (moneda_id, codigo, nombre, simbolo, eliminado) FROM stdin;
1	PEN	Sol Peruano	S/	f
2	USD	Dólar Americano	$	f
3	EUR	Euro	€	f
\.


--
-- TOC entry 8184 (class 0 OID 18169)
-- Dependencies: 417
-- Data for Name: motivo_consulta_predefinido; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.motivo_consulta_predefinido (motivo_consulta_id, especialidad_id, descripcion, estado, eliminado) FROM stdin;
1	181	Dolor torácico	activo	f
2	189	Cefalea	activo	f
3	178	Control prenatal	activo	f
4	177	Control de crecimiento y desarrollo	activo	f
\.


--
-- TOC entry 8240 (class 0 OID 19354)
-- Dependencies: 473
-- Data for Name: movimiento_almacen; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.movimiento_almacen (movimiento_id, organizacion_id, almacen_id, tipo_movimiento_id, numero_documento, fecha_hora, personal_id, proveedor_id, almacen_destino_id, motivo, observaciones, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8286 (class 0 OID 20250)
-- Dependencies: 519
-- Data for Name: movimiento_caja; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.movimiento_caja (movimiento_caja_id, apertura_id, tipo_movimiento, categoria_movimiento_id, numero_operacion, fecha_hora, comprobante_id, pago_comprobante_id, monto, forma_pago_id, moneda_id, tipo_cambio, concepto, proveedor_id, personal_beneficiario_id, pago_servicio_id, documento_sustento, observaciones, personal_autoriza_id, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8230 (class 0 OID 19174)
-- Dependencies: 463
-- Data for Name: movimiento_cama; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.movimiento_cama (movimiento_cama_id, hospitalizacion_id, cama_origen_id, cama_destino_id, fecha_hora_movimiento, motivo, personal_autoriza_id, observaciones, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8258 (class 0 OID 19713)
-- Dependencies: 491
-- Data for Name: muestra_laboratorio; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.muestra_laboratorio (muestra_id, solicitud_id, codigo_muestra, tipo_muestra_id, fecha_hora_toma, personal_toma_id, volumen_ml, numero_tubos, condiciones_muestra, observaciones, rechazada, motivo_rechazo, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8128 (class 0 OID 17475)
-- Dependencies: 361
-- Data for Name: opcion_cumplimiento; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.opcion_cumplimiento (opcion_cumplimiento_id, codigo, nombre, valor_numerico, color_hex, eliminado) FROM stdin;
17	CUMPLE	Cumple	100.00	#28A745	f
18	CUMPLE_PARCIAL	Cumple Parcialmente	50.00	#FFC107	f
19	NO_CUMPLE	No Cumple	0.00	#DC3545	f
20	NO_APLICA	No Aplica	\N	#6C757D	f
\.


--
-- TOC entry 8048 (class 0 OID 16880)
-- Dependencies: 281
-- Data for Name: orden_diagnostico; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.orden_diagnostico (orden_diagnostico_id, codigo, nombre, eliminado) FROM stdin;
29	PRIMERO	Primer Diagnóstico	f
30	SEGUNDO	Segundo Diagnóstico	f
31	TERCERO	Tercer Diagnóstico	f
32	CUARTO	Cuarto Diagnóstico	f
\.


--
-- TOC entry 8142 (class 0 OID 17582)
-- Dependencies: 375
-- Data for Name: organizacion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.organizacion (organizacion_id, ruc, razon_social, nombre_comercial, tipo_organizacion_id, direccion_fiscal, ubigeo_id, telefono, email, logo_url, representante_legal, fecha_constitucion, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
1	12345678901	Clínica Test	Clínica Test	50	Av. Test 123	1	123456789	test@test.com		Admin Test	2025-10-04	activo	f	1	2025-10-04 12:33:33.524512	1	2025-10-04 12:33:33.524512	\N	\N
\.


--
-- TOC entry 8148 (class 0 OID 17693)
-- Dependencies: 381
-- Data for Name: paciente; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.paciente (paciente_id, persona_id, organizacion_id, numero_historia_clinica, tipo_paciente_id, fecha_registro, medico_cabecera_id, observaciones, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
2	2	1	HC-21853000	36	2025-10-20	\N	\N	activo	f	\N	2025-10-20 21:30:44.843542	\N	2025-10-20 21:30:44.843544	\N	\N
\.


--
-- TOC entry 8156 (class 0 OID 17796)
-- Dependencies: 389
-- Data for Name: paciente_alergia; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.paciente_alergia (paciente_alergia_id, paciente_id, alergia_id, descripcion, fecha_deteccion, observaciones, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8164 (class 0 OID 17893)
-- Dependencies: 397
-- Data for Name: paciente_antecedente_familiar; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.paciente_antecedente_familiar (paciente_antecedente_familiar_id, paciente_id, antecedente_id, cie10_id, parentesco_id, observaciones, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8162 (class 0 OID 17861)
-- Dependencies: 395
-- Data for Name: paciente_antecedente_personal; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.paciente_antecedente_personal (paciente_antecedente_personal_id, paciente_id, antecedente_id, cie10_id, fecha_diagnostico, tratamiento_recibido, observaciones, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8152 (class 0 OID 17754)
-- Dependencies: 385
-- Data for Name: paciente_aseguradora; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.paciente_aseguradora (paciente_aseguradora_id, paciente_id, aseguradora_id, numero_poliza, fecha_inicio, fecha_fin, categoria_asegurado, plan, es_principal, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8278 (class 0 OID 20113)
-- Dependencies: 511
-- Data for Name: pago_comprobante; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.pago_comprobante (pago_comprobante_id, comprobante_id, fecha_pago, monto_pagado, forma_pago_id, numero_operacion, banco, observaciones, movimiento_caja_id, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8294 (class 0 OID 20400)
-- Dependencies: 527
-- Data for Name: pago_planilla; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.pago_planilla (pago_planilla_id, detalle_planilla_id, fecha_pago, monto, forma_pago_id, numero_operacion, movimiento_caja_id, banco, cuenta_bancaria, observaciones, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8296 (class 0 OID 20432)
-- Dependencies: 529
-- Data for Name: pago_servicio; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.pago_servicio (pago_servicio_id, organizacion_id, sede_id, tipo_servicio_id, proveedor_id, periodo, numero_suministro, fecha_emision, fecha_vencimiento, fecha_pago, monto, mora, total_pagado, comprobante_proveedor, observaciones, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8262 (class 0 OID 19794)
-- Dependencies: 495
-- Data for Name: parametro_laboratorio; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.parametro_laboratorio (parametro_id, tipo_examen_id, codigo, nombre, unidad_medida_lab_id, valor_referencia_min_masculino, valor_referencia_max_masculino, valor_referencia_min_femenino, valor_referencia_max_femenino, valor_referencia_min_pediatrico, valor_referencia_max_pediatrico, valor_referencia_texto, valor_critico_min, valor_critico_max, orden_presentacion, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8000 (class 0 OID 16529)
-- Dependencies: 233
-- Data for Name: parentesco; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.parentesco (parentesco_id, codigo, nombre, eliminado) FROM stdin;
1	PADRE	Padre	f
2	MADRE	Madre	f
3	HERMANO	Hermano(a)	f
4	HIJO	Hijo(a)	f
5	ABUELO	Abuelo(a)	f
6	NIETO	Nieto(a)	f
7	TIO	Tío(a)	f
8	PRIMO	Primo(a)	f
9	SOBRINO	Sobrino(a)	f
10	CONYUGUE	Cónyuge	f
11	CUÑADO	Cuñado(a)	f
12	YERNO_NUERA	Yerno/Nuera	f
13	SUEGRO	Suegro(a)	f
\.


--
-- TOC entry 8298 (class 0 OID 20471)
-- Dependencies: 531
-- Data for Name: periodo_contable; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.periodo_contable (periodo_id, organizacion_id, "año", mes, trimestre, semestre, fecha_inicio, fecha_fin, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8288 (class 0 OID 20316)
-- Dependencies: 521
-- Data for Name: periodo_planilla; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.periodo_planilla (periodo_planilla_id, organizacion_id, "año", mes, fecha_inicio, fecha_fin, fecha_pago, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8308 (class 0 OID 20645)
-- Dependencies: 541
-- Data for Name: periodo_reporte_susalud; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.periodo_reporte_susalud (periodo_reporte_id, organizacion_id, "año", mes, fecha_inicio, fecha_fin, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8172 (class 0 OID 18010)
-- Dependencies: 405
-- Data for Name: permiso; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.permiso (permiso_id, modulo, accion, descripcion, eliminado) FROM stdin;
1	PACIENTES	VER	Ver pacientes	f
2	PACIENTES	CREAR	Crear paciente	f
3	PACIENTES	EDITAR	Editar paciente	f
4	PACIENTES	ELIMINAR	Eliminar paciente	f
5	ATENCIONES	VER	Ver atenciones	f
6	ATENCIONES	CREAR	Crear atención	f
7	ATENCIONES	EDITAR	Editar atención	f
8	ATENCIONES	ELIMINAR	Eliminar atención	f
9	CITAS	VER	Ver citas	f
10	CITAS	CREAR	Crear cita	f
11	CITAS	EDITAR	Editar cita	f
12	CITAS	CANCELAR	Cancelar cita	f
13	FARMACIA	VER	Ver farmacia	f
14	FARMACIA	DISPENSAR	Dispensar medicamentos	f
15	LABORATORIO	VER	Ver laboratorio	f
16	LABORATORIO	REGISTRAR	Registrar resultados	f
17	CAJA	VER	Ver caja	f
18	CAJA	ABRIR	Abrir caja	f
19	CAJA	CERRAR	Cerrar caja	f
20	REPORTES	VER	Ver reportes	f
21	REPORTES	EXPORTAR	Exportar reportes	f
22	CONFIGURACION	VER	Ver configuración	f
23	CONFIGURACION	EDITAR	Editar configuración	f
24	DASHBOARD	dashboard	Dashboard principal	f
25	PACIENTES	patients-list	Listar Pacientes	f
26	PACIENTES	patients-new	Nuevo Paciente	f
27	PACIENTES	patients-history	Historial de Paciente	f
28	CITAS	appointments-calendar	Ver Calendario	f
29	CITAS	appointments-new	Nueva Cita	f
30	CITAS	appointments-pending	Citas Pendientes	f
31	CITAS	appointments-history	Historial de Citas	f
32	HISTORIAS_CLINICAS	records-new	Nueva Historia	f
33	HISTORIAS_CLINICAS	records-search	Buscar Historia	f
34	HISTORIAS_CLINICAS	records-archive	Archivo Clínico	f
35	FACTURACION	billing-new	Nueva Factura	f
36	FACTURACION	billing-pending	Facturas Pendientes	f
37	FACTURACION	billing-received	Pagos Recibidos	f
38	FACTURACION	billing-reports	Reportes de Facturación	f
39	CONFIGURACION	settings-profile	Perfil de Usuario	f
40	CONFIGURACION	settings-users	Gestión de Usuarios	f
41	CONFIGURACION	settings-system	Configuración del Sistema	f
\.


--
-- TOC entry 8146 (class 0 OID 17642)
-- Dependencies: 379
-- Data for Name: persona; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.persona (persona_id, tipo_documento_id, numero_documento, apellido_paterno, apellido_materno, nombres, fecha_nacimiento, sexo_id, estado_civil_id, foto_url, huella_digital_url, firma_url, email, telefono, celular, direccion, ubigeo_id, grupo_sanguineo_id, factor_rh_id, ocupacion, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
1000	1	12345678	Admin	Test	Usuario	1990-01-01	1	1	\N	\N	\N	admin@test.com	999999999	\N	Dirección de prueba	\N	\N	\N	\N	activo	f	1	2025-10-04 12:22:43.563222	1	2025-10-04 12:22:43.563222	\N	\N
2	1	21853000	Atúncar	Márquez	Walter Guido	1950-10-20	1	1	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	activo	f	\N	2025-10-20 21:30:44.800314	\N	2025-10-20 21:30:44.800317	\N	\N
\.


--
-- TOC entry 8166 (class 0 OID 17930)
-- Dependencies: 399
-- Data for Name: personal; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.personal (personal_id, persona_id, organizacion_id, codigo_empleado, tipo_personal_id, cargo_id, fecha_ingreso, fecha_cese, colegiatura, rne, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
4	1000	1	qwerty	106	93	2025-10-02	\N	\N	\N	activo	f	\N	2025-10-05 20:06:43.2215	\N	2025-10-05 20:06:43.2215	\N	\N
\.


--
-- TOC entry 8168 (class 0 OID 17969)
-- Dependencies: 401
-- Data for Name: personal_especialidad; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.personal_especialidad (personal_especialidad_id, personal_id, especialidad_id, es_principal, fecha_obtencion, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8216 (class 0 OID 18865)
-- Dependencies: 449
-- Data for Name: personal_procedimiento; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.personal_procedimiento (personal_procedimiento_id, procedimiento_id, personal_id, rol_procedimiento, es_responsable, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8322 (class 0 OID 20870)
-- Dependencies: 555
-- Data for Name: plan_mejora_auditoria; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.plan_mejora_auditoria (plan_mejora_id, auditoria_hc_id, criterio_id, problema_identificado, accion_correctiva, responsable_id, fecha_limite, fecha_verificacion, estado_implementacion, observaciones_seguimiento, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8306 (class 0 OID 20612)
-- Dependencies: 539
-- Data for Name: presupuesto; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.presupuesto (presupuesto_id, organizacion_id, "año", categoria_balance_id, subcategoria_balance_id, monto_anual, enero, febrero, marzo, abril, mayo, junio, julio, agosto, septiembre, octubre, noviembre, diciembre, observaciones, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8086 (class 0 OID 17167)
-- Dependencies: 319
-- Data for Name: prioridad_solicitud; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.prioridad_solicitud (prioridad_solicitud_id, codigo, nombre, tiempo_max_respuesta_horas, eliminado) FROM stdin;
29	URGENTE	Urgente	2	f
30	ALTA	Alta	6	f
31	NORMAL	Normal	24	f
32	BAJA	Baja	72	f
\.


--
-- TOC entry 8050 (class 0 OID 16894)
-- Dependencies: 283
-- Data for Name: prioridad_triaje; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.prioridad_triaje (prioridad_triaje_id, codigo, nivel, nombre, color_hex, tiempo_max_atencion_minutos, eliminado) FROM stdin;
1	I	I	Reanimación	#FF0000	0	f
2	II	II	Emergencia	#FF6600	15	f
3	III	III	Urgencia	#FFFF00	60	f
4	IV	IV	Urgencia Menor	#00FF00	120	f
5	V	V	No Urgente	#0000FF	240	f
\.


--
-- TOC entry 8214 (class 0 OID 18835)
-- Dependencies: 447
-- Data for Name: procedimiento_realizado; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.procedimiento_realizado (procedimiento_id, tipo_procedimiento_id, atencion_id, episodio_id, fecha_hora_inicio, fecha_hora_fin, duracion_minutos, lugar_realizacion, descripcion_procedimiento, tecnica_utilizada, hallazgos, complicaciones, consentimiento_id, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8236 (class 0 OID 19280)
-- Dependencies: 469
-- Data for Name: producto; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.producto (producto_id, categoria_id, codigo, codigo_digemid, codigo_barra, nombre_generico, nombre_comercial, presentacion, concentracion, forma_farmaceutica_id, laboratorio, unidad_medida_farmacia_id, principio_activo, requiere_receta, es_controlado, es_refrigerado, stock_minimo, stock_maximo, precio_compra_referencial, precio_venta_base, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8232 (class 0 OID 19212)
-- Dependencies: 465
-- Data for Name: proveedor; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.proveedor (proveedor_id, tipo_documento_id, numero_documento, razon_social, nombre_comercial, contacto, telefono, email, direccion, ubigeo_id, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8244 (class 0 OID 19432)
-- Dependencies: 477
-- Data for Name: receta; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.receta (receta_id, atencion_id, episodio_id, paciente_id, personal_id, numero_receta, fecha_emision, indicaciones_generales, estado_receta_id, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8354 (class 0 OID 21345)
-- Dependencies: 587
-- Data for Name: recurso_fhir; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.recurso_fhir (recurso_fhir_id, tipo_recurso_id, identificador_fhir, version_recurso, tabla_origen, entidad_id, contenido_json, contenido_xml, fecha_creacion, fecha_actualizacion, hash_contenido, estado, eliminado, usuario_creacion_id, fecha_creacion_auditoria, usuario_actualizacion_id, fecha_actualizacion_auditoria, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8196 (class 0 OID 18491)
-- Dependencies: 429
-- Data for Name: registro_signos_vitales; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.registro_signos_vitales (registro_signos_id, tipo_registro_id, atencion_id, episodio_id, fecha_hora, personal_registra_id, peso_kg, talla_cm, imc, temperatura_c, temperatura_via, presion_arterial_sistolica, presion_arterial_diastolica, presion_arterial_media, presion_arterial_posicion, frecuencia_cardiaca, frecuencia_respiratoria, saturacion_oxigeno, fio2_porcentaje, perimetro_abdominal_cm, perimetro_cefalico_cm, perimetro_toracico_cm, glasgow_total, glasgow_ocular, glasgow_verbal, glasgow_motor, escala_dolor, tipo_dolor, localizacion_dolor, nivel_conciencia, pupilas, apgar_1min, apgar_5min, silverman_anderson, presion_venosa_central, presion_capilar_pulmonar, gasto_cardiaco, diuresis_ml, balance_hidrico, via_aerea, ventilacion_mecanica, parametros_ventilador_json, dispositivos_invasivos_json, observaciones, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8324 (class 0 OID 20903)
-- Dependencies: 557
-- Data for Name: reporte_configuracion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.reporte_configuracion (reporte_id, categoria_reporte_id, codigo, nombre, descripcion, query_sql, parametros_json, formato_salida, requiere_autorizacion, nivel_confidencialidad, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8326 (class 0 OID 20928)
-- Dependencies: 559
-- Data for Name: reporte_parametro; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.reporte_parametro (reporte_parametro_id, reporte_id, nombre_parametro, tipo_dato, es_obligatorio, valor_default, opciones_json, orden, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8328 (class 0 OID 20951)
-- Dependencies: 561
-- Data for Name: reporte_rol; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.reporte_rol (reporte_rol_id, reporte_id, rol_id, puede_ejecutar, puede_programar, puede_exportar, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8266 (class 0 OID 19851)
-- Dependencies: 499
-- Data for Name: resultado_laboratorio; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.resultado_laboratorio (resultado_lab_id, examen_lab_id, fecha_hora_resultado, conclusiones, recomendaciones, personal_valida_id, estado_resultado_id, fecha_hora_entrega, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8264 (class 0 OID 19823)
-- Dependencies: 497
-- Data for Name: resultado_parametro; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.resultado_parametro (resultado_parametro_id, examen_lab_id, parametro_id, valor_numerico, valor_texto, es_anormal, es_critico, observaciones, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8170 (class 0 OID 17994)
-- Dependencies: 403
-- Data for Name: rol; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.rol (rol_id, nombre, descripcion, estado, eliminado) FROM stdin;
8	AUDITOR	Auditor médico con acceso a revisión de historias clínicas, evaluación de calidad de atención, auditoría de procesos asistenciales y generación de planes de mejora	activo	f
9	GERENTE	Gerente con acceso ejecutivo a dashboards de gestión, indicadores KPI, reportes de Business Intelligence y análisis estratégico para toma de decisiones	activo	f
10	PACIENTE	Paciente con acceso de solo lectura a sus resultados de laboratorio, informes de imágenes, recetas médicas, citas programadas y documentos clínicos personales	activo	f
11	CONTABILIDAD	Usuario de contabilidad con permisos extendidos para gestión de balances, presupuestos, indicadores financieros, periodo contable y análisis de costos	activo	f
12	AUXILIAR_CONTABLE	Auxiliar contable con permisos restringidos para registro de movimientos contables, consulta de balances y apoyo en tareas contables básicas sin autorización de cierre	activo	f
13	GESTOR_ADMINISTRATIVO	Gestor administrativo responsable de impresión y reimpresión de documentos clínicos, envío de tramas a SUSALUD, generación de reportes operativos, gestión documental y apoyo administrativo a gerencia	activo	f
1	ADMINISTRADOR	Administrador del sistema con acceso total para configuración, gestión de usuarios, permisos, módulos y mantenimiento general de la plataforma	activo	f
2	MEDICO	Médico con acceso a atención clínica, registro de historias clínicas, diagnósticos, prescripción de recetas, órdenes de exámenes, interconsultas y evoluciones médicas	activo	f
3	ENFERMERA	Enfermera con acceso a registro de signos vitales, administración de medicamentos, ejecución de indicaciones médicas, evoluciones de enfermería y monitoreo de pacientes hospitalizados	activo	f
4	FARMACEUTICO	Farmacéutico con acceso a dispensación de medicamentos, validación de recetas, control de inventario farmacéutico y registro de entregas a pacientes	activo	f
5	ALMACEN	Personal de almacén con acceso a gestión de inventarios, control de stock, movimientos de entrada y salida, gestión de lotes y productos médicos	activo	f
6	TECNOLOGO_MEDICO	Tecnólogo médico con acceso a procesamiento de exámenes de laboratorio, registro de resultados, gestión de muestras, exámenes de imágenes y emisión de informes técnicos	activo	f
7	CAJERO	Cajero con acceso a facturación, gestión de caja, cobros, recepción de pacientes, registro de admisiones, programación de citas y control de pagos	activo	f
\.


--
-- TOC entry 8174 (class 0 OID 18026)
-- Dependencies: 407
-- Data for Name: rol_permiso; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.rol_permiso (rol_permiso_id, rol_id, permiso_id, eliminado) FROM stdin;
1	2	24	f
2	9	24	f
3	3	24	f
4	1	24	f
5	2	25	f
6	4	25	f
7	1	25	f
8	3	25	f
9	7	25	f
10	2	26	f
11	1	26	f
12	2	27	f
13	1	27	f
14	3	27	f
15	1	28	f
16	3	28	f
17	7	28	f
18	2	28	f
19	1	29	f
20	2	29	f
21	4	30	f
22	1	30	f
23	3	30	f
24	7	30	f
25	2	30	f
26	2	31	f
27	1	31	f
28	7	31	f
29	3	31	f
30	2	32	f
31	1	32	f
32	8	33	f
33	2	33	f
34	1	33	f
35	9	33	f
36	3	33	f
37	2	34	f
38	1	34	f
39	13	34	f
40	7	35	f
41	1	35	f
42	7	36	f
43	1	36	f
44	12	36	f
45	12	37	f
46	7	37	f
47	1	37	f
48	12	38	f
49	11	38	f
50	7	38	f
51	9	38	f
52	13	38	f
53	1	38	f
54	8	39	f
55	10	39	f
56	12	39	f
57	2	39	f
58	11	39	f
59	1	39	f
60	13	39	f
61	5	39	f
62	4	39	f
63	9	39	f
64	7	39	f
65	3	39	f
66	1	40	f
67	1	41	f
\.


--
-- TOC entry 8144 (class 0 OID 17611)
-- Dependencies: 377
-- Data for Name: sede; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.sede (sede_id, organizacion_id, codigo, nombre, direccion, ubigeo_id, telefono, email, responsable_id, es_principal, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8180 (class 0 OID 18104)
-- Dependencies: 413
-- Data for Name: servicio_medico; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.servicio_medico (servicio_id, codigo, nombre, tipo_servicio_id, especialidad_id, duracion_minutos, precio_base, descripcion, unidad_medida_id, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 7992 (class 0 OID 16473)
-- Dependencies: 225
-- Data for Name: sexo; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.sexo (sexo_id, codigo, nombre, eliminado) FROM stdin;
1	M	Masculino	f
2	F	Femenino	f
\.


--
-- TOC entry 8356 (class 0 OID 21370)
-- Dependencies: 589
-- Data for Name: sincronizacion_fhir; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.sincronizacion_fhir (sincronizacion_id, recurso_fhir_id, sistema_externo_id, tipo_operacion, direccion, fecha_hora, request_json, response_json, codigo_http, exitoso, mensaje_error, tiempo_respuesta_ms, intentos, proximo_reintento, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8040 (class 0 OID 16823)
-- Dependencies: 273
-- Data for Name: sistema_corporal; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.sistema_corporal (sistema_corporal_id, codigo, nombre, orden, eliminado) FROM stdin;
106	PIEL	Piel y Faneras	1	f
107	CABEZA	Cabeza	2	f
108	OJOS	Ojos	3	f
109	OIDOS	Oídos	4	f
110	NARIZ	Nariz	5	f
111	BOCA	Boca y Faringe	6	f
112	CUELLO	Cuello	7	f
113	TORAX	Tórax	8	f
114	CARDVASCULAR	Sistema Cardiovascular	9	f
115	RESPIRATORIO	Sistema Respiratorio	10	f
116	ABDOMEN	Abdomen	11	f
117	GENURINARIO	Sistema Genitourinario	12	f
118	EXTREMIDADES	Extremidades	13	f
119	NEUROLOGICO	Sistema Neurológico	14	f
120	MUSC_ESQUELET	Sistema Musculoesquelético	15	f
\.


--
-- TOC entry 8352 (class 0 OID 21324)
-- Dependencies: 585
-- Data for Name: sistema_externo; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.sistema_externo (sistema_externo_id, codigo, nombre, tipo_sistema, url_base, version_api, metodo_autenticacion, credenciales_json, timeout_segundos, reintentos_max, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
1	RENIEC	RENIEC - Consulta DNI	servicio_web	https://api.reniec.gob.pe	v1	token	{"token": ""}	30	3	activo	f	\N	2025-10-02 10:56:03.574658	\N	2025-10-02 10:56:03.574658	\N	\N
2	SUNAT	SUNAT - Consulta RUC	servicio_web	https://api.sunat.gob.pe	v1	token	{"token": ""}	30	3	activo	f	\N	2025-10-02 10:56:03.574658	\N	2025-10-02 10:56:03.574658	\N	\N
3	SIS	SIS - Validación de Afiliación	servicio_web	https://api.sis.gob.pe	v1	token	{"token": ""}	30	3	activo	f	\N	2025-10-02 10:56:03.574658	\N	2025-10-02 10:56:03.574658	\N	\N
4	SUSALUD	SUSALUD - Reporte de Atenciones	servicio_web	https://api.susalud.gob.pe	v1	token	{"token": ""}	60	3	activo	f	\N	2025-10-02 10:56:03.574658	\N	2025-10-02 10:56:03.574658	\N	\N
\.


--
-- TOC entry 8254 (class 0 OID 19625)
-- Dependencies: 487
-- Data for Name: solicitud_examen; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.solicitud_examen (solicitud_id, atencion_id, episodio_id, organizacion_id, numero_solicitud, fecha_solicitud, personal_solicita_id, indicaciones_clinicas, prioridad_solicitud_id, estado_solicitud_id, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8122 (class 0 OID 17429)
-- Dependencies: 355
-- Data for Name: subcategoria_balance; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.subcategoria_balance (subcategoria_balance_id, categoria_balance_id, codigo, nombre, orden, eliminado) FROM stdin;
18	16	CONSULTAS	Consultas Médicas	1	f
19	16	CIRUGIAS	Cirugías	2	f
20	16	HOSPITALIZACION	Hospitalización	3	f
21	16	FARMACIA	Venta de Medicamentos	4	f
22	16	LABORATORIO	Exámenes de Laboratorio	5	f
23	16	IMAGENES	Exámenes de Imágenes	6	f
24	16	EMERGENCIA	Atenciones de Emergencia	7	f
25	19	SALARIOS	Salarios y Beneficios	1	f
26	19	MEDICAMENTOS	Compra de Medicamentos	2	f
27	19	INSUMOS	Insumos Médicos	3	f
28	20	SERVICIOS	Servicios Básicos	4	f
29	20	MANTENIMIENTO	Mantenimiento de Equipos	5	f
\.


--
-- TOC entry 8316 (class 0 OID 20764)
-- Dependencies: 549
-- Data for Name: subcriterio_auditoria; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.subcriterio_auditoria (subcriterio_id, criterio_id, codigo, nombre, descripcion, peso_porcentual, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8344 (class 0 OID 21153)
-- Dependencies: 577
-- Data for Name: sugerencia_ia; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.sugerencia_ia (sugerencia_ia_id, modelo_id, tipo_sugerencia_id, atencion_id, paciente_id, receta_id, solicitud_examen_id, examen_imagen_id, producto_id, contenido_json, explicacion_texto, confianza_porcentaje, prioridad, fecha_hora_generacion, fecha_hora_revision, fue_aceptada, fue_rechazada, motivo_rechazo, personal_revisa_id, feedback_usuario, tiempo_respuesta_ms, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8064 (class 0 OID 16995)
-- Dependencies: 297
-- Data for Name: tipo_almacen; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_almacen (tipo_almacen_id, codigo, nombre, eliminado) FROM stdin;
1	FARMACIA	Farmacia	f
2	INSUMOS_MED	Insumos Médicos	f
3	REACTIVOS	Reactivos de Laboratorio	f
4	ALMACEN_GRAL	Almacén General	f
5	NUTRICION	Nutrición y Dietética	f
6	MATERIAL_QUIRURGICO	Material Quirúrgico	f
7	PAPELERIA	Papelería y Oficina	f
\.


--
-- TOC entry 8056 (class 0 OID 16937)
-- Dependencies: 289
-- Data for Name: tipo_alta; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_alta (tipo_alta_id, codigo, nombre, eliminado) FROM stdin;
8	MEDICA	Alta Médica	f
9	VOLUNTARIA	Alta Voluntaria	f
10	FUGA	Fuga del Paciente	f
11	DEFUNCION	Defunción	f
12	REFERENCIA	Referencia a Otro Centro	f
13	ADMINISTRATIVA	Alta Administrativa	f
14	TRASLADO	Traslado Interno	f
\.


--
-- TOC entry 8008 (class 0 OID 16589)
-- Dependencies: 241
-- Data for Name: tipo_aseguradora; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_aseguradora (tipo_aseguradora_id, codigo, nombre, eliminado) FROM stdin;
10	SIS	Seguro Integral de Salud	f
11	ESSALUD	EsSalud	f
12	EPS	Entidad Prestadora de Salud	f
13	PRIVADO	Seguro Privado	f
14	SCTR	Seguro Complementario de Trabajo de Riesgo	f
15	SOAT	Seguro Obligatorio de Accidentes de Tránsito	f
16	PARTICULAR	Particular (Sin Seguro)	f
17	FFAA	Fuerzas Armadas	f
18	POLICIAL	Policía Nacional	f
\.


--
-- TOC entry 8024 (class 0 OID 16708)
-- Dependencies: 257
-- Data for Name: tipo_atencion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_atencion (tipo_atencion_id, codigo, nombre, eliminado) FROM stdin;
7	AMBULATORIA	Atención Ambulatoria	f
8	EMERGENCIA	Atención de Emergencia	f
9	HOSPITALARIA	Atención Hospitalizada	f
10	DOMICILIARIA	Atención Domiciliaria	f
11	TELEMEDICINA	Telemedicina	f
12	PROGRAMADA	Atención Programada	f
\.


--
-- TOC entry 8126 (class 0 OID 17459)
-- Dependencies: 359
-- Data for Name: tipo_auditoria; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_auditoria (tipo_auditoria_id, codigo, nombre, descripcion, eliminado) FROM stdin;
1	CLINICA	Auditoría Clínica	Revisión de la calidad de atención médica	f
2	ADMINISTRATIVA	Auditoría Administrativa	Revisión de procesos administrativos	f
3	CALIDAD	Auditoría de Calidad	Evaluación de estándares de calidad	f
4	FARMACOTERAPEUTICA	Auditoría Farmacoterapéutica	Revisión de prescripciones y uso de medicamentos	f
5	GESTION	Auditoría de Gestión	Evaluación de uso de recursos	f
6	COSTOS	Auditoría de Costos	Análisis de costos de atención	f
7	CONCURRENTE	Auditoría Concurrente	Revisión durante la atención	f
8	RETROSPECTIVA	Auditoría Retrospectiva	Revisión post-atención	f
\.


--
-- TOC entry 8118 (class 0 OID 17395)
-- Dependencies: 351
-- Data for Name: tipo_balance; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_balance (tipo_balance_id, codigo, nombre, periodicidad_meses, eliminado) FROM stdin;
25	MENSUAL	Balance Mensual	1	f
26	BIMESTRAL	Balance Bimestral	2	f
27	TRIMESTRAL	Balance Trimestral	3	f
28	CUATRIMESTRAL	Balance Cuatrimestral	4	f
29	SEMESTRAL	Balance Semestral	6	f
30	ANUAL	Balance Anual	12	f
\.


--
-- TOC entry 8108 (class 0 OID 17322)
-- Dependencies: 341
-- Data for Name: tipo_caja; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_caja (tipo_caja_id, codigo, nombre, eliminado) FROM stdin;
1	PRINCIPAL	Caja Principal	f
2	SECUNDARIA	Caja Secundaria	f
3	FARMACIA	Caja Farmacia	f
4	EMERGENCIA	Caja Emergencia	f
5	CAJA_CHICA	Caja Chica	f
\.


--
-- TOC entry 8020 (class 0 OID 16679)
-- Dependencies: 253
-- Data for Name: tipo_cama; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_cama (tipo_cama_id, codigo, nombre, nivel_atencion, requiere_equipamiento_especial, eliminado) FROM stdin;
36	OBSERVACION	Cama de Observación	basico	f	f
37	HOSPCION	Cama de Hospitalización	intermedio	f	f
38	UCI	Cama UCI	critico	t	f
39	UCIN	Cama UCIN	critico	t	f
40	NEONATOLOGIA	Cama de Neonatología	intermedio	t	f
\.


--
-- TOC entry 8032 (class 0 OID 16764)
-- Dependencies: 265
-- Data for Name: tipo_cita; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_cita (tipo_cita_id, codigo, nombre, requiere_orden, eliminado) FROM stdin;
36	PRIMERA_VEZ	Primera Vez	f	f
37	CONTINUACION	Continuación	f	f
38	CONTROL	Control	f	f
39	INTERCONSULTA	Interconsulta	t	f
40	PROCEDIMIENTO	Procedimiento Programado	t	f
\.


--
-- TOC entry 8100 (class 0 OID 17266)
-- Dependencies: 333
-- Data for Name: tipo_comprobante; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_comprobante (tipo_comprobante_id, codigo, nombre, serie_default, eliminado) FROM stdin;
1	01	Factura	F001	f
2	03	Boleta de Venta	B001	f
3	07	Nota de Crédito	FC01	f
4	08	Nota de Débito	FD01	f
\.


--
-- TOC entry 8140 (class 0 OID 17565)
-- Dependencies: 373
-- Data for Name: tipo_consentimiento; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_consentimiento (tipo_consentimiento_id, codigo, nombre, descripcion, contenido_html, requiere_testigo, version_documento, eliminado) FROM stdin;
36	CIRUGIA	Consentimiento para Cirugía	Consentimiento informado para procedimientos quirúrgicos	<p>Consentimiento para cirugía</p>	t	1.0	f
37	ANESTESIA	Consentimiento para Anestesia	Consentimiento informado para anestesia	<p>Consentimiento para anestesia</p>	t	1.0	f
38	TRANSFUSION	Consentimiento para Transfusión	Consentimiento informado para transfusión sanguínea	<p>Consentimiento para transfusión</p>	t	1.0	f
39	PROCEDIMIENTO_INV	Consentimiento para Procedimiento Invasivo	Consentimiento para procedimientos invasivos	<p>Consentimiento para procedimiento invasivo</p>	t	1.0	f
40	ALTA_VOLUNTARIA	Alta Voluntaria	Consentimiento para alta voluntaria	<p>Alta voluntaria</p>	f	1.0	f
\.


--
-- TOC entry 8016 (class 0 OID 16651)
-- Dependencies: 249
-- Data for Name: tipo_consultorio; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_consultorio (tipo_consultorio_id, codigo, nombre, eliminado) FROM stdin;
43	CONSULTA_EXT	Consultorio de Consulta Externa	f
44	EMERGENCIA	Consultorio de Emergencia	f
45	PROCEDIMIENTOS	Consultorio de Procedimientos	f
46	INYECTABLES	Tópico de Inyectables	f
47	CURACIONES	Tópico de Curaciones	f
48	TRIAJE	Consultorio de Triaje	f
\.


--
-- TOC entry 8046 (class 0 OID 16866)
-- Dependencies: 279
-- Data for Name: tipo_diagnostico; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_diagnostico (tipo_diagnostico_id, codigo, nombre, eliminado) FROM stdin;
22	PRESUNTIVO	Diagnóstico Presuntivo	f
23	DEFINITIVO	Diagnóstico Definitivo	f
24	REPETIDO	Diagnóstico Repetido	f
\.


--
-- TOC entry 7990 (class 0 OID 16459)
-- Dependencies: 223
-- Data for Name: tipo_documento; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_documento (tipo_documento_id, codigo, nombre, longitud, validacion_regex, orden, eliminado) FROM stdin;
1	DNI	Documento Nacional de Identidad	8	\N	1	f
2	CE	Carnet de Extranjería	12	\N	2	f
3	PASAPORTE	Pasaporte	12	\N	3	f
4	RUC	Registro Único de Contribuyentes	11	\N	4	f
\.


--
-- TOC entry 8028 (class 0 OID 16736)
-- Dependencies: 261
-- Data for Name: tipo_episodio; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_episodio (tipo_episodio_id, codigo, nombre, eliminado) FROM stdin;
1	EMERGENCIA	Episodio de Emergencia	f
2	OBSERVACION_EMERG	Observación en Emergencia	f
3	HOSPITALIZACION	Hospitalización	f
4	UCI	Unidad de Cuidados Intensivos	f
5	UCIN	Unidad de Cuidados Intensivos Neonatales	f
6	CIRUGIA	Cirugía	f
7	RECUPERACION	Sala de Recuperación	f
8	DIALISIS	Diálisis	f
\.


--
-- TOC entry 8092 (class 0 OID 17210)
-- Dependencies: 325
-- Data for Name: tipo_equipo_laboratorio; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_equipo_laboratorio (tipo_equipo_id, codigo, nombre, marca, modelo, eliminado) FROM stdin;
29	HEMATOLOGIA	Analizador Hematológico	Varios	Varios	f
30	BIOQUIMICA	Analizador Bioquímico	Varios	Varios	f
31	INMUNOLOGIA	Analizador Inmunológico	Varios	Varios	f
32	MICROSCOPIO	Microscopio	Varios	Varios	f
\.


--
-- TOC entry 8042 (class 0 OID 16837)
-- Dependencies: 275
-- Data for Name: tipo_evolucion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_evolucion (tipo_evolucion_id, codigo, nombre, requiere_profesional_especializado, eliminado) FROM stdin;
36	MEDICA	Evolución Médica	t	f
37	ENFERMERIA	Evolución de Enfermería	t	f
38	NUTRICIONAL	Evolución Nutricional	t	f
39	PSICOLOGICA	Evolución Psicológica	t	f
40	TEP_FISICA	Evolución de Terapia Física	t	f
\.


--
-- TOC entry 8252 (class 0 OID 19594)
-- Dependencies: 485
-- Data for Name: tipo_examen; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_examen (tipo_examen_id, categoria_examen_id, area_examen_id, codigo, nombre, descripcion, precio, tiempo_resultado_horas, requiere_preparacion, indicaciones_preparacion, requiere_consentimiento, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8038 (class 0 OID 16809)
-- Dependencies: 271
-- Data for Name: tipo_examen_fisico; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_examen_fisico (tipo_examen_fisico_id, codigo, nombre, eliminado) FROM stdin;
29	INGRESO	Examen Físico de Ingreso	f
30	EVOLUCION	Examen Físico de Evolución	f
31	ESPECIALIZADO	Examen Físico Especializado	f
32	PRE_QCO	Examen Pre-Quirúrgico	f
\.


--
-- TOC entry 8068 (class 0 OID 17029)
-- Dependencies: 301
-- Data for Name: tipo_forma_farmaceutica; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_forma_farmaceutica (forma_farmaceutica_id, codigo, nombre, eliminado) FROM stdin;
1	TABLETA	Tableta	f
2	CAPSULA	Cápsula	f
3	JARABE	Jarabe	f
4	SUSPENSION	Suspensión	f
5	SOLUCION	Solución	f
6	AMPOLLA	Ampolla	f
7	SUPOSITORIO	Supositorio	f
8	OVULO	Óvulo	f
9	CREMA	Crema	f
10	POMADA	Pomada	f
11	GEL	Gel	f
12	LOCION	Loción	f
13	AEROSOL	Aerosol	f
14	INHALADOR	Inhalador	f
15	GOTAS	Gotas	f
16	PARCHE	Parche	f
17	POLVO	Polvo	f
18	GRANULADO	Granulado	f
\.


--
-- TOC entry 8098 (class 0 OID 17252)
-- Dependencies: 331
-- Data for Name: tipo_formato_imagen; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_formato_imagen (tipo_formato_id, codigo, nombre, extension, eliminado) FROM stdin;
36	DICOM	Digital Imaging and Communications in Medicine	.dcm	f
37	JPEG	Joint Photographic Experts Group	.jpg	f
38	PNG	Portable Network Graphics	.png	f
39	TIFF	Tagged Image File Format	.tif	f
40	PDF	Portable Document Format	.pdf	f
\.


--
-- TOC entry 8044 (class 0 OID 16852)
-- Dependencies: 277
-- Data for Name: tipo_indicacion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_indicacion (tipo_indicacion_id, codigo, nombre, eliminado) FROM stdin;
50	MEDICAMENTO	Medicamento	f
51	DIETA	Dieta	f
52	CONTROL_SV	Control de Signos Vitales	f
53	CURACION	Curación	f
54	TERAPIA	Terapia Física/Respiratoria	f
55	CUIDADO_ENF	Cuidado de Enfermería	f
56	PROCEDTO	Procedimiento	f
\.


--
-- TOC entry 8138 (class 0 OID 17549)
-- Dependencies: 371
-- Data for Name: tipo_mensaje_hl7; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_mensaje_hl7 (tipo_mensaje_id, codigo, nombre, descripcion, version_hl7, eliminado) FROM stdin;
1	ADT_A01	Admisión de Paciente	Mensaje de admisión de paciente	HL7 v2.5	f
2	ADT_A08	Actualización de Datos	Actualización de información del paciente	HL7 v2.5	f
3	ORM_O01	Orden Médica	Mensaje de orden médica	HL7 v2.5	f
4	ORU_R01	Resultado de Observación	Mensaje de resultado de laboratorio	HL7 v2.5	f
5	DFT_P03	Información Financiera	Mensaje de transacción financiera	HL7 v2.5	f
\.


--
-- TOC entry 8132 (class 0 OID 17503)
-- Dependencies: 365
-- Data for Name: tipo_modelo_ia; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_modelo_ia (tipo_modelo_id, codigo, nombre, descripcion, eliminado) FROM stdin;
36	DIAGNOSTICO	Modelo de Diagnóstico	Modelo de IA para apoyo diagnóstico	f
37	PREDICCION	Modelo Predictivo	Modelo de IA para predicción de eventos	f
38	CLASIFICACION	Modelo de Clasificación	Modelo de IA para clasificación de datos	f
39	NLP	Procesamiento de Lenguaje Natural	Modelo de IA para análisis de texto	f
40	VISION	Visión Computacional	Modelo de IA para análisis de imágenes	f
\.


--
-- TOC entry 8076 (class 0 OID 17092)
-- Dependencies: 309
-- Data for Name: tipo_movimiento_almacen; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_movimiento_almacen (tipo_movimiento_id, codigo, nombre, afecta_stock, eliminado) FROM stdin;
71	INGRESO_COMP	Ingreso por Compra	true	f
72	INGRESO_DEV	Ingreso por Devolución	true	f
73	INGRESO_AJUS	Ingreso por Ajuste de Inventario	true	f
74	SALIDA_DISPEN	Salida por Dispensación	true	f
75	SALIDA_CONSUMO	Salida por Consumo Interno	true	f
76	SALIDA_MERMA	Salida por Merma	true	f
77	SALIDA_VENCIM	Salida por Vencimiento	true	f
78	SALIDA_AJUSTE	Salida por Ajuste de Inventario	true	f
79	TRASL_SALIDA	Traslado - Salida	true	f
80	TRASL_ENTRADA	Traslado - Entrada	true	f
\.


--
-- TOC entry 8090 (class 0 OID 17195)
-- Dependencies: 323
-- Data for Name: tipo_muestra; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_muestra (tipo_muestra_id, codigo, nombre, requiere_condiciones_especiales, temperatura_conservacion, eliminado) FROM stdin;
57	SANGRE_VEN	Sangre Venosa	f	2-8°C	f
58	SANGRE_CAP	Sangre Capilar	f	2-8°C	f
59	ORINA	Orina	f	2-8°C	f
60	HECES	Heces	f	2-8°C	f
61	ESPUTO	Esputo	f	2-8°C	f
62	LIQUIDO_CF	Líquido Cefalorraquídeo	t	2-8°C	f
63	LIQ_PLEURAL	Líquido Pleural	t	2-8°C	f
64	LIQ_ASCITICO	Líquido Ascítico	t	2-8°C	f
\.


--
-- TOC entry 8004 (class 0 OID 16559)
-- Dependencies: 237
-- Data for Name: tipo_organizacion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_organizacion (tipo_organizacion_id, codigo, nombre, descripcion, eliminado) FROM stdin;
50	CLINICA	Clínica	Establecimiento de salud privado de complejidad media-alta	f
51	HOSPITAL	Hospital	Establecimiento de salud de alta complejidad	f
52	CENTRO_SALUD	Centro de Salud	Establecimiento de atención primaria	f
53	POLICLINICO	Policlínico	Establecimiento con múltiples especialidades	f
54	CONSULTORIO	Consultorio Médico	Consultorio privado individual o grupal	f
55	LABORATORIO	Laboratorio Clínico	Laboratorio de análisis clínicos	f
56	CENTRO_DIAGTICO	Centro de Diagnóstico por Imágenes	Centro especializado en imágenes médicas	f
\.


--
-- TOC entry 8006 (class 0 OID 16575)
-- Dependencies: 239
-- Data for Name: tipo_paciente; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_paciente (tipo_paciente_id, codigo, nombre, eliminado) FROM stdin;
36	NUEVO	Paciente Nuevo	f
37	CONTINUADOR	Paciente Continuador	f
38	REFERIDO	Paciente Referido	f
39	EMERGENCIA	Paciente de Emergencia	f
40	CONTROL	Paciente en Control	f
\.


--
-- TOC entry 8010 (class 0 OID 16603)
-- Dependencies: 243
-- Data for Name: tipo_personal; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_personal (tipo_personal_id, codigo, nombre, requiere_colegiatura, eliminado) FROM stdin;
106	MEDICO	Médico	t	f
107	ENFERMERA	Enfermera(o)	t	f
108	OBSTETRA	Obstetra	t	f
109	PSICOLOGO	Psicólogo(a)	t	f
110	NUTRICIONISTA	Nutricionista	t	f
111	TECNLOGO_MED	Tecnólogo Médico	t	f
112	QUIMICO_FARM	Químico Farmacéutico	t	f
113	ODONTOLOGO	Odontólogo(a)	t	f
114	TECNICO_ENF	Técnico(a) de Enfermería	f	f
115	TECNICO_LAB	Técnico(a) de Laboratorio	f	f
116	TECNICO_FARM	Técnico(a) de Farmacia	f	f
117	ADMINISTRATIVO	Personal Administrativo	f	f
118	LIMPIEZA	Personal de Limpieza	f	f
119	SEGURIDAD	Personal de Seguridad	f	f
120	SISTEMAS	Personal de Sistemas	f	f
\.


--
-- TOC entry 8060 (class 0 OID 16965)
-- Dependencies: 293
-- Data for Name: tipo_procedimiento; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_procedimiento (tipo_procedimiento_id, codigo, nombre, categoria, requiere_consentimiento, requiere_sala_operaciones, eliminado) FROM stdin;
50	CIRU_MAYOR	Cirugía Mayor	Quirúrgico	t	t	f
51	CIRU_MENOR	Cirugía Menor	Quirúrgico	t	f	f
52	CURACION	Curación	Enfermería	f	f	f
53	PUNCION	Punción	Diagnóstico	t	f	f
54	BIOPSIA	Biopsia	Diagnóstico	t	f	f
55	ENDOSCOPIA	Endoscopia	Diagnóstico	t	f	f
56	DRENAJE	Drenaje	Terapéutico	t	f	f
\.


--
-- TOC entry 8136 (class 0 OID 17533)
-- Dependencies: 369
-- Data for Name: tipo_recurso_fhir; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_recurso_fhir (tipo_recurso_id, codigo, nombre, version_fhir, url_profile, eliminado) FROM stdin;
1	PATIENT	Patient	R4	http://hl7.org/fhir/StructureDefinition/Patient	f
2	PRACTITIONER	Practitioner	R4	http://hl7.org/fhir/StructureDefinition/Practitioner	f
3	ENCOUNTER	Encounter	R4	http://hl7.org/fhir/StructureDefinition/Encounter	f
4	OBSERVATION	Observation	R4	http://hl7.org/fhir/StructureDefinition/Observation	f
5	MEDICATION_REQUEST	MedicationRequest	R4	http://hl7.org/fhir/StructureDefinition/MedicationRequest	f
6	DIAGNOSTIC_REPORT	DiagnosticReport	R4	http://hl7.org/fhir/StructureDefinition/DiagnosticReport	f
\.


--
-- TOC entry 8036 (class 0 OID 16793)
-- Dependencies: 269
-- Data for Name: tipo_registro_signos_vitales; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_registro_signos_vitales (tipo_registro_id, codigo, nombre, descripcion, eliminado) FROM stdin;
43	TRIAJE	Triaje	Registro en triaje de emergencia	f
44	CONSULTA	Consulta	Registro en consulta ambulatoria	f
45	HOSPCION	Hospitalización	Registro durante hospitalización	f
46	PRE_QCO	Pre-Quirúrgico	Registro previo a cirugía	f
47	POST_QCO	Post-Quirúrgico	Registro posterior a cirugía	f
48	UCI	UCI	Registro en Unidad de Cuidados Intensivos	f
\.


--
-- TOC entry 8114 (class 0 OID 17365)
-- Dependencies: 347
-- Data for Name: tipo_servicio_basico; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_servicio_basico (tipo_servicio_id, codigo, nombre, eliminado) FROM stdin;
57	LUZ	Energía Eléctrica	f
58	AGUA	Agua Potable	f
59	TELEFONO	Telefonía	f
60	INTERNET	Internet	f
61	GAS	Gas Natural/GLP	f
62	LIMPIEZA	Servicio de Limpieza	f
63	SEGURIDAD	Servicio de Seguridad	f
64	MANTENIMIENTO	Mantenimiento	f
\.


--
-- TOC entry 8018 (class 0 OID 16665)
-- Dependencies: 251
-- Data for Name: tipo_servicio_medico; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_servicio_medico (tipo_servicio_id, codigo, nombre, eliminado) FROM stdin;
57	CONSULTA	Consulta Médica	f
58	PROCEDIMIENTO	Procedimiento Médico	f
59	EXAMEN_LAB	Examen de Laboratorio	f
60	EXAMEN_IMAGEN	Examen de Imagen	f
61	CIRUGIA	Cirugía	f
62	HOSPCION	Hospitalización	f
63	EMERGENCIA	Atención de Emergencia	f
64	PARTO	Atención de Parto	f
\.


--
-- TOC entry 8134 (class 0 OID 17519)
-- Dependencies: 367
-- Data for Name: tipo_sugerencia_ia; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_sugerencia_ia (tipo_sugerencia_id, codigo, nombre, eliminado) FROM stdin;
1	DIAG_DIFERENCIAL	Diagnóstico Diferencial	f
2	EXAMEN_COMPTARIO	Examen Complementario	f
3	MEDICAMENTO	Sugerencia de Medicamento	f
4	ALERTA_INTERACCION	Alerta de Interacción	f
5	PROTOCOLO	Recomendación de Protocolo	f
\.


--
-- TOC entry 8124 (class 0 OID 17443)
-- Dependencies: 357
-- Data for Name: tipo_trama_susalud; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_trama_susalud (tipo_trama_id, codigo, nombre, version_formato, estructura_json, eliminado) FROM stdin;
1	ATENCION	Trama de Atenciones	V1.0	{"tipo": "atencion", "campos": ["ipress", "documento", "fecha", "diagnostico"]}	f
2	FINANCIAMIENTO	Trama de Financiamiento	V1.0	{"tipo": "financiamiento", "campos": ["ipress", "periodo", "montos"]}	f
3	REFERENCIA	Trama de Referencias y Contrarreferencias	V1.0	{"tipo": "referencia", "campos": ["ipress_origen", "ipress_destino", "paciente"]}	f
\.


--
-- TOC entry 8058 (class 0 OID 16951)
-- Dependencies: 291
-- Data for Name: tipo_transicion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.tipo_transicion (tipo_transicion_id, codigo, nombre, eliminado) FROM stdin;
1	INGRESO_INICIAL	Ingreso Inicial del Paciente	f
2	PASO_OBSERVACION	Paso a Observación	f
3	PASO_HOSPITALIZACION	Paso a Hospitalización	f
4	PASO_UCI	Paso a UCI	f
5	PASO_UCIN	Paso a UCIN	f
6	PASO_CIRUGIA	Paso a Cirugía	f
7	PASO_RECUPERACION	Paso a Recuperación	f
8	ALTA_MEDICA	Alta Médica	f
9	TRASLADO_SERVICIO	Traslado entre Servicios	f
10	REFERENCIA_EXTERNA	Referencia a Centro Externo	f
11	CONTRARREFERENCIA	Contrarreferencia desde Centro Externo	f
\.


--
-- TOC entry 8310 (class 0 OID 20670)
-- Dependencies: 543
-- Data for Name: trama_susalud; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.trama_susalud (trama_id, organizacion_id, periodo_reporte_id, tipo_trama_id, numero_lote, fecha_generacion, fecha_envio, archivo_txt_nombre, archivo_txt_ruta, archivo_validacion_ruta, archivo_respuesta_ruta, total_registros, registros_aceptados, registros_rechazados, codigo_respuesta_susalud, mensaje_respuesta_susalud, estado, observaciones, personal_genera_id, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8194 (class 0 OID 18417)
-- Dependencies: 427
-- Data for Name: transicion_atencion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.transicion_atencion (transicion_id, atencion_id, episodio_origen_id, episodio_destino_id, tipo_transicion_id, fecha_hora_transicion, personal_autoriza_id, motivo_transicion, condicion_paciente_transicion, servicio_origen_id, servicio_destino_id, cama_origen_id, cama_destino_id, diagnostico_momento_transicion_id, indicaciones_transicion, observaciones, fecha_hora_salida_origen, fecha_hora_llegada_destino, "personal_acompaña_id", medio_transporte, requirio_oxigeno, requirio_monitoreo, incidentes_traslado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8198 (class 0 OID 18528)
-- Dependencies: 431
-- Data for Name: triaje; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.triaje (triaje_id, atencion_id, registro_signos_vitales_id, fecha_hora, personal_triaje_id, prioridad_triaje_id, motivo_consulta_breve, observaciones_triaje, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8002 (class 0 OID 16543)
-- Dependencies: 235
-- Data for Name: ubigeo; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.ubigeo (ubigeo_id, codigo, departamento, provincia, distrito, codigo_departamento, codigo_provincia, eliminado) FROM stdin;
1	150101	LIMA	LIMA	LIMA	15	01	f
\.


--
-- TOC entry 8070 (class 0 OID 17043)
-- Dependencies: 303
-- Data for Name: unidad_medida_farmacia; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.unidad_medida_farmacia (unidad_medida_farmacia_id, codigo, nombre, abreviatura, tipo, factor_conversion, unidad_base_id, orden, eliminado) FROM stdin;
1	TABLETA	Tableta	tab	cantidad	\N	\N	1	f
2	CAPSULA	Cápsula	cap	cantidad	\N	\N	2	f
3	AMPOLLA	Ampolla	amp	cantidad	\N	\N	3	f
4	FRASCO	Frasco	fco	cantidad	\N	\N	4	f
5	CAJA	Caja	cja	unidad_comercial	\N	\N	5	f
6	BLISTER	Blister	bls	unidad_comercial	\N	\N	6	f
7	SOBRE	Sobre	sob	unidad_comercial	\N	\N	7	f
8	TUBO	Tubo	tub	cantidad	\N	\N	8	f
9	VIAL	Vial	vial	cantidad	\N	\N	9	f
10	ML	Mililitro	ml	volumen	\N	\N	10	f
11	MG	Miligramo	mg	peso	\N	\N	11	f
12	GR	Gramo	gr	peso	\N	\N	12	f
13	MCG	Microgramo	mcg	peso	\N	\N	13	f
14	UNIDAD	Unidad	u	cantidad	\N	\N	14	f
\.


--
-- TOC entry 8074 (class 0 OID 17078)
-- Dependencies: 307
-- Data for Name: unidad_medida_general; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.unidad_medida_general (unidad_medida_id, codigo, nombre, abreviatura, tipo, aplicacion, eliminado) FROM stdin;
36	UNIDAD	Unidad	und	cantidad	General	f
37	SERVICIO	Servicio	serv	servicio	General	f
38	SESION	Sesión	ses	servicio	Terapias	f
39	HORA	Hora	h	tiempo	General	f
40	DIA	Día	d	tiempo	Hospitalización	f
\.


--
-- TOC entry 8072 (class 0 OID 17062)
-- Dependencies: 305
-- Data for Name: unidad_medida_laboratorio; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.unidad_medida_laboratorio (unidad_medida_lab_id, codigo, nombre, abreviatura, tipo, descripcion, sistema_medida, factor_conversion_si, orden, eliminado) FROM stdin;
1	MG_DL	Miligramos por decilitro	mg/dL	concentracion	\N	\N	\N	1	f
2	G_DL	Gramos por decilitro	g/dL	concentracion	\N	\N	\N	2	f
3	MMOL_L	Milimoles por litro	mmol/L	concentracion	\N	\N	\N	3	f
4	UI_ML	Unidades internacionales por mililitro	UI/mL	concentracion	\N	\N	\N	4	f
5	PG_ML	Picogramos por mililitro	pg/mL	concentracion	\N	\N	\N	5	f
6	NG_ML	Nanogramos por mililitro	ng/mL	concentracion	\N	\N	\N	6	f
7	CEL_MM3	Células por milímetro cúbico	cél/mm³	conteo	\N	\N	\N	7	f
8	PORCENTAJE	Porcentaje	%	otro	\N	\N	\N	8	f
9	SEGUNDOS	Segundos	seg	tiempo	\N	\N	\N	9	f
10	MM_HORA	Milímetros por hora	mm/h	otro	\N	\N	\N	10	f
\.


--
-- TOC entry 8176 (class 0 OID 18048)
-- Dependencies: 409
-- Data for Name: usuario; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.usuario (usuario_id, personal_id, username, password_hash, rol_id, ultimo_acceso, estado, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
1	4	admin	$2a$12$BAw1Kjo41Gs2jpqACSJUqeC.rFLwaCgcAnl7luWh0yaR9LrzGNVaW	1	2025-10-20 21:56:23.310487	activo	f	1	2025-10-06 02:10:11.451741	\N	2025-10-20 21:56:23.310487	\N	\N
\.


--
-- TOC entry 8340 (class 0 OID 21093)
-- Dependencies: 573
-- Data for Name: valor_kpi; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.valor_kpi (valor_kpi_id, kpi_id, periodo_id, fecha_calculo, valor, valor_anterior, variacion_porcentaje, cumple_meta, observaciones, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8080 (class 0 OID 17120)
-- Dependencies: 313
-- Data for Name: via_administracion; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.via_administracion (via_administracion_id, codigo, nombre, eliminado) FROM stdin;
1	ORAL	Vía Oral	f
2	SUBLINGUAL	Vía Sublingual	f
3	INTRAMUSCULAR	Vía Intramuscular	f
4	INTRAVENOSA	Vía Intravenosa	f
5	SUBCUTANEA	Vía Subcutánea	f
6	TOPICA	Vía Tópica	f
7	RECTAL	Vía Rectal	f
8	VAGINAL	Vía Vaginal	f
9	INHALATORIA	Vía Inhalatoria	f
10	OFTALMICA	Vía Oftálmica	f
11	OTICA	Vía Ótica	f
12	NASAL	Vía Nasal	f
13	TRANSDERMICA	Vía Transdérmica	f
14	INTRADERMICA	Vía Intradérmica	f
\.


--
-- TOC entry 8054 (class 0 OID 16923)
-- Dependencies: 287
-- Data for Name: via_ingreso_hospitalario; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.via_ingreso_hospitalario (via_ingreso_id, codigo, nombre, eliminado) FROM stdin;
36	EMERGENCIA	Vía Emergencia	f
37	CONSULTA_EXT	Vía Consulta Externa	f
38	REFERENCIA	Por Referencia	f
39	DIRECTO	Ingreso Directo	f
40	POST_QCO	Post-Quirúrgico	f
\.


--
-- TOC entry 8334 (class 0 OID 21023)
-- Dependencies: 567
-- Data for Name: widget_dashboard; Type: TABLE DATA; Schema: medico; Owner: postgres
--

COPY medico.widget_dashboard (widget_id, dashboard_id, nombre, tipo_widget, configuracion_json, query_sql, posicion_x, posicion_y, ancho, alto, refresh_minutos, orden, eliminado, usuario_creacion_id, fecha_creacion, usuario_actualizacion_id, fecha_actualizacion, usuario_eliminacion_id, fecha_eliminacion) FROM stdin;
\.


--
-- TOC entry 8614 (class 0 OID 0)
-- Dependencies: 418
-- Name: agenda_agenda_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.agenda_agenda_id_seq', 1, false);


--
-- TOC entry 8615 (class 0 OID 0)
-- Dependencies: 386
-- Name: alergia_alergia_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.alergia_alergia_id_seq', 1, false);


--
-- TOC entry 8616 (class 0 OID 0)
-- Dependencies: 578
-- Name: alerta_ia_alerta_ia_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.alerta_ia_alerta_ia_id_seq', 1, false);


--
-- TOC entry 8617 (class 0 OID 0)
-- Dependencies: 466
-- Name: almacen_almacen_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.almacen_almacen_id_seq', 1, false);


--
-- TOC entry 8618 (class 0 OID 0)
-- Dependencies: 392
-- Name: antecedente_medico_antecedente_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.antecedente_medico_antecedente_id_seq', 1, false);


--
-- TOC entry 8619 (class 0 OID 0)
-- Dependencies: 516
-- Name: apertura_caja_apertura_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.apertura_caja_apertura_id_seq', 1, false);


--
-- TOC entry 8620 (class 0 OID 0)
-- Dependencies: 316
-- Name: area_examen_area_examen_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.area_examen_area_examen_id_seq', 3, true);


--
-- TOC entry 8621 (class 0 OID 0)
-- Dependencies: 382
-- Name: aseguradora_aseguradora_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.aseguradora_aseguradora_id_seq', 1, false);


--
-- TOC entry 8622 (class 0 OID 0)
-- Dependencies: 422
-- Name: atencion_atencion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.atencion_atencion_id_seq', 1, false);


--
-- TOC entry 8623 (class 0 OID 0)
-- Dependencies: 550
-- Name: auditoria_hc_auditoria_hc_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.auditoria_hc_auditoria_hc_id_seq', 1, false);


--
-- TOC entry 8624 (class 0 OID 0)
-- Dependencies: 532
-- Name: balance_balance_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.balance_balance_id_seq', 1, false);


--
-- TOC entry 8625 (class 0 OID 0)
-- Dependencies: 514
-- Name: caja_caja_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.caja_caja_id_seq', 1, true);


--
-- TOC entry 8626 (class 0 OID 0)
-- Dependencies: 414
-- Name: cama_cama_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.cama_cama_id_seq', 1, false);


--
-- TOC entry 8627 (class 0 OID 0)
-- Dependencies: 244
-- Name: cargo_cargo_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.cargo_cargo_id_seq', 104, true);


--
-- TOC entry 8628 (class 0 OID 0)
-- Dependencies: 352
-- Name: categoria_balance_categoria_balance_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.categoria_balance_categoria_balance_id_seq', 21, true);


--
-- TOC entry 8629 (class 0 OID 0)
-- Dependencies: 314
-- Name: categoria_examen_categoria_examen_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.categoria_examen_categoria_examen_id_seq', 11, true);


--
-- TOC entry 8630 (class 0 OID 0)
-- Dependencies: 344
-- Name: categoria_movimiento_categoria_movimiento_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.categoria_movimiento_categoria_movimiento_id_seq', 56, true);


--
-- TOC entry 8631 (class 0 OID 0)
-- Dependencies: 298
-- Name: categoria_producto_categoria_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.categoria_producto_categoria_id_seq', 7, true);


--
-- TOC entry 8632 (class 0 OID 0)
-- Dependencies: 362
-- Name: categoria_reporte_categoria_reporte_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.categoria_reporte_categoria_reporte_id_seq', 6, true);


--
-- TOC entry 8633 (class 0 OID 0)
-- Dependencies: 390
-- Name: cie10_cie10_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.cie10_cie10_id_seq', 1, false);


--
-- TOC entry 8634 (class 0 OID 0)
-- Dependencies: 442
-- Name: cie10_personalizado_cie10_personalizado_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.cie10_personalizado_cie10_personalizado_id_seq', 1, false);


--
-- TOC entry 8635 (class 0 OID 0)
-- Dependencies: 420
-- Name: cita_cita_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.cita_cita_id_seq', 1, false);


--
-- TOC entry 8636 (class 0 OID 0)
-- Dependencies: 506
-- Name: comprobante_comprobante_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.comprobante_comprobante_id_seq', 1, false);


--
-- TOC entry 8637 (class 0 OID 0)
-- Dependencies: 338
-- Name: concepto_facturacion_concepto_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.concepto_facturacion_concepto_id_seq', 64, true);


--
-- TOC entry 8638 (class 0 OID 0)
-- Dependencies: 348
-- Name: concepto_planilla_concepto_planilla_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.concepto_planilla_concepto_planilla_id_seq', 88, true);


--
-- TOC entry 8639 (class 0 OID 0)
-- Dependencies: 524
-- Name: concepto_planilla_personal_concepto_planilla_personal_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.concepto_planilla_personal_concepto_planilla_personal_id_seq', 1, false);


--
-- TOC entry 8640 (class 0 OID 0)
-- Dependencies: 604
-- Name: configuracion_sistema_configuracion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.configuracion_sistema_configuracion_id_seq', 1, false);


--
-- TOC entry 8641 (class 0 OID 0)
-- Dependencies: 594
-- Name: consentimiento_informado_consentimiento_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.consentimiento_informado_consentimiento_id_seq', 1, false);


--
-- TOC entry 8642 (class 0 OID 0)
-- Dependencies: 410
-- Name: consultorio_consultorio_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.consultorio_consultorio_id_seq', 1, false);


--
-- TOC entry 8643 (class 0 OID 0)
-- Dependencies: 546
-- Name: criterio_auditoria_criterio_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.criterio_auditoria_criterio_id_seq', 4, true);


--
-- TOC entry 8644 (class 0 OID 0)
-- Dependencies: 564
-- Name: dashboard_gerencial_dashboard_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.dashboard_gerencial_dashboard_id_seq', 1, false);


--
-- TOC entry 8645 (class 0 OID 0)
-- Dependencies: 568
-- Name: dashboard_rol_dashboard_rol_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.dashboard_rol_dashboard_rol_id_seq', 1, false);


--
-- TOC entry 8646 (class 0 OID 0)
-- Dependencies: 552
-- Name: detalle_auditoria_detalle_auditoria_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.detalle_auditoria_detalle_auditoria_id_seq', 1, false);


--
-- TOC entry 8647 (class 0 OID 0)
-- Dependencies: 534
-- Name: detalle_balance_detalle_balance_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.detalle_balance_detalle_balance_id_seq', 1, false);


--
-- TOC entry 8648 (class 0 OID 0)
-- Dependencies: 508
-- Name: detalle_comprobante_detalle_comprobante_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.detalle_comprobante_detalle_comprobante_id_seq', 1, false);


--
-- TOC entry 8649 (class 0 OID 0)
-- Dependencies: 482
-- Name: detalle_dispensacion_detalle_dispensacion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.detalle_dispensacion_detalle_dispensacion_id_seq', 1, false);


--
-- TOC entry 8650 (class 0 OID 0)
-- Dependencies: 434
-- Name: detalle_examen_fisico_detalle_examen_fisico_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.detalle_examen_fisico_detalle_examen_fisico_id_seq', 1, false);


--
-- TOC entry 8651 (class 0 OID 0)
-- Dependencies: 474
-- Name: detalle_movimiento_almacen_detalle_movimiento_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.detalle_movimiento_almacen_detalle_movimiento_id_seq', 1, false);


--
-- TOC entry 8652 (class 0 OID 0)
-- Dependencies: 522
-- Name: detalle_planilla_detalle_planilla_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.detalle_planilla_detalle_planilla_id_seq', 1, false);


--
-- TOC entry 8653 (class 0 OID 0)
-- Dependencies: 478
-- Name: detalle_receta_detalle_receta_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.detalle_receta_detalle_receta_id_seq', 1, false);


--
-- TOC entry 8654 (class 0 OID 0)
-- Dependencies: 488
-- Name: detalle_solicitud_examen_detalle_solicitud_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.detalle_solicitud_examen_detalle_solicitud_id_seq', 1, false);


--
-- TOC entry 8655 (class 0 OID 0)
-- Dependencies: 544
-- Name: detalle_trama_atencion_detalle_trama_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.detalle_trama_atencion_detalle_trama_id_seq', 1, false);


--
-- TOC entry 8656 (class 0 OID 0)
-- Dependencies: 444
-- Name: diagnostico_atencion_diagnostico_atencion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.diagnostico_atencion_diagnostico_atencion_id_seq', 1, false);


--
-- TOC entry 8657 (class 0 OID 0)
-- Dependencies: 480
-- Name: dispensacion_dispensacion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.dispensacion_dispensacion_id_seq', 1, false);


--
-- TOC entry 8658 (class 0 OID 0)
-- Dependencies: 596
-- Name: documento_clinico_documento_clinico_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.documento_clinico_documento_clinico_id_seq', 1, false);


--
-- TOC entry 8659 (class 0 OID 0)
-- Dependencies: 440
-- Name: ejecucion_indicacion_ejecucion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.ejecucion_indicacion_ejecucion_id_seq', 1, false);


--
-- TOC entry 8660 (class 0 OID 0)
-- Dependencies: 562
-- Name: ejecucion_reporte_ejecucion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.ejecucion_reporte_ejecucion_id_seq', 1, false);


--
-- TOC entry 8661 (class 0 OID 0)
-- Dependencies: 580
-- Name: entrenamiento_modelo_entrenamiento_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.entrenamiento_modelo_entrenamiento_id_seq', 1, false);


--
-- TOC entry 8662 (class 0 OID 0)
-- Dependencies: 424
-- Name: episodio_clinico_episodio_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.episodio_clinico_episodio_id_seq', 1, false);


--
-- TOC entry 8663 (class 0 OID 0)
-- Dependencies: 246
-- Name: especialidad_medica_especialidad_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.especialidad_medica_especialidad_id_seq', 200, true);


--
-- TOC entry 8664 (class 0 OID 0)
-- Dependencies: 258
-- Name: estado_atencion_estado_atencion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.estado_atencion_estado_atencion_id_seq', 12, true);


--
-- TOC entry 8665 (class 0 OID 0)
-- Dependencies: 342
-- Name: estado_caja_estado_caja_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.estado_caja_estado_caja_id_seq', 4, true);


--
-- TOC entry 8666 (class 0 OID 0)
-- Dependencies: 254
-- Name: estado_cama_estado_cama_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.estado_cama_estado_cama_id_seq', 40, true);


--
-- TOC entry 8667 (class 0 OID 0)
-- Dependencies: 266
-- Name: estado_cita_estado_cita_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.estado_cita_estado_cita_id_seq', 6, true);


--
-- TOC entry 8668 (class 0 OID 0)
-- Dependencies: 226
-- Name: estado_civil_estado_civil_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.estado_civil_estado_civil_id_seq', 5, true);


--
-- TOC entry 8669 (class 0 OID 0)
-- Dependencies: 262
-- Name: estado_episodio_estado_episodio_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.estado_episodio_estado_episodio_id_seq', 5, true);


--
-- TOC entry 8670 (class 0 OID 0)
-- Dependencies: 294
-- Name: estado_interconsulta_estado_interconsulta_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.estado_interconsulta_estado_interconsulta_id_seq', 40, true);


--
-- TOC entry 8671 (class 0 OID 0)
-- Dependencies: 310
-- Name: estado_receta_estado_receta_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.estado_receta_estado_receta_id_seq', 9, true);


--
-- TOC entry 8672 (class 0 OID 0)
-- Dependencies: 328
-- Name: estado_resultado_laboratorio_estado_resultado_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.estado_resultado_laboratorio_estado_resultado_id_seq', 40, true);


--
-- TOC entry 8673 (class 0 OID 0)
-- Dependencies: 320
-- Name: estado_solicitud_examen_estado_solicitud_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.estado_solicitud_examen_estado_solicitud_id_seq', 40, true);


--
-- TOC entry 8674 (class 0 OID 0)
-- Dependencies: 436
-- Name: evolucion_clinica_evolucion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.evolucion_clinica_evolucion_id_seq', 1, false);


--
-- TOC entry 8675 (class 0 OID 0)
-- Dependencies: 432
-- Name: examen_fisico_examen_fisico_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.examen_fisico_examen_fisico_id_seq', 1, false);


--
-- TOC entry 8676 (class 0 OID 0)
-- Dependencies: 500
-- Name: examen_imagen_examen_imagen_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.examen_imagen_examen_imagen_id_seq', 1, false);


--
-- TOC entry 8677 (class 0 OID 0)
-- Dependencies: 492
-- Name: examen_laboratorio_examen_lab_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.examen_laboratorio_examen_lab_id_seq', 1, false);


--
-- TOC entry 8678 (class 0 OID 0)
-- Dependencies: 230
-- Name: factor_rh_factor_rh_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.factor_rh_factor_rh_id_seq', 2, true);


--
-- TOC entry 8679 (class 0 OID 0)
-- Dependencies: 284
-- Name: forma_llegada_forma_llegada_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.forma_llegada_forma_llegada_id_seq', 40, true);


--
-- TOC entry 8680 (class 0 OID 0)
-- Dependencies: 336
-- Name: forma_pago_forma_pago_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.forma_pago_forma_pago_id_seq', 7, true);


--
-- TOC entry 8681 (class 0 OID 0)
-- Dependencies: 228
-- Name: grupo_sanguineo_grupo_sanguineo_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.grupo_sanguineo_grupo_sanguineo_id_seq', 4, true);


--
-- TOC entry 8682 (class 0 OID 0)
-- Dependencies: 452
-- Name: historia_clinica_ambulatoria_historia_ambulatoria_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.historia_clinica_ambulatoria_historia_ambulatoria_id_seq', 1, false);


--
-- TOC entry 8683 (class 0 OID 0)
-- Dependencies: 454
-- Name: historia_clinica_emergencia_historia_emergencia_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.historia_clinica_emergencia_historia_emergencia_id_seq', 1, false);


--
-- TOC entry 8684 (class 0 OID 0)
-- Dependencies: 460
-- Name: historia_clinica_hospitalizacio_historia_hospitalizacion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.historia_clinica_hospitalizacio_historia_hospitalizacion_id_seq', 1, false);


--
-- TOC entry 8685 (class 0 OID 0)
-- Dependencies: 456
-- Name: hospitalizacion_hospitalizacion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.hospitalizacion_hospitalizacion_id_seq', 1, false);


--
-- TOC entry 8686 (class 0 OID 0)
-- Dependencies: 502
-- Name: imagen_digital_imagen_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.imagen_digital_imagen_id_seq', 1, false);


--
-- TOC entry 8687 (class 0 OID 0)
-- Dependencies: 438
-- Name: indicacion_medica_indicacion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.indicacion_medica_indicacion_id_seq', 1, false);


--
-- TOC entry 8688 (class 0 OID 0)
-- Dependencies: 536
-- Name: indicador_financiero_indicador_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.indicador_financiero_indicador_id_seq', 1, false);


--
-- TOC entry 8689 (class 0 OID 0)
-- Dependencies: 570
-- Name: indicador_kpi_kpi_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.indicador_kpi_kpi_id_seq', 1, false);


--
-- TOC entry 8690 (class 0 OID 0)
-- Dependencies: 504
-- Name: informe_imagen_informe_imagen_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.informe_imagen_informe_imagen_id_seq', 1, false);


--
-- TOC entry 8691 (class 0 OID 0)
-- Dependencies: 512
-- Name: integracion_nubefact_integracion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.integracion_nubefact_integracion_id_seq', 1, false);


--
-- TOC entry 8692 (class 0 OID 0)
-- Dependencies: 450
-- Name: interconsulta_interconsulta_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.interconsulta_interconsulta_id_seq', 1, false);


--
-- TOC entry 8693 (class 0 OID 0)
-- Dependencies: 602
-- Name: log_acceso_hc_log_acceso_hc_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.log_acceso_hc_log_acceso_hc_id_seq', 1, false);


--
-- TOC entry 8694 (class 0 OID 0)
-- Dependencies: 600
-- Name: log_acceso_sistema_log_acceso_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.log_acceso_sistema_log_acceso_id_seq', 1, false);


--
-- TOC entry 8695 (class 0 OID 0)
-- Dependencies: 598
-- Name: log_auditoria_sistema_log_auditoria_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.log_auditoria_sistema_log_auditoria_id_seq', 1, false);


--
-- TOC entry 8696 (class 0 OID 0)
-- Dependencies: 582
-- Name: log_ia_log_ia_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.log_ia_log_ia_id_seq', 1, false);


--
-- TOC entry 8697 (class 0 OID 0)
-- Dependencies: 470
-- Name: lote_producto_lote_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.lote_producto_lote_id_seq', 1, false);


--
-- TOC entry 8698 (class 0 OID 0)
-- Dependencies: 592
-- Name: mapeo_codigo_mapeo_codigo_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.mapeo_codigo_mapeo_codigo_id_seq', 1, false);


--
-- TOC entry 8699 (class 0 OID 0)
-- Dependencies: 458
-- Name: medico_hospitalizacion_medico_hospitalizacion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.medico_hospitalizacion_medico_hospitalizacion_id_seq', 1, false);


--
-- TOC entry 8700 (class 0 OID 0)
-- Dependencies: 590
-- Name: mensaje_hl7_mensaje_hl7_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.mensaje_hl7_mensaje_hl7_id_seq', 1, false);


--
-- TOC entry 8701 (class 0 OID 0)
-- Dependencies: 326
-- Name: metodo_examen_metodo_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.metodo_examen_metodo_id_seq', 48, true);


--
-- TOC entry 8702 (class 0 OID 0)
-- Dependencies: 574
-- Name: modelo_ia_modelo_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.modelo_ia_modelo_id_seq', 1, false);


--
-- TOC entry 8703 (class 0 OID 0)
-- Dependencies: 334
-- Name: moneda_moneda_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.moneda_moneda_id_seq', 3, true);


--
-- TOC entry 8704 (class 0 OID 0)
-- Dependencies: 416
-- Name: motivo_consulta_predefinido_motivo_consulta_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.motivo_consulta_predefinido_motivo_consulta_id_seq', 4, true);


--
-- TOC entry 8705 (class 0 OID 0)
-- Dependencies: 472
-- Name: movimiento_almacen_movimiento_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.movimiento_almacen_movimiento_id_seq', 1, false);


--
-- TOC entry 8706 (class 0 OID 0)
-- Dependencies: 518
-- Name: movimiento_caja_movimiento_caja_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.movimiento_caja_movimiento_caja_id_seq', 1, false);


--
-- TOC entry 8707 (class 0 OID 0)
-- Dependencies: 462
-- Name: movimiento_cama_movimiento_cama_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.movimiento_cama_movimiento_cama_id_seq', 1, false);


--
-- TOC entry 8708 (class 0 OID 0)
-- Dependencies: 490
-- Name: muestra_laboratorio_muestra_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.muestra_laboratorio_muestra_id_seq', 1, false);


--
-- TOC entry 8709 (class 0 OID 0)
-- Dependencies: 360
-- Name: opcion_cumplimiento_opcion_cumplimiento_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.opcion_cumplimiento_opcion_cumplimiento_id_seq', 20, true);


--
-- TOC entry 8710 (class 0 OID 0)
-- Dependencies: 280
-- Name: orden_diagnostico_orden_diagnostico_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.orden_diagnostico_orden_diagnostico_id_seq', 32, true);


--
-- TOC entry 8711 (class 0 OID 0)
-- Dependencies: 374
-- Name: organizacion_organizacion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.organizacion_organizacion_id_seq', 1, false);


--
-- TOC entry 8712 (class 0 OID 0)
-- Dependencies: 388
-- Name: paciente_alergia_paciente_alergia_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.paciente_alergia_paciente_alergia_id_seq', 1, false);


--
-- TOC entry 8713 (class 0 OID 0)
-- Dependencies: 396
-- Name: paciente_antecedente_familiar_paciente_antecedente_familiar_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.paciente_antecedente_familiar_paciente_antecedente_familiar_seq', 1, false);


--
-- TOC entry 8714 (class 0 OID 0)
-- Dependencies: 394
-- Name: paciente_antecedente_personal_paciente_antecedente_personal_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.paciente_antecedente_personal_paciente_antecedente_personal_seq', 1, false);


--
-- TOC entry 8715 (class 0 OID 0)
-- Dependencies: 384
-- Name: paciente_aseguradora_paciente_aseguradora_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.paciente_aseguradora_paciente_aseguradora_id_seq', 1, false);


--
-- TOC entry 8716 (class 0 OID 0)
-- Dependencies: 380
-- Name: paciente_paciente_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.paciente_paciente_id_seq', 2, true);


--
-- TOC entry 8717 (class 0 OID 0)
-- Dependencies: 510
-- Name: pago_comprobante_pago_comprobante_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.pago_comprobante_pago_comprobante_id_seq', 1, false);


--
-- TOC entry 8718 (class 0 OID 0)
-- Dependencies: 526
-- Name: pago_planilla_pago_planilla_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.pago_planilla_pago_planilla_id_seq', 1, false);


--
-- TOC entry 8719 (class 0 OID 0)
-- Dependencies: 528
-- Name: pago_servicio_pago_servicio_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.pago_servicio_pago_servicio_id_seq', 1, false);


--
-- TOC entry 8720 (class 0 OID 0)
-- Dependencies: 494
-- Name: parametro_laboratorio_parametro_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.parametro_laboratorio_parametro_id_seq', 1, false);


--
-- TOC entry 8721 (class 0 OID 0)
-- Dependencies: 232
-- Name: parentesco_parentesco_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.parentesco_parentesco_id_seq', 13, true);


--
-- TOC entry 8722 (class 0 OID 0)
-- Dependencies: 530
-- Name: periodo_contable_periodo_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.periodo_contable_periodo_id_seq', 1, false);


--
-- TOC entry 8723 (class 0 OID 0)
-- Dependencies: 520
-- Name: periodo_planilla_periodo_planilla_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.periodo_planilla_periodo_planilla_id_seq', 1, false);


--
-- TOC entry 8724 (class 0 OID 0)
-- Dependencies: 540
-- Name: periodo_reporte_susalud_periodo_reporte_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.periodo_reporte_susalud_periodo_reporte_id_seq', 1, false);


--
-- TOC entry 8725 (class 0 OID 0)
-- Dependencies: 404
-- Name: permiso_permiso_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.permiso_permiso_id_seq', 41, true);


--
-- TOC entry 8726 (class 0 OID 0)
-- Dependencies: 378
-- Name: persona_persona_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.persona_persona_id_seq', 2, true);


--
-- TOC entry 8727 (class 0 OID 0)
-- Dependencies: 400
-- Name: personal_especialidad_personal_especialidad_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.personal_especialidad_personal_especialidad_id_seq', 1, false);


--
-- TOC entry 8728 (class 0 OID 0)
-- Dependencies: 398
-- Name: personal_personal_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.personal_personal_id_seq', 4, true);


--
-- TOC entry 8729 (class 0 OID 0)
-- Dependencies: 448
-- Name: personal_procedimiento_personal_procedimiento_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.personal_procedimiento_personal_procedimiento_id_seq', 1, false);


--
-- TOC entry 8730 (class 0 OID 0)
-- Dependencies: 554
-- Name: plan_mejora_auditoria_plan_mejora_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.plan_mejora_auditoria_plan_mejora_id_seq', 1, false);


--
-- TOC entry 8731 (class 0 OID 0)
-- Dependencies: 538
-- Name: presupuesto_presupuesto_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.presupuesto_presupuesto_id_seq', 1, false);


--
-- TOC entry 8732 (class 0 OID 0)
-- Dependencies: 318
-- Name: prioridad_solicitud_prioridad_solicitud_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.prioridad_solicitud_prioridad_solicitud_id_seq', 32, true);


--
-- TOC entry 8733 (class 0 OID 0)
-- Dependencies: 282
-- Name: prioridad_triaje_prioridad_triaje_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.prioridad_triaje_prioridad_triaje_id_seq', 5, true);


--
-- TOC entry 8734 (class 0 OID 0)
-- Dependencies: 446
-- Name: procedimiento_realizado_procedimiento_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.procedimiento_realizado_procedimiento_id_seq', 1, false);


--
-- TOC entry 8735 (class 0 OID 0)
-- Dependencies: 468
-- Name: producto_producto_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.producto_producto_id_seq', 1, false);


--
-- TOC entry 8736 (class 0 OID 0)
-- Dependencies: 464
-- Name: proveedor_proveedor_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.proveedor_proveedor_id_seq', 1, false);


--
-- TOC entry 8737 (class 0 OID 0)
-- Dependencies: 476
-- Name: receta_receta_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.receta_receta_id_seq', 1, false);


--
-- TOC entry 8738 (class 0 OID 0)
-- Dependencies: 586
-- Name: recurso_fhir_recurso_fhir_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.recurso_fhir_recurso_fhir_id_seq', 1, false);


--
-- TOC entry 8739 (class 0 OID 0)
-- Dependencies: 428
-- Name: registro_signos_vitales_registro_signos_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.registro_signos_vitales_registro_signos_id_seq', 1, false);


--
-- TOC entry 8740 (class 0 OID 0)
-- Dependencies: 556
-- Name: reporte_configuracion_reporte_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.reporte_configuracion_reporte_id_seq', 1, false);


--
-- TOC entry 8741 (class 0 OID 0)
-- Dependencies: 558
-- Name: reporte_parametro_reporte_parametro_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.reporte_parametro_reporte_parametro_id_seq', 1, false);


--
-- TOC entry 8742 (class 0 OID 0)
-- Dependencies: 560
-- Name: reporte_rol_reporte_rol_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.reporte_rol_reporte_rol_id_seq', 1, false);


--
-- TOC entry 8743 (class 0 OID 0)
-- Dependencies: 498
-- Name: resultado_laboratorio_resultado_lab_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.resultado_laboratorio_resultado_lab_id_seq', 1, false);


--
-- TOC entry 8744 (class 0 OID 0)
-- Dependencies: 496
-- Name: resultado_parametro_resultado_parametro_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.resultado_parametro_resultado_parametro_id_seq', 1, false);


--
-- TOC entry 8745 (class 0 OID 0)
-- Dependencies: 406
-- Name: rol_permiso_rol_permiso_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.rol_permiso_rol_permiso_id_seq', 67, true);


--
-- TOC entry 8746 (class 0 OID 0)
-- Dependencies: 402
-- Name: rol_rol_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.rol_rol_id_seq', 13, true);


--
-- TOC entry 8747 (class 0 OID 0)
-- Dependencies: 376
-- Name: sede_sede_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.sede_sede_id_seq', 1, false);


--
-- TOC entry 8748 (class 0 OID 0)
-- Dependencies: 611
-- Name: seq_numero_atencion; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.seq_numero_atencion', 1, false);


--
-- TOC entry 8749 (class 0 OID 0)
-- Dependencies: 618
-- Name: seq_numero_auditoria; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.seq_numero_auditoria', 1, false);


--
-- TOC entry 8750 (class 0 OID 0)
-- Dependencies: 613
-- Name: seq_numero_cita; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.seq_numero_cita', 1, false);


--
-- TOC entry 8751 (class 0 OID 0)
-- Dependencies: 617
-- Name: seq_numero_comprobante; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.seq_numero_comprobante', 1, false);


--
-- TOC entry 8752 (class 0 OID 0)
-- Dependencies: 612
-- Name: seq_numero_historia_clinica; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.seq_numero_historia_clinica', 1, false);


--
-- TOC entry 8753 (class 0 OID 0)
-- Dependencies: 615
-- Name: seq_numero_hospitalizacion; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.seq_numero_hospitalizacion', 1, false);


--
-- TOC entry 8754 (class 0 OID 0)
-- Dependencies: 619
-- Name: seq_numero_interconsulta; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.seq_numero_interconsulta', 1, false);


--
-- TOC entry 8755 (class 0 OID 0)
-- Dependencies: 614
-- Name: seq_numero_receta; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.seq_numero_receta', 1, false);


--
-- TOC entry 8756 (class 0 OID 0)
-- Dependencies: 616
-- Name: seq_numero_solicitud_examen; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.seq_numero_solicitud_examen', 1, false);


--
-- TOC entry 8757 (class 0 OID 0)
-- Dependencies: 412
-- Name: servicio_medico_servicio_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.servicio_medico_servicio_id_seq', 1, false);


--
-- TOC entry 8758 (class 0 OID 0)
-- Dependencies: 224
-- Name: sexo_sexo_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.sexo_sexo_id_seq', 2, true);


--
-- TOC entry 8759 (class 0 OID 0)
-- Dependencies: 588
-- Name: sincronizacion_fhir_sincronizacion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.sincronizacion_fhir_sincronizacion_id_seq', 1, false);


--
-- TOC entry 8760 (class 0 OID 0)
-- Dependencies: 272
-- Name: sistema_corporal_sistema_corporal_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.sistema_corporal_sistema_corporal_id_seq', 120, true);


--
-- TOC entry 8761 (class 0 OID 0)
-- Dependencies: 584
-- Name: sistema_externo_sistema_externo_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.sistema_externo_sistema_externo_id_seq', 4, true);


--
-- TOC entry 8762 (class 0 OID 0)
-- Dependencies: 486
-- Name: solicitud_examen_solicitud_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.solicitud_examen_solicitud_id_seq', 1, false);


--
-- TOC entry 8763 (class 0 OID 0)
-- Dependencies: 354
-- Name: subcategoria_balance_subcategoria_balance_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.subcategoria_balance_subcategoria_balance_id_seq', 29, true);


--
-- TOC entry 8764 (class 0 OID 0)
-- Dependencies: 548
-- Name: subcriterio_auditoria_subcriterio_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.subcriterio_auditoria_subcriterio_id_seq', 1, false);


--
-- TOC entry 8765 (class 0 OID 0)
-- Dependencies: 576
-- Name: sugerencia_ia_sugerencia_ia_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.sugerencia_ia_sugerencia_ia_id_seq', 1, false);


--
-- TOC entry 8766 (class 0 OID 0)
-- Dependencies: 296
-- Name: tipo_almacen_tipo_almacen_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_almacen_tipo_almacen_id_seq', 7, true);


--
-- TOC entry 8767 (class 0 OID 0)
-- Dependencies: 288
-- Name: tipo_alta_tipo_alta_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_alta_tipo_alta_id_seq', 14, true);


--
-- TOC entry 8768 (class 0 OID 0)
-- Dependencies: 240
-- Name: tipo_aseguradora_tipo_aseguradora_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_aseguradora_tipo_aseguradora_id_seq', 18, true);


--
-- TOC entry 8769 (class 0 OID 0)
-- Dependencies: 256
-- Name: tipo_atencion_tipo_atencion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_atencion_tipo_atencion_id_seq', 12, true);


--
-- TOC entry 8770 (class 0 OID 0)
-- Dependencies: 358
-- Name: tipo_auditoria_tipo_auditoria_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_auditoria_tipo_auditoria_id_seq', 8, true);


--
-- TOC entry 8771 (class 0 OID 0)
-- Dependencies: 350
-- Name: tipo_balance_tipo_balance_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_balance_tipo_balance_id_seq', 30, true);


--
-- TOC entry 8772 (class 0 OID 0)
-- Dependencies: 340
-- Name: tipo_caja_tipo_caja_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_caja_tipo_caja_id_seq', 5, true);


--
-- TOC entry 8773 (class 0 OID 0)
-- Dependencies: 252
-- Name: tipo_cama_tipo_cama_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_cama_tipo_cama_id_seq', 40, true);


--
-- TOC entry 8774 (class 0 OID 0)
-- Dependencies: 264
-- Name: tipo_cita_tipo_cita_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_cita_tipo_cita_id_seq', 40, true);


--
-- TOC entry 8775 (class 0 OID 0)
-- Dependencies: 332
-- Name: tipo_comprobante_tipo_comprobante_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_comprobante_tipo_comprobante_id_seq', 4, true);


--
-- TOC entry 8776 (class 0 OID 0)
-- Dependencies: 372
-- Name: tipo_consentimiento_tipo_consentimiento_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_consentimiento_tipo_consentimiento_id_seq', 40, true);


--
-- TOC entry 8777 (class 0 OID 0)
-- Dependencies: 248
-- Name: tipo_consultorio_tipo_consultorio_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_consultorio_tipo_consultorio_id_seq', 48, true);


--
-- TOC entry 8778 (class 0 OID 0)
-- Dependencies: 278
-- Name: tipo_diagnostico_tipo_diagnostico_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_diagnostico_tipo_diagnostico_id_seq', 24, true);


--
-- TOC entry 8779 (class 0 OID 0)
-- Dependencies: 222
-- Name: tipo_documento_tipo_documento_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_documento_tipo_documento_id_seq', 4, true);


--
-- TOC entry 8780 (class 0 OID 0)
-- Dependencies: 260
-- Name: tipo_episodio_tipo_episodio_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_episodio_tipo_episodio_id_seq', 8, true);


--
-- TOC entry 8781 (class 0 OID 0)
-- Dependencies: 324
-- Name: tipo_equipo_laboratorio_tipo_equipo_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_equipo_laboratorio_tipo_equipo_id_seq', 32, true);


--
-- TOC entry 8782 (class 0 OID 0)
-- Dependencies: 274
-- Name: tipo_evolucion_tipo_evolucion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_evolucion_tipo_evolucion_id_seq', 40, true);


--
-- TOC entry 8783 (class 0 OID 0)
-- Dependencies: 270
-- Name: tipo_examen_fisico_tipo_examen_fisico_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_examen_fisico_tipo_examen_fisico_id_seq', 32, true);


--
-- TOC entry 8784 (class 0 OID 0)
-- Dependencies: 484
-- Name: tipo_examen_tipo_examen_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_examen_tipo_examen_id_seq', 1, false);


--
-- TOC entry 8785 (class 0 OID 0)
-- Dependencies: 300
-- Name: tipo_forma_farmaceutica_forma_farmaceutica_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_forma_farmaceutica_forma_farmaceutica_id_seq', 18, true);


--
-- TOC entry 8786 (class 0 OID 0)
-- Dependencies: 330
-- Name: tipo_formato_imagen_tipo_formato_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_formato_imagen_tipo_formato_id_seq', 40, true);


--
-- TOC entry 8787 (class 0 OID 0)
-- Dependencies: 276
-- Name: tipo_indicacion_tipo_indicacion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_indicacion_tipo_indicacion_id_seq', 56, true);


--
-- TOC entry 8788 (class 0 OID 0)
-- Dependencies: 370
-- Name: tipo_mensaje_hl7_tipo_mensaje_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_mensaje_hl7_tipo_mensaje_id_seq', 5, true);


--
-- TOC entry 8789 (class 0 OID 0)
-- Dependencies: 364
-- Name: tipo_modelo_ia_tipo_modelo_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_modelo_ia_tipo_modelo_id_seq', 40, true);


--
-- TOC entry 8790 (class 0 OID 0)
-- Dependencies: 308
-- Name: tipo_movimiento_almacen_tipo_movimiento_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_movimiento_almacen_tipo_movimiento_id_seq', 80, true);


--
-- TOC entry 8791 (class 0 OID 0)
-- Dependencies: 322
-- Name: tipo_muestra_tipo_muestra_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_muestra_tipo_muestra_id_seq', 65, true);


--
-- TOC entry 8792 (class 0 OID 0)
-- Dependencies: 236
-- Name: tipo_organizacion_tipo_organizacion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_organizacion_tipo_organizacion_id_seq', 56, true);


--
-- TOC entry 8793 (class 0 OID 0)
-- Dependencies: 238
-- Name: tipo_paciente_tipo_paciente_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_paciente_tipo_paciente_id_seq', 40, true);


--
-- TOC entry 8794 (class 0 OID 0)
-- Dependencies: 242
-- Name: tipo_personal_tipo_personal_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_personal_tipo_personal_id_seq', 120, true);


--
-- TOC entry 8795 (class 0 OID 0)
-- Dependencies: 292
-- Name: tipo_procedimiento_tipo_procedimiento_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_procedimiento_tipo_procedimiento_id_seq', 56, true);


--
-- TOC entry 8796 (class 0 OID 0)
-- Dependencies: 368
-- Name: tipo_recurso_fhir_tipo_recurso_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_recurso_fhir_tipo_recurso_id_seq', 6, true);


--
-- TOC entry 8797 (class 0 OID 0)
-- Dependencies: 268
-- Name: tipo_registro_signos_vitales_tipo_registro_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_registro_signos_vitales_tipo_registro_id_seq', 48, true);


--
-- TOC entry 8798 (class 0 OID 0)
-- Dependencies: 346
-- Name: tipo_servicio_basico_tipo_servicio_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_servicio_basico_tipo_servicio_id_seq', 64, true);


--
-- TOC entry 8799 (class 0 OID 0)
-- Dependencies: 250
-- Name: tipo_servicio_medico_tipo_servicio_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_servicio_medico_tipo_servicio_id_seq', 64, true);


--
-- TOC entry 8800 (class 0 OID 0)
-- Dependencies: 366
-- Name: tipo_sugerencia_ia_tipo_sugerencia_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_sugerencia_ia_tipo_sugerencia_id_seq', 5, true);


--
-- TOC entry 8801 (class 0 OID 0)
-- Dependencies: 356
-- Name: tipo_trama_susalud_tipo_trama_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_trama_susalud_tipo_trama_id_seq', 3, true);


--
-- TOC entry 8802 (class 0 OID 0)
-- Dependencies: 290
-- Name: tipo_transicion_tipo_transicion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.tipo_transicion_tipo_transicion_id_seq', 11, true);


--
-- TOC entry 8803 (class 0 OID 0)
-- Dependencies: 542
-- Name: trama_susalud_trama_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.trama_susalud_trama_id_seq', 1, false);


--
-- TOC entry 8804 (class 0 OID 0)
-- Dependencies: 426
-- Name: transicion_atencion_transicion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.transicion_atencion_transicion_id_seq', 1, false);


--
-- TOC entry 8805 (class 0 OID 0)
-- Dependencies: 430
-- Name: triaje_triaje_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.triaje_triaje_id_seq', 1, false);


--
-- TOC entry 8806 (class 0 OID 0)
-- Dependencies: 234
-- Name: ubigeo_ubigeo_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.ubigeo_ubigeo_id_seq', 1, false);


--
-- TOC entry 8807 (class 0 OID 0)
-- Dependencies: 302
-- Name: unidad_medida_farmacia_unidad_medida_farmacia_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.unidad_medida_farmacia_unidad_medida_farmacia_id_seq', 14, true);


--
-- TOC entry 8808 (class 0 OID 0)
-- Dependencies: 306
-- Name: unidad_medida_general_unidad_medida_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.unidad_medida_general_unidad_medida_id_seq', 40, true);


--
-- TOC entry 8809 (class 0 OID 0)
-- Dependencies: 304
-- Name: unidad_medida_laboratorio_unidad_medida_lab_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.unidad_medida_laboratorio_unidad_medida_lab_id_seq', 10, true);


--
-- TOC entry 8810 (class 0 OID 0)
-- Dependencies: 408
-- Name: usuario_usuario_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.usuario_usuario_id_seq', 1, true);


--
-- TOC entry 8811 (class 0 OID 0)
-- Dependencies: 572
-- Name: valor_kpi_valor_kpi_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.valor_kpi_valor_kpi_id_seq', 1, false);


--
-- TOC entry 8812 (class 0 OID 0)
-- Dependencies: 312
-- Name: via_administracion_via_administracion_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.via_administracion_via_administracion_id_seq', 14, true);


--
-- TOC entry 8813 (class 0 OID 0)
-- Dependencies: 286
-- Name: via_ingreso_hospitalario_via_ingreso_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.via_ingreso_hospitalario_via_ingreso_id_seq', 40, true);


--
-- TOC entry 8814 (class 0 OID 0)
-- Dependencies: 566
-- Name: widget_dashboard_widget_id_seq; Type: SEQUENCE SET; Schema: medico; Owner: postgres
--

SELECT pg_catalog.setval('medico.widget_dashboard_widget_id_seq', 1, false);


--
-- TOC entry 7121 (class 2606 OID 18207)
-- Name: agenda agenda_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.agenda
    ADD CONSTRAINT agenda_pkey PRIMARY KEY (agenda_id);


--
-- TOC entry 7063 (class 2606 OID 17794)
-- Name: alergia alergia_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.alergia
    ADD CONSTRAINT alergia_codigo_key UNIQUE (codigo);


--
-- TOC entry 7065 (class 2606 OID 17792)
-- Name: alergia alergia_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.alergia
    ADD CONSTRAINT alergia_pkey PRIMARY KEY (alergia_id);


--
-- TOC entry 7379 (class 2606 OID 21236)
-- Name: alerta_ia alerta_ia_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.alerta_ia
    ADD CONSTRAINT alerta_ia_pkey PRIMARY KEY (alerta_ia_id);


--
-- TOC entry 7205 (class 2606 OID 19258)
-- Name: almacen almacen_organizacion_id_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.almacen
    ADD CONSTRAINT almacen_organizacion_id_codigo_key UNIQUE (organizacion_id, codigo);


--
-- TOC entry 7207 (class 2606 OID 19256)
-- Name: almacen almacen_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.almacen
    ADD CONSTRAINT almacen_pkey PRIMARY KEY (almacen_id);


--
-- TOC entry 7075 (class 2606 OID 17854)
-- Name: antecedente_medico antecedente_medico_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.antecedente_medico
    ADD CONSTRAINT antecedente_medico_codigo_key UNIQUE (codigo);


--
-- TOC entry 7077 (class 2606 OID 17852)
-- Name: antecedente_medico antecedente_medico_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.antecedente_medico
    ADD CONSTRAINT antecedente_medico_pkey PRIMARY KEY (antecedente_id);


--
-- TOC entry 7297 (class 2606 OID 20228)
-- Name: apertura_caja apertura_caja_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.apertura_caja
    ADD CONSTRAINT apertura_caja_pkey PRIMARY KEY (apertura_id);


--
-- TOC entry 6918 (class 2606 OID 17165)
-- Name: area_examen area_examen_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.area_examen
    ADD CONSTRAINT area_examen_codigo_key UNIQUE (codigo);


--
-- TOC entry 6920 (class 2606 OID 17163)
-- Name: area_examen area_examen_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.area_examen
    ADD CONSTRAINT area_examen_pkey PRIMARY KEY (area_examen_id);


--
-- TOC entry 7057 (class 2606 OID 17745)
-- Name: aseguradora aseguradora_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.aseguradora
    ADD CONSTRAINT aseguradora_pkey PRIMARY KEY (aseguradora_id);


--
-- TOC entry 7059 (class 2606 OID 17747)
-- Name: aseguradora aseguradora_ruc_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.aseguradora
    ADD CONSTRAINT aseguradora_ruc_key UNIQUE (ruc);


--
-- TOC entry 7132 (class 2606 OID 18294)
-- Name: atencion atencion_organizacion_id_numero_atencion_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.atencion
    ADD CONSTRAINT atencion_organizacion_id_numero_atencion_key UNIQUE (organizacion_id, numero_atencion);


--
-- TOC entry 7134 (class 2606 OID 18292)
-- Name: atencion atencion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.atencion
    ADD CONSTRAINT atencion_pkey PRIMARY KEY (atencion_id);


--
-- TOC entry 7343 (class 2606 OID 20808)
-- Name: auditoria_hc auditoria_hc_organizacion_id_numero_auditoria_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.auditoria_hc
    ADD CONSTRAINT auditoria_hc_organizacion_id_numero_auditoria_key UNIQUE (organizacion_id, numero_auditoria);


--
-- TOC entry 7345 (class 2606 OID 20806)
-- Name: auditoria_hc auditoria_hc_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.auditoria_hc
    ADD CONSTRAINT auditoria_hc_pkey PRIMARY KEY (auditoria_hc_id);


--
-- TOC entry 7319 (class 2606 OID 20529)
-- Name: balance balance_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.balance
    ADD CONSTRAINT balance_pkey PRIMARY KEY (balance_id);


--
-- TOC entry 7293 (class 2606 OID 20182)
-- Name: caja caja_organizacion_id_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.caja
    ADD CONSTRAINT caja_organizacion_id_codigo_key UNIQUE (organizacion_id, codigo);


--
-- TOC entry 7295 (class 2606 OID 20180)
-- Name: caja caja_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.caja
    ADD CONSTRAINT caja_pkey PRIMARY KEY (caja_id);


--
-- TOC entry 7115 (class 2606 OID 18150)
-- Name: cama cama_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cama
    ADD CONSTRAINT cama_pkey PRIMARY KEY (cama_id);


--
-- TOC entry 7117 (class 2606 OID 18152)
-- Name: cama cama_sede_id_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cama
    ADD CONSTRAINT cama_sede_id_codigo_key UNIQUE (sede_id, codigo);


--
-- TOC entry 6774 (class 2606 OID 16632)
-- Name: cargo cargo_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cargo
    ADD CONSTRAINT cargo_codigo_key UNIQUE (codigo);


--
-- TOC entry 6776 (class 2606 OID 16630)
-- Name: cargo cargo_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cargo
    ADD CONSTRAINT cargo_pkey PRIMARY KEY (cargo_id);


--
-- TOC entry 6990 (class 2606 OID 17422)
-- Name: categoria_balance categoria_balance_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_balance
    ADD CONSTRAINT categoria_balance_codigo_key UNIQUE (codigo);


--
-- TOC entry 6992 (class 2606 OID 17420)
-- Name: categoria_balance categoria_balance_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_balance
    ADD CONSTRAINT categoria_balance_pkey PRIMARY KEY (categoria_balance_id);


--
-- TOC entry 6914 (class 2606 OID 17146)
-- Name: categoria_examen categoria_examen_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_examen
    ADD CONSTRAINT categoria_examen_codigo_key UNIQUE (codigo);


--
-- TOC entry 6916 (class 2606 OID 17144)
-- Name: categoria_examen categoria_examen_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_examen
    ADD CONSTRAINT categoria_examen_pkey PRIMARY KEY (categoria_examen_id);


--
-- TOC entry 6974 (class 2606 OID 17363)
-- Name: categoria_movimiento categoria_movimiento_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_movimiento
    ADD CONSTRAINT categoria_movimiento_codigo_key UNIQUE (codigo);


--
-- TOC entry 6976 (class 2606 OID 17361)
-- Name: categoria_movimiento categoria_movimiento_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_movimiento
    ADD CONSTRAINT categoria_movimiento_pkey PRIMARY KEY (categoria_movimiento_id);


--
-- TOC entry 6882 (class 2606 OID 17022)
-- Name: categoria_producto categoria_producto_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_producto
    ADD CONSTRAINT categoria_producto_codigo_key UNIQUE (codigo);


--
-- TOC entry 6884 (class 2606 OID 17020)
-- Name: categoria_producto categoria_producto_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_producto
    ADD CONSTRAINT categoria_producto_pkey PRIMARY KEY (categoria_id);


--
-- TOC entry 7010 (class 2606 OID 17501)
-- Name: categoria_reporte categoria_reporte_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_reporte
    ADD CONSTRAINT categoria_reporte_codigo_key UNIQUE (codigo);


--
-- TOC entry 7012 (class 2606 OID 17499)
-- Name: categoria_reporte categoria_reporte_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_reporte
    ADD CONSTRAINT categoria_reporte_pkey PRIMARY KEY (categoria_reporte_id);


--
-- TOC entry 7069 (class 2606 OID 17838)
-- Name: cie10 cie10_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cie10
    ADD CONSTRAINT cie10_codigo_key UNIQUE (codigo);


--
-- TOC entry 7172 (class 2606 OID 18773)
-- Name: cie10_personalizado cie10_personalizado_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cie10_personalizado
    ADD CONSTRAINT cie10_personalizado_pkey PRIMARY KEY (cie10_personalizado_id);


--
-- TOC entry 7071 (class 2606 OID 17836)
-- Name: cie10 cie10_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cie10
    ADD CONSTRAINT cie10_pkey PRIMARY KEY (cie10_id);


--
-- TOC entry 7123 (class 2606 OID 18242)
-- Name: cita cita_numero_cita_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cita
    ADD CONSTRAINT cita_numero_cita_key UNIQUE (numero_cita);


--
-- TOC entry 7125 (class 2606 OID 18240)
-- Name: cita cita_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cita
    ADD CONSTRAINT cita_pkey PRIMARY KEY (cita_id);


--
-- TOC entry 7278 (class 2606 OID 20002)
-- Name: comprobante comprobante_organizacion_id_tipo_comprobante_id_serie_numer_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.comprobante
    ADD CONSTRAINT comprobante_organizacion_id_tipo_comprobante_id_serie_numer_key UNIQUE (organizacion_id, tipo_comprobante_id, serie, numero);


--
-- TOC entry 7280 (class 2606 OID 20000)
-- Name: comprobante comprobante_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.comprobante
    ADD CONSTRAINT comprobante_pkey PRIMARY KEY (comprobante_id);


--
-- TOC entry 6962 (class 2606 OID 17320)
-- Name: concepto_facturacion concepto_facturacion_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.concepto_facturacion
    ADD CONSTRAINT concepto_facturacion_codigo_key UNIQUE (codigo);


--
-- TOC entry 6964 (class 2606 OID 17318)
-- Name: concepto_facturacion concepto_facturacion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.concepto_facturacion
    ADD CONSTRAINT concepto_facturacion_pkey PRIMARY KEY (concepto_id);


--
-- TOC entry 6982 (class 2606 OID 17393)
-- Name: concepto_planilla concepto_planilla_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.concepto_planilla
    ADD CONSTRAINT concepto_planilla_codigo_key UNIQUE (codigo);


--
-- TOC entry 7309 (class 2606 OID 20388)
-- Name: concepto_planilla_personal concepto_planilla_personal_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.concepto_planilla_personal
    ADD CONSTRAINT concepto_planilla_personal_pkey PRIMARY KEY (concepto_planilla_personal_id);


--
-- TOC entry 6984 (class 2606 OID 17391)
-- Name: concepto_planilla concepto_planilla_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.concepto_planilla
    ADD CONSTRAINT concepto_planilla_pkey PRIMARY KEY (concepto_planilla_id);


--
-- TOC entry 7423 (class 2606 OID 21625)
-- Name: configuracion_sistema configuracion_sistema_organizacion_id_clave_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.configuracion_sistema
    ADD CONSTRAINT configuracion_sistema_organizacion_id_clave_key UNIQUE (organizacion_id, clave);


--
-- TOC entry 7425 (class 2606 OID 21623)
-- Name: configuracion_sistema configuracion_sistema_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.configuracion_sistema
    ADD CONSTRAINT configuracion_sistema_pkey PRIMARY KEY (configuracion_id);


--
-- TOC entry 7403 (class 2606 OID 21479)
-- Name: consentimiento_informado consentimiento_informado_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.consentimiento_informado
    ADD CONSTRAINT consentimiento_informado_pkey PRIMARY KEY (consentimiento_id);


--
-- TOC entry 7107 (class 2606 OID 18090)
-- Name: consultorio consultorio_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.consultorio
    ADD CONSTRAINT consultorio_pkey PRIMARY KEY (consultorio_id);


--
-- TOC entry 7109 (class 2606 OID 18092)
-- Name: consultorio consultorio_sede_id_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.consultorio
    ADD CONSTRAINT consultorio_sede_id_codigo_key UNIQUE (sede_id, codigo);


--
-- TOC entry 7335 (class 2606 OID 20755)
-- Name: criterio_auditoria criterio_auditoria_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.criterio_auditoria
    ADD CONSTRAINT criterio_auditoria_pkey PRIMARY KEY (criterio_id);


--
-- TOC entry 7337 (class 2606 OID 20757)
-- Name: criterio_auditoria criterio_auditoria_tipo_auditoria_id_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.criterio_auditoria
    ADD CONSTRAINT criterio_auditoria_tipo_auditoria_id_codigo_key UNIQUE (tipo_auditoria_id, codigo);


--
-- TOC entry 7361 (class 2606 OID 21021)
-- Name: dashboard_gerencial dashboard_gerencial_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.dashboard_gerencial
    ADD CONSTRAINT dashboard_gerencial_pkey PRIMARY KEY (dashboard_id);


--
-- TOC entry 7365 (class 2606 OID 21057)
-- Name: dashboard_rol dashboard_rol_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.dashboard_rol
    ADD CONSTRAINT dashboard_rol_pkey PRIMARY KEY (dashboard_rol_id);


--
-- TOC entry 7347 (class 2606 OID 20848)
-- Name: detalle_auditoria detalle_auditoria_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_auditoria
    ADD CONSTRAINT detalle_auditoria_pkey PRIMARY KEY (detalle_auditoria_id);


--
-- TOC entry 7321 (class 2606 OID 20571)
-- Name: detalle_balance detalle_balance_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_balance
    ADD CONSTRAINT detalle_balance_pkey PRIMARY KEY (detalle_balance_id);


--
-- TOC entry 7287 (class 2606 OID 20066)
-- Name: detalle_comprobante detalle_comprobante_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_comprobante
    ADD CONSTRAINT detalle_comprobante_pkey PRIMARY KEY (detalle_comprobante_id);


--
-- TOC entry 7243 (class 2606 OID 19577)
-- Name: detalle_dispensacion detalle_dispensacion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_dispensacion
    ADD CONSTRAINT detalle_dispensacion_pkey PRIMARY KEY (detalle_dispensacion_id);


--
-- TOC entry 7161 (class 2606 OID 18614)
-- Name: detalle_examen_fisico detalle_examen_fisico_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_examen_fisico
    ADD CONSTRAINT detalle_examen_fisico_pkey PRIMARY KEY (detalle_examen_fisico_id);


--
-- TOC entry 7229 (class 2606 OID 19420)
-- Name: detalle_movimiento_almacen detalle_movimiento_almacen_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_movimiento_almacen
    ADD CONSTRAINT detalle_movimiento_almacen_pkey PRIMARY KEY (detalle_movimiento_id);


--
-- TOC entry 7307 (class 2606 OID 20361)
-- Name: detalle_planilla detalle_planilla_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_planilla
    ADD CONSTRAINT detalle_planilla_pkey PRIMARY KEY (detalle_planilla_id);


--
-- TOC entry 7239 (class 2606 OID 19495)
-- Name: detalle_receta detalle_receta_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_receta
    ADD CONSTRAINT detalle_receta_pkey PRIMARY KEY (detalle_receta_id);


--
-- TOC entry 7256 (class 2606 OID 19691)
-- Name: detalle_solicitud_examen detalle_solicitud_examen_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_solicitud_examen
    ADD CONSTRAINT detalle_solicitud_examen_pkey PRIMARY KEY (detalle_solicitud_id);


--
-- TOC entry 7333 (class 2606 OID 20728)
-- Name: detalle_trama_atencion detalle_trama_atencion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_trama_atencion
    ADD CONSTRAINT detalle_trama_atencion_pkey PRIMARY KEY (detalle_trama_id);


--
-- TOC entry 7174 (class 2606 OID 18803)
-- Name: diagnostico_atencion diagnostico_atencion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.diagnostico_atencion
    ADD CONSTRAINT diagnostico_atencion_pkey PRIMARY KEY (diagnostico_atencion_id);


--
-- TOC entry 7241 (class 2606 OID 19540)
-- Name: dispensacion dispensacion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.dispensacion
    ADD CONSTRAINT dispensacion_pkey PRIMARY KEY (dispensacion_id);


--
-- TOC entry 7405 (class 2606 OID 21524)
-- Name: documento_clinico documento_clinico_numero_documento_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.documento_clinico
    ADD CONSTRAINT documento_clinico_numero_documento_key UNIQUE (numero_documento);


--
-- TOC entry 7407 (class 2606 OID 21522)
-- Name: documento_clinico documento_clinico_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.documento_clinico
    ADD CONSTRAINT documento_clinico_pkey PRIMARY KEY (documento_clinico_id);


--
-- TOC entry 7170 (class 2606 OID 18745)
-- Name: ejecucion_indicacion ejecucion_indicacion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.ejecucion_indicacion
    ADD CONSTRAINT ejecucion_indicacion_pkey PRIMARY KEY (ejecucion_id);


--
-- TOC entry 7359 (class 2606 OID 20995)
-- Name: ejecucion_reporte ejecucion_reporte_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.ejecucion_reporte
    ADD CONSTRAINT ejecucion_reporte_pkey PRIMARY KEY (ejecucion_id);


--
-- TOC entry 7381 (class 2606 OID 21283)
-- Name: entrenamiento_modelo entrenamiento_modelo_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.entrenamiento_modelo
    ADD CONSTRAINT entrenamiento_modelo_pkey PRIMARY KEY (entrenamiento_id);


--
-- TOC entry 7142 (class 2606 OID 18370)
-- Name: episodio_clinico episodio_clinico_atencion_id_numero_episodio_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.episodio_clinico
    ADD CONSTRAINT episodio_clinico_atencion_id_numero_episodio_key UNIQUE (atencion_id, numero_episodio);


--
-- TOC entry 7144 (class 2606 OID 18368)
-- Name: episodio_clinico episodio_clinico_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.episodio_clinico
    ADD CONSTRAINT episodio_clinico_pkey PRIMARY KEY (episodio_id);


--
-- TOC entry 6778 (class 2606 OID 16649)
-- Name: especialidad_medica especialidad_medica_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.especialidad_medica
    ADD CONSTRAINT especialidad_medica_codigo_key UNIQUE (codigo);


--
-- TOC entry 6780 (class 2606 OID 16647)
-- Name: especialidad_medica especialidad_medica_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.especialidad_medica
    ADD CONSTRAINT especialidad_medica_pkey PRIMARY KEY (especialidad_id);


--
-- TOC entry 6802 (class 2606 OID 16734)
-- Name: estado_atencion estado_atencion_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_atencion
    ADD CONSTRAINT estado_atencion_codigo_key UNIQUE (codigo);


--
-- TOC entry 6804 (class 2606 OID 16732)
-- Name: estado_atencion estado_atencion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_atencion
    ADD CONSTRAINT estado_atencion_pkey PRIMARY KEY (estado_atencion_id);


--
-- TOC entry 6970 (class 2606 OID 17348)
-- Name: estado_caja estado_caja_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_caja
    ADD CONSTRAINT estado_caja_codigo_key UNIQUE (codigo);


--
-- TOC entry 6972 (class 2606 OID 17346)
-- Name: estado_caja estado_caja_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_caja
    ADD CONSTRAINT estado_caja_pkey PRIMARY KEY (estado_caja_id);


--
-- TOC entry 6794 (class 2606 OID 16706)
-- Name: estado_cama estado_cama_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_cama
    ADD CONSTRAINT estado_cama_codigo_key UNIQUE (codigo);


--
-- TOC entry 6796 (class 2606 OID 16704)
-- Name: estado_cama estado_cama_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_cama
    ADD CONSTRAINT estado_cama_pkey PRIMARY KEY (estado_cama_id);


--
-- TOC entry 6818 (class 2606 OID 16791)
-- Name: estado_cita estado_cita_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_cita
    ADD CONSTRAINT estado_cita_codigo_key UNIQUE (codigo);


--
-- TOC entry 6820 (class 2606 OID 16789)
-- Name: estado_cita estado_cita_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_cita
    ADD CONSTRAINT estado_cita_pkey PRIMARY KEY (estado_cita_id);


--
-- TOC entry 6738 (class 2606 OID 16499)
-- Name: estado_civil estado_civil_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_civil
    ADD CONSTRAINT estado_civil_codigo_key UNIQUE (codigo);


--
-- TOC entry 6740 (class 2606 OID 16497)
-- Name: estado_civil estado_civil_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_civil
    ADD CONSTRAINT estado_civil_pkey PRIMARY KEY (estado_civil_id);


--
-- TOC entry 6810 (class 2606 OID 16762)
-- Name: estado_episodio estado_episodio_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_episodio
    ADD CONSTRAINT estado_episodio_codigo_key UNIQUE (codigo);


--
-- TOC entry 6812 (class 2606 OID 16760)
-- Name: estado_episodio estado_episodio_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_episodio
    ADD CONSTRAINT estado_episodio_pkey PRIMARY KEY (estado_episodio_id);


--
-- TOC entry 6874 (class 2606 OID 16993)
-- Name: estado_interconsulta estado_interconsulta_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_interconsulta
    ADD CONSTRAINT estado_interconsulta_codigo_key UNIQUE (codigo);


--
-- TOC entry 6876 (class 2606 OID 16991)
-- Name: estado_interconsulta estado_interconsulta_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_interconsulta
    ADD CONSTRAINT estado_interconsulta_pkey PRIMARY KEY (estado_interconsulta_id);


--
-- TOC entry 6906 (class 2606 OID 17118)
-- Name: estado_receta estado_receta_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_receta
    ADD CONSTRAINT estado_receta_codigo_key UNIQUE (codigo);


--
-- TOC entry 6908 (class 2606 OID 17116)
-- Name: estado_receta estado_receta_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_receta
    ADD CONSTRAINT estado_receta_pkey PRIMARY KEY (estado_receta_id);


--
-- TOC entry 6942 (class 2606 OID 17250)
-- Name: estado_resultado_laboratorio estado_resultado_laboratorio_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_resultado_laboratorio
    ADD CONSTRAINT estado_resultado_laboratorio_codigo_key UNIQUE (codigo);


--
-- TOC entry 6944 (class 2606 OID 17248)
-- Name: estado_resultado_laboratorio estado_resultado_laboratorio_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_resultado_laboratorio
    ADD CONSTRAINT estado_resultado_laboratorio_pkey PRIMARY KEY (estado_resultado_id);


--
-- TOC entry 6926 (class 2606 OID 17193)
-- Name: estado_solicitud_examen estado_solicitud_examen_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_solicitud_examen
    ADD CONSTRAINT estado_solicitud_examen_codigo_key UNIQUE (codigo);


--
-- TOC entry 6928 (class 2606 OID 17191)
-- Name: estado_solicitud_examen estado_solicitud_examen_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.estado_solicitud_examen
    ADD CONSTRAINT estado_solicitud_examen_pkey PRIMARY KEY (estado_solicitud_id);


--
-- TOC entry 7163 (class 2606 OID 18640)
-- Name: evolucion_clinica evolucion_clinica_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.evolucion_clinica
    ADD CONSTRAINT evolucion_clinica_pkey PRIMARY KEY (evolucion_id);


--
-- TOC entry 7159 (class 2606 OID 18579)
-- Name: examen_fisico examen_fisico_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_fisico
    ADD CONSTRAINT examen_fisico_pkey PRIMARY KEY (examen_fisico_id);


--
-- TOC entry 7272 (class 2606 OID 19898)
-- Name: examen_imagen examen_imagen_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_imagen
    ADD CONSTRAINT examen_imagen_pkey PRIMARY KEY (examen_imagen_id);


--
-- TOC entry 7262 (class 2606 OID 19762)
-- Name: examen_laboratorio examen_laboratorio_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_laboratorio
    ADD CONSTRAINT examen_laboratorio_pkey PRIMARY KEY (examen_lab_id);


--
-- TOC entry 6746 (class 2606 OID 16527)
-- Name: factor_rh factor_rh_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.factor_rh
    ADD CONSTRAINT factor_rh_codigo_key UNIQUE (codigo);


--
-- TOC entry 6748 (class 2606 OID 16525)
-- Name: factor_rh factor_rh_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.factor_rh
    ADD CONSTRAINT factor_rh_pkey PRIMARY KEY (factor_rh_id);


--
-- TOC entry 6854 (class 2606 OID 16921)
-- Name: forma_llegada forma_llegada_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.forma_llegada
    ADD CONSTRAINT forma_llegada_codigo_key UNIQUE (codigo);


--
-- TOC entry 6856 (class 2606 OID 16919)
-- Name: forma_llegada forma_llegada_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.forma_llegada
    ADD CONSTRAINT forma_llegada_pkey PRIMARY KEY (forma_llegada_id);


--
-- TOC entry 6958 (class 2606 OID 17306)
-- Name: forma_pago forma_pago_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.forma_pago
    ADD CONSTRAINT forma_pago_codigo_key UNIQUE (codigo);


--
-- TOC entry 6960 (class 2606 OID 17304)
-- Name: forma_pago forma_pago_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.forma_pago
    ADD CONSTRAINT forma_pago_pkey PRIMARY KEY (forma_pago_id);


--
-- TOC entry 6742 (class 2606 OID 16513)
-- Name: grupo_sanguineo grupo_sanguineo_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.grupo_sanguineo
    ADD CONSTRAINT grupo_sanguineo_codigo_key UNIQUE (codigo);


--
-- TOC entry 6744 (class 2606 OID 16511)
-- Name: grupo_sanguineo grupo_sanguineo_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.grupo_sanguineo
    ADD CONSTRAINT grupo_sanguineo_pkey PRIMARY KEY (grupo_sanguineo_id);


--
-- TOC entry 7184 (class 2606 OID 18953)
-- Name: historia_clinica_ambulatoria historia_clinica_ambulatoria_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_ambulatoria
    ADD CONSTRAINT historia_clinica_ambulatoria_pkey PRIMARY KEY (historia_ambulatoria_id);


--
-- TOC entry 7186 (class 2606 OID 18989)
-- Name: historia_clinica_emergencia historia_clinica_emergencia_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_emergencia
    ADD CONSTRAINT historia_clinica_emergencia_pkey PRIMARY KEY (historia_emergencia_id);


--
-- TOC entry 7197 (class 2606 OID 19132)
-- Name: historia_clinica_hospitalizacion historia_clinica_hospitalizacion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_hospitalizacion
    ADD CONSTRAINT historia_clinica_hospitalizacion_pkey PRIMARY KEY (historia_hospitalizacion_id);


--
-- TOC entry 7188 (class 2606 OID 19054)
-- Name: hospitalizacion hospitalizacion_numero_hospitalizacion_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.hospitalizacion
    ADD CONSTRAINT hospitalizacion_numero_hospitalizacion_key UNIQUE (numero_hospitalizacion);


--
-- TOC entry 7190 (class 2606 OID 19052)
-- Name: hospitalizacion hospitalizacion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.hospitalizacion
    ADD CONSTRAINT hospitalizacion_pkey PRIMARY KEY (hospitalizacion_id);


--
-- TOC entry 7274 (class 2606 OID 19929)
-- Name: imagen_digital imagen_digital_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.imagen_digital
    ADD CONSTRAINT imagen_digital_pkey PRIMARY KEY (imagen_id);


--
-- TOC entry 7168 (class 2606 OID 18693)
-- Name: indicacion_medica indicacion_medica_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicacion_medica
    ADD CONSTRAINT indicacion_medica_pkey PRIMARY KEY (indicacion_id);


--
-- TOC entry 7323 (class 2606 OID 20605)
-- Name: indicador_financiero indicador_financiero_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicador_financiero
    ADD CONSTRAINT indicador_financiero_pkey PRIMARY KEY (indicador_id);


--
-- TOC entry 7367 (class 2606 OID 21086)
-- Name: indicador_kpi indicador_kpi_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicador_kpi
    ADD CONSTRAINT indicador_kpi_codigo_key UNIQUE (codigo);


--
-- TOC entry 7369 (class 2606 OID 21084)
-- Name: indicador_kpi indicador_kpi_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicador_kpi
    ADD CONSTRAINT indicador_kpi_pkey PRIMARY KEY (kpi_id);


--
-- TOC entry 7276 (class 2606 OID 19956)
-- Name: informe_imagen informe_imagen_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.informe_imagen
    ADD CONSTRAINT informe_imagen_pkey PRIMARY KEY (informe_imagen_id);


--
-- TOC entry 7291 (class 2606 OID 20157)
-- Name: integracion_nubefact integracion_nubefact_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.integracion_nubefact
    ADD CONSTRAINT integracion_nubefact_pkey PRIMARY KEY (integracion_id);


--
-- TOC entry 7180 (class 2606 OID 18908)
-- Name: interconsulta interconsulta_numero_interconsulta_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.interconsulta
    ADD CONSTRAINT interconsulta_numero_interconsulta_key UNIQUE (numero_interconsulta);


--
-- TOC entry 7182 (class 2606 OID 18906)
-- Name: interconsulta interconsulta_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.interconsulta
    ADD CONSTRAINT interconsulta_pkey PRIMARY KEY (interconsulta_id);


--
-- TOC entry 7421 (class 2606 OID 21594)
-- Name: log_acceso_hc log_acceso_hc_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.log_acceso_hc
    ADD CONSTRAINT log_acceso_hc_pkey PRIMARY KEY (log_acceso_hc_id);


--
-- TOC entry 7416 (class 2606 OID 21573)
-- Name: log_acceso_sistema log_acceso_sistema_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.log_acceso_sistema
    ADD CONSTRAINT log_acceso_sistema_pkey PRIMARY KEY (log_acceso_id);


--
-- TOC entry 7412 (class 2606 OID 21554)
-- Name: log_auditoria_sistema log_auditoria_sistema_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.log_auditoria_sistema
    ADD CONSTRAINT log_auditoria_sistema_pkey PRIMARY KEY (log_auditoria_id);


--
-- TOC entry 7383 (class 2606 OID 21312)
-- Name: log_ia log_ia_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.log_ia
    ADD CONSTRAINT log_ia_pkey PRIMARY KEY (log_ia_id);


--
-- TOC entry 7219 (class 2606 OID 19335)
-- Name: lote_producto lote_producto_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.lote_producto
    ADD CONSTRAINT lote_producto_pkey PRIMARY KEY (lote_id);


--
-- TOC entry 7221 (class 2606 OID 19337)
-- Name: lote_producto lote_producto_producto_id_almacen_id_numero_lote_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.lote_producto
    ADD CONSTRAINT lote_producto_producto_id_almacen_id_numero_lote_key UNIQUE (producto_id, almacen_id, numero_lote);


--
-- TOC entry 7399 (class 2606 OID 21454)
-- Name: mapeo_codigo mapeo_codigo_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.mapeo_codigo
    ADD CONSTRAINT mapeo_codigo_pkey PRIMARY KEY (mapeo_codigo_id);


--
-- TOC entry 7401 (class 2606 OID 21456)
-- Name: mapeo_codigo mapeo_codigo_sistema_origen_codigo_origen_sistema_destino_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.mapeo_codigo
    ADD CONSTRAINT mapeo_codigo_sistema_origen_codigo_origen_sistema_destino_key UNIQUE (sistema_origen, codigo_origen, sistema_destino);


--
-- TOC entry 7195 (class 2606 OID 19101)
-- Name: medico_hospitalizacion medico_hospitalizacion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.medico_hospitalizacion
    ADD CONSTRAINT medico_hospitalizacion_pkey PRIMARY KEY (medico_hospitalizacion_id);


--
-- TOC entry 7395 (class 2606 OID 21424)
-- Name: mensaje_hl7 mensaje_hl7_control_id_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.mensaje_hl7
    ADD CONSTRAINT mensaje_hl7_control_id_key UNIQUE (control_id);


--
-- TOC entry 7397 (class 2606 OID 21422)
-- Name: mensaje_hl7 mensaje_hl7_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.mensaje_hl7
    ADD CONSTRAINT mensaje_hl7_pkey PRIMARY KEY (mensaje_hl7_id);


--
-- TOC entry 6938 (class 2606 OID 17236)
-- Name: metodo_examen metodo_examen_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.metodo_examen
    ADD CONSTRAINT metodo_examen_codigo_key UNIQUE (codigo);


--
-- TOC entry 6940 (class 2606 OID 17234)
-- Name: metodo_examen metodo_examen_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.metodo_examen
    ADD CONSTRAINT metodo_examen_pkey PRIMARY KEY (metodo_id);


--
-- TOC entry 7373 (class 2606 OID 21141)
-- Name: modelo_ia modelo_ia_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.modelo_ia
    ADD CONSTRAINT modelo_ia_codigo_key UNIQUE (codigo);


--
-- TOC entry 7375 (class 2606 OID 21139)
-- Name: modelo_ia modelo_ia_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.modelo_ia
    ADD CONSTRAINT modelo_ia_pkey PRIMARY KEY (modelo_id);


--
-- TOC entry 6954 (class 2606 OID 17292)
-- Name: moneda moneda_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.moneda
    ADD CONSTRAINT moneda_codigo_key UNIQUE (codigo);


--
-- TOC entry 6956 (class 2606 OID 17290)
-- Name: moneda moneda_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.moneda
    ADD CONSTRAINT moneda_pkey PRIMARY KEY (moneda_id);


--
-- TOC entry 7119 (class 2606 OID 18181)
-- Name: motivo_consulta_predefinido motivo_consulta_predefinido_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.motivo_consulta_predefinido
    ADD CONSTRAINT motivo_consulta_predefinido_pkey PRIMARY KEY (motivo_consulta_id);


--
-- TOC entry 7225 (class 2606 OID 19374)
-- Name: movimiento_almacen movimiento_almacen_organizacion_id_numero_documento_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_almacen
    ADD CONSTRAINT movimiento_almacen_organizacion_id_numero_documento_key UNIQUE (organizacion_id, numero_documento);


--
-- TOC entry 7227 (class 2606 OID 19372)
-- Name: movimiento_almacen movimiento_almacen_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_almacen
    ADD CONSTRAINT movimiento_almacen_pkey PRIMARY KEY (movimiento_id);


--
-- TOC entry 7301 (class 2606 OID 20269)
-- Name: movimiento_caja movimiento_caja_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_caja
    ADD CONSTRAINT movimiento_caja_pkey PRIMARY KEY (movimiento_caja_id);


--
-- TOC entry 7199 (class 2606 OID 19190)
-- Name: movimiento_cama movimiento_cama_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_cama
    ADD CONSTRAINT movimiento_cama_pkey PRIMARY KEY (movimiento_cama_id);


--
-- TOC entry 7258 (class 2606 OID 19732)
-- Name: muestra_laboratorio muestra_laboratorio_codigo_muestra_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.muestra_laboratorio
    ADD CONSTRAINT muestra_laboratorio_codigo_muestra_key UNIQUE (codigo_muestra);


--
-- TOC entry 7260 (class 2606 OID 19730)
-- Name: muestra_laboratorio muestra_laboratorio_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.muestra_laboratorio
    ADD CONSTRAINT muestra_laboratorio_pkey PRIMARY KEY (muestra_id);


--
-- TOC entry 7006 (class 2606 OID 17487)
-- Name: opcion_cumplimiento opcion_cumplimiento_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.opcion_cumplimiento
    ADD CONSTRAINT opcion_cumplimiento_codigo_key UNIQUE (codigo);


--
-- TOC entry 7008 (class 2606 OID 17485)
-- Name: opcion_cumplimiento opcion_cumplimiento_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.opcion_cumplimiento
    ADD CONSTRAINT opcion_cumplimiento_pkey PRIMARY KEY (opcion_cumplimiento_id);


--
-- TOC entry 6846 (class 2606 OID 16892)
-- Name: orden_diagnostico orden_diagnostico_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.orden_diagnostico
    ADD CONSTRAINT orden_diagnostico_codigo_key UNIQUE (codigo);


--
-- TOC entry 6848 (class 2606 OID 16890)
-- Name: orden_diagnostico orden_diagnostico_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.orden_diagnostico
    ADD CONSTRAINT orden_diagnostico_pkey PRIMARY KEY (orden_diagnostico_id);


--
-- TOC entry 7035 (class 2606 OID 17597)
-- Name: organizacion organizacion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.organizacion
    ADD CONSTRAINT organizacion_pkey PRIMARY KEY (organizacion_id);


--
-- TOC entry 7037 (class 2606 OID 17599)
-- Name: organizacion organizacion_ruc_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.organizacion
    ADD CONSTRAINT organizacion_ruc_key UNIQUE (ruc);


--
-- TOC entry 7067 (class 2606 OID 17811)
-- Name: paciente_alergia paciente_alergia_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_alergia
    ADD CONSTRAINT paciente_alergia_pkey PRIMARY KEY (paciente_alergia_id);


--
-- TOC entry 7081 (class 2606 OID 17908)
-- Name: paciente_antecedente_familiar paciente_antecedente_familiar_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_antecedente_familiar
    ADD CONSTRAINT paciente_antecedente_familiar_pkey PRIMARY KEY (paciente_antecedente_familiar_id);


--
-- TOC entry 7079 (class 2606 OID 17876)
-- Name: paciente_antecedente_personal paciente_antecedente_personal_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_antecedente_personal
    ADD CONSTRAINT paciente_antecedente_personal_pkey PRIMARY KEY (paciente_antecedente_personal_id);


--
-- TOC entry 7061 (class 2606 OID 17768)
-- Name: paciente_aseguradora paciente_aseguradora_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_aseguradora
    ADD CONSTRAINT paciente_aseguradora_pkey PRIMARY KEY (paciente_aseguradora_id);


--
-- TOC entry 7053 (class 2606 OID 17713)
-- Name: paciente paciente_organizacion_id_numero_historia_clinica_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente
    ADD CONSTRAINT paciente_organizacion_id_numero_historia_clinica_key UNIQUE (organizacion_id, numero_historia_clinica);


--
-- TOC entry 7055 (class 2606 OID 17711)
-- Name: paciente paciente_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente
    ADD CONSTRAINT paciente_pkey PRIMARY KEY (paciente_id);


--
-- TOC entry 7289 (class 2606 OID 20129)
-- Name: pago_comprobante pago_comprobante_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.pago_comprobante
    ADD CONSTRAINT pago_comprobante_pkey PRIMARY KEY (pago_comprobante_id);


--
-- TOC entry 7311 (class 2606 OID 20415)
-- Name: pago_planilla pago_planilla_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.pago_planilla
    ADD CONSTRAINT pago_planilla_pkey PRIMARY KEY (pago_planilla_id);


--
-- TOC entry 7313 (class 2606 OID 20449)
-- Name: pago_servicio pago_servicio_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.pago_servicio
    ADD CONSTRAINT pago_servicio_pkey PRIMARY KEY (pago_servicio_id);


--
-- TOC entry 7264 (class 2606 OID 19809)
-- Name: parametro_laboratorio parametro_laboratorio_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.parametro_laboratorio
    ADD CONSTRAINT parametro_laboratorio_pkey PRIMARY KEY (parametro_id);


--
-- TOC entry 7266 (class 2606 OID 19811)
-- Name: parametro_laboratorio parametro_laboratorio_tipo_examen_id_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.parametro_laboratorio
    ADD CONSTRAINT parametro_laboratorio_tipo_examen_id_codigo_key UNIQUE (tipo_examen_id, codigo);


--
-- TOC entry 6750 (class 2606 OID 16541)
-- Name: parentesco parentesco_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.parentesco
    ADD CONSTRAINT parentesco_codigo_key UNIQUE (codigo);


--
-- TOC entry 6752 (class 2606 OID 16539)
-- Name: parentesco parentesco_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.parentesco
    ADD CONSTRAINT parentesco_pkey PRIMARY KEY (parentesco_id);


--
-- TOC entry 7315 (class 2606 OID 20489)
-- Name: periodo_contable periodo_contable_organizacion_id_año_mes_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.periodo_contable
    ADD CONSTRAINT "periodo_contable_organizacion_id_año_mes_key" UNIQUE (organizacion_id, "año", mes);


--
-- TOC entry 7317 (class 2606 OID 20487)
-- Name: periodo_contable periodo_contable_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.periodo_contable
    ADD CONSTRAINT periodo_contable_pkey PRIMARY KEY (periodo_id);


--
-- TOC entry 7303 (class 2606 OID 20334)
-- Name: periodo_planilla periodo_planilla_organizacion_id_año_mes_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.periodo_planilla
    ADD CONSTRAINT "periodo_planilla_organizacion_id_año_mes_key" UNIQUE (organizacion_id, "año", mes);


--
-- TOC entry 7305 (class 2606 OID 20332)
-- Name: periodo_planilla periodo_planilla_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.periodo_planilla
    ADD CONSTRAINT periodo_planilla_pkey PRIMARY KEY (periodo_planilla_id);


--
-- TOC entry 7327 (class 2606 OID 20663)
-- Name: periodo_reporte_susalud periodo_reporte_susalud_organizacion_id_año_mes_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.periodo_reporte_susalud
    ADD CONSTRAINT "periodo_reporte_susalud_organizacion_id_año_mes_key" UNIQUE (organizacion_id, "año", mes);


--
-- TOC entry 7329 (class 2606 OID 20661)
-- Name: periodo_reporte_susalud periodo_reporte_susalud_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.periodo_reporte_susalud
    ADD CONSTRAINT periodo_reporte_susalud_pkey PRIMARY KEY (periodo_reporte_id);


--
-- TOC entry 7097 (class 2606 OID 18024)
-- Name: permiso permiso_modulo_accion_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.permiso
    ADD CONSTRAINT permiso_modulo_accion_key UNIQUE (modulo, accion);


--
-- TOC entry 7099 (class 2606 OID 18022)
-- Name: permiso permiso_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.permiso
    ADD CONSTRAINT permiso_pkey PRIMARY KEY (permiso_id);


--
-- TOC entry 7045 (class 2606 OID 17659)
-- Name: persona persona_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.persona
    ADD CONSTRAINT persona_pkey PRIMARY KEY (persona_id);


--
-- TOC entry 7047 (class 2606 OID 17661)
-- Name: persona persona_tipo_documento_id_numero_documento_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.persona
    ADD CONSTRAINT persona_tipo_documento_id_numero_documento_key UNIQUE (tipo_documento_id, numero_documento);


--
-- TOC entry 7091 (class 2606 OID 17982)
-- Name: personal_especialidad personal_especialidad_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.personal_especialidad
    ADD CONSTRAINT personal_especialidad_pkey PRIMARY KEY (personal_especialidad_id);


--
-- TOC entry 7087 (class 2606 OID 17947)
-- Name: personal personal_organizacion_id_codigo_empleado_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.personal
    ADD CONSTRAINT personal_organizacion_id_codigo_empleado_key UNIQUE (organizacion_id, codigo_empleado);


--
-- TOC entry 7089 (class 2606 OID 17945)
-- Name: personal personal_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.personal
    ADD CONSTRAINT personal_pkey PRIMARY KEY (personal_id);


--
-- TOC entry 7178 (class 2606 OID 18878)
-- Name: personal_procedimiento personal_procedimiento_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.personal_procedimiento
    ADD CONSTRAINT personal_procedimiento_pkey PRIMARY KEY (personal_procedimiento_id);


--
-- TOC entry 7349 (class 2606 OID 20886)
-- Name: plan_mejora_auditoria plan_mejora_auditoria_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.plan_mejora_auditoria
    ADD CONSTRAINT plan_mejora_auditoria_pkey PRIMARY KEY (plan_mejora_id);


--
-- TOC entry 7325 (class 2606 OID 20628)
-- Name: presupuesto presupuesto_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.presupuesto
    ADD CONSTRAINT presupuesto_pkey PRIMARY KEY (presupuesto_id);


--
-- TOC entry 6922 (class 2606 OID 17179)
-- Name: prioridad_solicitud prioridad_solicitud_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.prioridad_solicitud
    ADD CONSTRAINT prioridad_solicitud_codigo_key UNIQUE (codigo);


--
-- TOC entry 6924 (class 2606 OID 17177)
-- Name: prioridad_solicitud prioridad_solicitud_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.prioridad_solicitud
    ADD CONSTRAINT prioridad_solicitud_pkey PRIMARY KEY (prioridad_solicitud_id);


--
-- TOC entry 6850 (class 2606 OID 16907)
-- Name: prioridad_triaje prioridad_triaje_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.prioridad_triaje
    ADD CONSTRAINT prioridad_triaje_codigo_key UNIQUE (codigo);


--
-- TOC entry 6852 (class 2606 OID 16905)
-- Name: prioridad_triaje prioridad_triaje_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.prioridad_triaje
    ADD CONSTRAINT prioridad_triaje_pkey PRIMARY KEY (prioridad_triaje_id);


--
-- TOC entry 7176 (class 2606 OID 18848)
-- Name: procedimiento_realizado procedimiento_realizado_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.procedimiento_realizado
    ADD CONSTRAINT procedimiento_realizado_pkey PRIMARY KEY (procedimiento_id);


--
-- TOC entry 7212 (class 2606 OID 19300)
-- Name: producto producto_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.producto
    ADD CONSTRAINT producto_codigo_key UNIQUE (codigo);


--
-- TOC entry 7214 (class 2606 OID 19298)
-- Name: producto producto_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.producto
    ADD CONSTRAINT producto_pkey PRIMARY KEY (producto_id);


--
-- TOC entry 7201 (class 2606 OID 19227)
-- Name: proveedor proveedor_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.proveedor
    ADD CONSTRAINT proveedor_pkey PRIMARY KEY (proveedor_id);


--
-- TOC entry 7203 (class 2606 OID 19229)
-- Name: proveedor proveedor_tipo_documento_id_numero_documento_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.proveedor
    ADD CONSTRAINT proveedor_tipo_documento_id_numero_documento_key UNIQUE (tipo_documento_id, numero_documento);


--
-- TOC entry 7235 (class 2606 OID 19452)
-- Name: receta receta_numero_receta_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.receta
    ADD CONSTRAINT receta_numero_receta_key UNIQUE (numero_receta);


--
-- TOC entry 7237 (class 2606 OID 19450)
-- Name: receta receta_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.receta
    ADD CONSTRAINT receta_pkey PRIMARY KEY (receta_id);


--
-- TOC entry 7389 (class 2606 OID 21363)
-- Name: recurso_fhir recurso_fhir_identificador_fhir_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.recurso_fhir
    ADD CONSTRAINT recurso_fhir_identificador_fhir_key UNIQUE (identificador_fhir);


--
-- TOC entry 7391 (class 2606 OID 21361)
-- Name: recurso_fhir recurso_fhir_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.recurso_fhir
    ADD CONSTRAINT recurso_fhir_pkey PRIMARY KEY (recurso_fhir_id);


--
-- TOC entry 7155 (class 2606 OID 18506)
-- Name: registro_signos_vitales registro_signos_vitales_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.registro_signos_vitales
    ADD CONSTRAINT registro_signos_vitales_pkey PRIMARY KEY (registro_signos_id);


--
-- TOC entry 7351 (class 2606 OID 20921)
-- Name: reporte_configuracion reporte_configuracion_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.reporte_configuracion
    ADD CONSTRAINT reporte_configuracion_codigo_key UNIQUE (codigo);


--
-- TOC entry 7353 (class 2606 OID 20919)
-- Name: reporte_configuracion reporte_configuracion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.reporte_configuracion
    ADD CONSTRAINT reporte_configuracion_pkey PRIMARY KEY (reporte_id);


--
-- TOC entry 7355 (class 2606 OID 20944)
-- Name: reporte_parametro reporte_parametro_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.reporte_parametro
    ADD CONSTRAINT reporte_parametro_pkey PRIMARY KEY (reporte_parametro_id);


--
-- TOC entry 7357 (class 2606 OID 20966)
-- Name: reporte_rol reporte_rol_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.reporte_rol
    ADD CONSTRAINT reporte_rol_pkey PRIMARY KEY (reporte_rol_id);


--
-- TOC entry 7270 (class 2606 OID 19866)
-- Name: resultado_laboratorio resultado_laboratorio_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.resultado_laboratorio
    ADD CONSTRAINT resultado_laboratorio_pkey PRIMARY KEY (resultado_lab_id);


--
-- TOC entry 7268 (class 2606 OID 19839)
-- Name: resultado_parametro resultado_parametro_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.resultado_parametro
    ADD CONSTRAINT resultado_parametro_pkey PRIMARY KEY (resultado_parametro_id);


--
-- TOC entry 7093 (class 2606 OID 18008)
-- Name: rol rol_nombre_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.rol
    ADD CONSTRAINT rol_nombre_key UNIQUE (nombre);


--
-- TOC entry 7101 (class 2606 OID 18036)
-- Name: rol_permiso rol_permiso_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.rol_permiso
    ADD CONSTRAINT rol_permiso_pkey PRIMARY KEY (rol_permiso_id);


--
-- TOC entry 7095 (class 2606 OID 18006)
-- Name: rol rol_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.rol
    ADD CONSTRAINT rol_pkey PRIMARY KEY (rol_id);


--
-- TOC entry 7039 (class 2606 OID 17630)
-- Name: sede sede_organizacion_id_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sede
    ADD CONSTRAINT sede_organizacion_id_codigo_key UNIQUE (organizacion_id, codigo);


--
-- TOC entry 7041 (class 2606 OID 17628)
-- Name: sede sede_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sede
    ADD CONSTRAINT sede_pkey PRIMARY KEY (sede_id);


--
-- TOC entry 7111 (class 2606 OID 18121)
-- Name: servicio_medico servicio_medico_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.servicio_medico
    ADD CONSTRAINT servicio_medico_codigo_key UNIQUE (codigo);


--
-- TOC entry 7113 (class 2606 OID 18119)
-- Name: servicio_medico servicio_medico_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.servicio_medico
    ADD CONSTRAINT servicio_medico_pkey PRIMARY KEY (servicio_id);


--
-- TOC entry 6734 (class 2606 OID 16485)
-- Name: sexo sexo_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sexo
    ADD CONSTRAINT sexo_codigo_key UNIQUE (codigo);


--
-- TOC entry 6736 (class 2606 OID 16483)
-- Name: sexo sexo_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sexo
    ADD CONSTRAINT sexo_pkey PRIMARY KEY (sexo_id);


--
-- TOC entry 7393 (class 2606 OID 21390)
-- Name: sincronizacion_fhir sincronizacion_fhir_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sincronizacion_fhir
    ADD CONSTRAINT sincronizacion_fhir_pkey PRIMARY KEY (sincronizacion_id);


--
-- TOC entry 6830 (class 2606 OID 16835)
-- Name: sistema_corporal sistema_corporal_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sistema_corporal
    ADD CONSTRAINT sistema_corporal_codigo_key UNIQUE (codigo);


--
-- TOC entry 6832 (class 2606 OID 16833)
-- Name: sistema_corporal sistema_corporal_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sistema_corporal
    ADD CONSTRAINT sistema_corporal_pkey PRIMARY KEY (sistema_corporal_id);


--
-- TOC entry 7385 (class 2606 OID 21343)
-- Name: sistema_externo sistema_externo_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sistema_externo
    ADD CONSTRAINT sistema_externo_codigo_key UNIQUE (codigo);


--
-- TOC entry 7387 (class 2606 OID 21341)
-- Name: sistema_externo sistema_externo_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sistema_externo
    ADD CONSTRAINT sistema_externo_pkey PRIMARY KEY (sistema_externo_id);


--
-- TOC entry 7252 (class 2606 OID 19645)
-- Name: solicitud_examen solicitud_examen_organizacion_id_numero_solicitud_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.solicitud_examen
    ADD CONSTRAINT solicitud_examen_organizacion_id_numero_solicitud_key UNIQUE (organizacion_id, numero_solicitud);


--
-- TOC entry 7254 (class 2606 OID 19643)
-- Name: solicitud_examen solicitud_examen_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.solicitud_examen
    ADD CONSTRAINT solicitud_examen_pkey PRIMARY KEY (solicitud_id);


--
-- TOC entry 6994 (class 2606 OID 17441)
-- Name: subcategoria_balance subcategoria_balance_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.subcategoria_balance
    ADD CONSTRAINT subcategoria_balance_codigo_key UNIQUE (codigo);


--
-- TOC entry 6996 (class 2606 OID 17439)
-- Name: subcategoria_balance subcategoria_balance_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.subcategoria_balance
    ADD CONSTRAINT subcategoria_balance_pkey PRIMARY KEY (subcategoria_balance_id);


--
-- TOC entry 7339 (class 2606 OID 20781)
-- Name: subcriterio_auditoria subcriterio_auditoria_criterio_id_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.subcriterio_auditoria
    ADD CONSTRAINT subcriterio_auditoria_criterio_id_codigo_key UNIQUE (criterio_id, codigo);


--
-- TOC entry 7341 (class 2606 OID 20779)
-- Name: subcriterio_auditoria subcriterio_auditoria_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.subcriterio_auditoria
    ADD CONSTRAINT subcriterio_auditoria_pkey PRIMARY KEY (subcriterio_id);


--
-- TOC entry 7377 (class 2606 OID 21170)
-- Name: sugerencia_ia sugerencia_ia_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sugerencia_ia
    ADD CONSTRAINT sugerencia_ia_pkey PRIMARY KEY (sugerencia_ia_id);


--
-- TOC entry 6878 (class 2606 OID 17007)
-- Name: tipo_almacen tipo_almacen_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_almacen
    ADD CONSTRAINT tipo_almacen_codigo_key UNIQUE (codigo);


--
-- TOC entry 6880 (class 2606 OID 17005)
-- Name: tipo_almacen tipo_almacen_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_almacen
    ADD CONSTRAINT tipo_almacen_pkey PRIMARY KEY (tipo_almacen_id);


--
-- TOC entry 6862 (class 2606 OID 16949)
-- Name: tipo_alta tipo_alta_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_alta
    ADD CONSTRAINT tipo_alta_codigo_key UNIQUE (codigo);


--
-- TOC entry 6864 (class 2606 OID 16947)
-- Name: tipo_alta tipo_alta_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_alta
    ADD CONSTRAINT tipo_alta_pkey PRIMARY KEY (tipo_alta_id);


--
-- TOC entry 6766 (class 2606 OID 16601)
-- Name: tipo_aseguradora tipo_aseguradora_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_aseguradora
    ADD CONSTRAINT tipo_aseguradora_codigo_key UNIQUE (codigo);


--
-- TOC entry 6768 (class 2606 OID 16599)
-- Name: tipo_aseguradora tipo_aseguradora_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_aseguradora
    ADD CONSTRAINT tipo_aseguradora_pkey PRIMARY KEY (tipo_aseguradora_id);


--
-- TOC entry 6798 (class 2606 OID 16720)
-- Name: tipo_atencion tipo_atencion_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_atencion
    ADD CONSTRAINT tipo_atencion_codigo_key UNIQUE (codigo);


--
-- TOC entry 6800 (class 2606 OID 16718)
-- Name: tipo_atencion tipo_atencion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_atencion
    ADD CONSTRAINT tipo_atencion_pkey PRIMARY KEY (tipo_atencion_id);


--
-- TOC entry 7002 (class 2606 OID 17473)
-- Name: tipo_auditoria tipo_auditoria_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_auditoria
    ADD CONSTRAINT tipo_auditoria_codigo_key UNIQUE (codigo);


--
-- TOC entry 7004 (class 2606 OID 17471)
-- Name: tipo_auditoria tipo_auditoria_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_auditoria
    ADD CONSTRAINT tipo_auditoria_pkey PRIMARY KEY (tipo_auditoria_id);


--
-- TOC entry 6986 (class 2606 OID 17407)
-- Name: tipo_balance tipo_balance_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_balance
    ADD CONSTRAINT tipo_balance_codigo_key UNIQUE (codigo);


--
-- TOC entry 6988 (class 2606 OID 17405)
-- Name: tipo_balance tipo_balance_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_balance
    ADD CONSTRAINT tipo_balance_pkey PRIMARY KEY (tipo_balance_id);


--
-- TOC entry 6966 (class 2606 OID 17334)
-- Name: tipo_caja tipo_caja_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_caja
    ADD CONSTRAINT tipo_caja_codigo_key UNIQUE (codigo);


--
-- TOC entry 6968 (class 2606 OID 17332)
-- Name: tipo_caja tipo_caja_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_caja
    ADD CONSTRAINT tipo_caja_pkey PRIMARY KEY (tipo_caja_id);


--
-- TOC entry 6790 (class 2606 OID 16692)
-- Name: tipo_cama tipo_cama_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_cama
    ADD CONSTRAINT tipo_cama_codigo_key UNIQUE (codigo);


--
-- TOC entry 6792 (class 2606 OID 16690)
-- Name: tipo_cama tipo_cama_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_cama
    ADD CONSTRAINT tipo_cama_pkey PRIMARY KEY (tipo_cama_id);


--
-- TOC entry 6814 (class 2606 OID 16777)
-- Name: tipo_cita tipo_cita_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_cita
    ADD CONSTRAINT tipo_cita_codigo_key UNIQUE (codigo);


--
-- TOC entry 6816 (class 2606 OID 16775)
-- Name: tipo_cita tipo_cita_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_cita
    ADD CONSTRAINT tipo_cita_pkey PRIMARY KEY (tipo_cita_id);


--
-- TOC entry 6950 (class 2606 OID 17278)
-- Name: tipo_comprobante tipo_comprobante_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_comprobante
    ADD CONSTRAINT tipo_comprobante_codigo_key UNIQUE (codigo);


--
-- TOC entry 6952 (class 2606 OID 17276)
-- Name: tipo_comprobante tipo_comprobante_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_comprobante
    ADD CONSTRAINT tipo_comprobante_pkey PRIMARY KEY (tipo_comprobante_id);


--
-- TOC entry 7030 (class 2606 OID 17580)
-- Name: tipo_consentimiento tipo_consentimiento_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_consentimiento
    ADD CONSTRAINT tipo_consentimiento_codigo_key UNIQUE (codigo);


--
-- TOC entry 7032 (class 2606 OID 17578)
-- Name: tipo_consentimiento tipo_consentimiento_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_consentimiento
    ADD CONSTRAINT tipo_consentimiento_pkey PRIMARY KEY (tipo_consentimiento_id);


--
-- TOC entry 6782 (class 2606 OID 16663)
-- Name: tipo_consultorio tipo_consultorio_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_consultorio
    ADD CONSTRAINT tipo_consultorio_codigo_key UNIQUE (codigo);


--
-- TOC entry 6784 (class 2606 OID 16661)
-- Name: tipo_consultorio tipo_consultorio_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_consultorio
    ADD CONSTRAINT tipo_consultorio_pkey PRIMARY KEY (tipo_consultorio_id);


--
-- TOC entry 6842 (class 2606 OID 16878)
-- Name: tipo_diagnostico tipo_diagnostico_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_diagnostico
    ADD CONSTRAINT tipo_diagnostico_codigo_key UNIQUE (codigo);


--
-- TOC entry 6844 (class 2606 OID 16876)
-- Name: tipo_diagnostico tipo_diagnostico_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_diagnostico
    ADD CONSTRAINT tipo_diagnostico_pkey PRIMARY KEY (tipo_diagnostico_id);


--
-- TOC entry 6730 (class 2606 OID 16471)
-- Name: tipo_documento tipo_documento_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_documento
    ADD CONSTRAINT tipo_documento_codigo_key UNIQUE (codigo);


--
-- TOC entry 6732 (class 2606 OID 16469)
-- Name: tipo_documento tipo_documento_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_documento
    ADD CONSTRAINT tipo_documento_pkey PRIMARY KEY (tipo_documento_id);


--
-- TOC entry 6806 (class 2606 OID 16748)
-- Name: tipo_episodio tipo_episodio_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_episodio
    ADD CONSTRAINT tipo_episodio_codigo_key UNIQUE (codigo);


--
-- TOC entry 6808 (class 2606 OID 16746)
-- Name: tipo_episodio tipo_episodio_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_episodio
    ADD CONSTRAINT tipo_episodio_pkey PRIMARY KEY (tipo_episodio_id);


--
-- TOC entry 6934 (class 2606 OID 17222)
-- Name: tipo_equipo_laboratorio tipo_equipo_laboratorio_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_equipo_laboratorio
    ADD CONSTRAINT tipo_equipo_laboratorio_codigo_key UNIQUE (codigo);


--
-- TOC entry 6936 (class 2606 OID 17220)
-- Name: tipo_equipo_laboratorio tipo_equipo_laboratorio_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_equipo_laboratorio
    ADD CONSTRAINT tipo_equipo_laboratorio_pkey PRIMARY KEY (tipo_equipo_id);


--
-- TOC entry 6834 (class 2606 OID 16850)
-- Name: tipo_evolucion tipo_evolucion_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_evolucion
    ADD CONSTRAINT tipo_evolucion_codigo_key UNIQUE (codigo);


--
-- TOC entry 6836 (class 2606 OID 16848)
-- Name: tipo_evolucion tipo_evolucion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_evolucion
    ADD CONSTRAINT tipo_evolucion_pkey PRIMARY KEY (tipo_evolucion_id);


--
-- TOC entry 7245 (class 2606 OID 19613)
-- Name: tipo_examen tipo_examen_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_examen
    ADD CONSTRAINT tipo_examen_codigo_key UNIQUE (codigo);


--
-- TOC entry 6826 (class 2606 OID 16821)
-- Name: tipo_examen_fisico tipo_examen_fisico_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_examen_fisico
    ADD CONSTRAINT tipo_examen_fisico_codigo_key UNIQUE (codigo);


--
-- TOC entry 6828 (class 2606 OID 16819)
-- Name: tipo_examen_fisico tipo_examen_fisico_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_examen_fisico
    ADD CONSTRAINT tipo_examen_fisico_pkey PRIMARY KEY (tipo_examen_fisico_id);


--
-- TOC entry 7247 (class 2606 OID 19611)
-- Name: tipo_examen tipo_examen_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_examen
    ADD CONSTRAINT tipo_examen_pkey PRIMARY KEY (tipo_examen_id);


--
-- TOC entry 6886 (class 2606 OID 17041)
-- Name: tipo_forma_farmaceutica tipo_forma_farmaceutica_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_forma_farmaceutica
    ADD CONSTRAINT tipo_forma_farmaceutica_codigo_key UNIQUE (codigo);


--
-- TOC entry 6888 (class 2606 OID 17039)
-- Name: tipo_forma_farmaceutica tipo_forma_farmaceutica_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_forma_farmaceutica
    ADD CONSTRAINT tipo_forma_farmaceutica_pkey PRIMARY KEY (forma_farmaceutica_id);


--
-- TOC entry 6946 (class 2606 OID 17264)
-- Name: tipo_formato_imagen tipo_formato_imagen_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_formato_imagen
    ADD CONSTRAINT tipo_formato_imagen_codigo_key UNIQUE (codigo);


--
-- TOC entry 6948 (class 2606 OID 17262)
-- Name: tipo_formato_imagen tipo_formato_imagen_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_formato_imagen
    ADD CONSTRAINT tipo_formato_imagen_pkey PRIMARY KEY (tipo_formato_id);


--
-- TOC entry 6838 (class 2606 OID 16864)
-- Name: tipo_indicacion tipo_indicacion_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_indicacion
    ADD CONSTRAINT tipo_indicacion_codigo_key UNIQUE (codigo);


--
-- TOC entry 6840 (class 2606 OID 16862)
-- Name: tipo_indicacion tipo_indicacion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_indicacion
    ADD CONSTRAINT tipo_indicacion_pkey PRIMARY KEY (tipo_indicacion_id);


--
-- TOC entry 7026 (class 2606 OID 17563)
-- Name: tipo_mensaje_hl7 tipo_mensaje_hl7_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_mensaje_hl7
    ADD CONSTRAINT tipo_mensaje_hl7_codigo_key UNIQUE (codigo);


--
-- TOC entry 7028 (class 2606 OID 17561)
-- Name: tipo_mensaje_hl7 tipo_mensaje_hl7_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_mensaje_hl7
    ADD CONSTRAINT tipo_mensaje_hl7_pkey PRIMARY KEY (tipo_mensaje_id);


--
-- TOC entry 7014 (class 2606 OID 17517)
-- Name: tipo_modelo_ia tipo_modelo_ia_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_modelo_ia
    ADD CONSTRAINT tipo_modelo_ia_codigo_key UNIQUE (codigo);


--
-- TOC entry 7016 (class 2606 OID 17515)
-- Name: tipo_modelo_ia tipo_modelo_ia_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_modelo_ia
    ADD CONSTRAINT tipo_modelo_ia_pkey PRIMARY KEY (tipo_modelo_id);


--
-- TOC entry 6902 (class 2606 OID 17104)
-- Name: tipo_movimiento_almacen tipo_movimiento_almacen_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_movimiento_almacen
    ADD CONSTRAINT tipo_movimiento_almacen_codigo_key UNIQUE (codigo);


--
-- TOC entry 6904 (class 2606 OID 17102)
-- Name: tipo_movimiento_almacen tipo_movimiento_almacen_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_movimiento_almacen
    ADD CONSTRAINT tipo_movimiento_almacen_pkey PRIMARY KEY (tipo_movimiento_id);


--
-- TOC entry 6930 (class 2606 OID 17208)
-- Name: tipo_muestra tipo_muestra_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_muestra
    ADD CONSTRAINT tipo_muestra_codigo_key UNIQUE (codigo);


--
-- TOC entry 6932 (class 2606 OID 17206)
-- Name: tipo_muestra tipo_muestra_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_muestra
    ADD CONSTRAINT tipo_muestra_pkey PRIMARY KEY (tipo_muestra_id);


--
-- TOC entry 6758 (class 2606 OID 16573)
-- Name: tipo_organizacion tipo_organizacion_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_organizacion
    ADD CONSTRAINT tipo_organizacion_codigo_key UNIQUE (codigo);


--
-- TOC entry 6760 (class 2606 OID 16571)
-- Name: tipo_organizacion tipo_organizacion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_organizacion
    ADD CONSTRAINT tipo_organizacion_pkey PRIMARY KEY (tipo_organizacion_id);


--
-- TOC entry 6762 (class 2606 OID 16587)
-- Name: tipo_paciente tipo_paciente_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_paciente
    ADD CONSTRAINT tipo_paciente_codigo_key UNIQUE (codigo);


--
-- TOC entry 6764 (class 2606 OID 16585)
-- Name: tipo_paciente tipo_paciente_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_paciente
    ADD CONSTRAINT tipo_paciente_pkey PRIMARY KEY (tipo_paciente_id);


--
-- TOC entry 6770 (class 2606 OID 16616)
-- Name: tipo_personal tipo_personal_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_personal
    ADD CONSTRAINT tipo_personal_codigo_key UNIQUE (codigo);


--
-- TOC entry 6772 (class 2606 OID 16614)
-- Name: tipo_personal tipo_personal_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_personal
    ADD CONSTRAINT tipo_personal_pkey PRIMARY KEY (tipo_personal_id);


--
-- TOC entry 6870 (class 2606 OID 16979)
-- Name: tipo_procedimiento tipo_procedimiento_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_procedimiento
    ADD CONSTRAINT tipo_procedimiento_codigo_key UNIQUE (codigo);


--
-- TOC entry 6872 (class 2606 OID 16977)
-- Name: tipo_procedimiento tipo_procedimiento_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_procedimiento
    ADD CONSTRAINT tipo_procedimiento_pkey PRIMARY KEY (tipo_procedimiento_id);


--
-- TOC entry 7022 (class 2606 OID 17547)
-- Name: tipo_recurso_fhir tipo_recurso_fhir_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_recurso_fhir
    ADD CONSTRAINT tipo_recurso_fhir_codigo_key UNIQUE (codigo);


--
-- TOC entry 7024 (class 2606 OID 17545)
-- Name: tipo_recurso_fhir tipo_recurso_fhir_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_recurso_fhir
    ADD CONSTRAINT tipo_recurso_fhir_pkey PRIMARY KEY (tipo_recurso_id);


--
-- TOC entry 6822 (class 2606 OID 16807)
-- Name: tipo_registro_signos_vitales tipo_registro_signos_vitales_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_registro_signos_vitales
    ADD CONSTRAINT tipo_registro_signos_vitales_codigo_key UNIQUE (codigo);


--
-- TOC entry 6824 (class 2606 OID 16805)
-- Name: tipo_registro_signos_vitales tipo_registro_signos_vitales_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_registro_signos_vitales
    ADD CONSTRAINT tipo_registro_signos_vitales_pkey PRIMARY KEY (tipo_registro_id);


--
-- TOC entry 6978 (class 2606 OID 17377)
-- Name: tipo_servicio_basico tipo_servicio_basico_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_servicio_basico
    ADD CONSTRAINT tipo_servicio_basico_codigo_key UNIQUE (codigo);


--
-- TOC entry 6980 (class 2606 OID 17375)
-- Name: tipo_servicio_basico tipo_servicio_basico_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_servicio_basico
    ADD CONSTRAINT tipo_servicio_basico_pkey PRIMARY KEY (tipo_servicio_id);


--
-- TOC entry 6786 (class 2606 OID 16677)
-- Name: tipo_servicio_medico tipo_servicio_medico_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_servicio_medico
    ADD CONSTRAINT tipo_servicio_medico_codigo_key UNIQUE (codigo);


--
-- TOC entry 6788 (class 2606 OID 16675)
-- Name: tipo_servicio_medico tipo_servicio_medico_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_servicio_medico
    ADD CONSTRAINT tipo_servicio_medico_pkey PRIMARY KEY (tipo_servicio_id);


--
-- TOC entry 7018 (class 2606 OID 17531)
-- Name: tipo_sugerencia_ia tipo_sugerencia_ia_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_sugerencia_ia
    ADD CONSTRAINT tipo_sugerencia_ia_codigo_key UNIQUE (codigo);


--
-- TOC entry 7020 (class 2606 OID 17529)
-- Name: tipo_sugerencia_ia tipo_sugerencia_ia_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_sugerencia_ia
    ADD CONSTRAINT tipo_sugerencia_ia_pkey PRIMARY KEY (tipo_sugerencia_id);


--
-- TOC entry 6998 (class 2606 OID 17457)
-- Name: tipo_trama_susalud tipo_trama_susalud_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_trama_susalud
    ADD CONSTRAINT tipo_trama_susalud_codigo_key UNIQUE (codigo);


--
-- TOC entry 7000 (class 2606 OID 17455)
-- Name: tipo_trama_susalud tipo_trama_susalud_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_trama_susalud
    ADD CONSTRAINT tipo_trama_susalud_pkey PRIMARY KEY (tipo_trama_id);


--
-- TOC entry 6866 (class 2606 OID 16963)
-- Name: tipo_transicion tipo_transicion_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_transicion
    ADD CONSTRAINT tipo_transicion_codigo_key UNIQUE (codigo);


--
-- TOC entry 6868 (class 2606 OID 16961)
-- Name: tipo_transicion tipo_transicion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_transicion
    ADD CONSTRAINT tipo_transicion_pkey PRIMARY KEY (tipo_transicion_id);


--
-- TOC entry 7331 (class 2606 OID 20690)
-- Name: trama_susalud trama_susalud_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.trama_susalud
    ADD CONSTRAINT trama_susalud_pkey PRIMARY KEY (trama_id);


--
-- TOC entry 7150 (class 2606 OID 18434)
-- Name: transicion_atencion transicion_atencion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.transicion_atencion
    ADD CONSTRAINT transicion_atencion_pkey PRIMARY KEY (transicion_id);


--
-- TOC entry 7157 (class 2606 OID 18543)
-- Name: triaje triaje_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.triaje
    ADD CONSTRAINT triaje_pkey PRIMARY KEY (triaje_id);


--
-- TOC entry 6754 (class 2606 OID 16557)
-- Name: ubigeo ubigeo_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.ubigeo
    ADD CONSTRAINT ubigeo_codigo_key UNIQUE (codigo);


--
-- TOC entry 6756 (class 2606 OID 16555)
-- Name: ubigeo ubigeo_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.ubigeo
    ADD CONSTRAINT ubigeo_pkey PRIMARY KEY (ubigeo_id);


--
-- TOC entry 6890 (class 2606 OID 17055)
-- Name: unidad_medida_farmacia unidad_medida_farmacia_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.unidad_medida_farmacia
    ADD CONSTRAINT unidad_medida_farmacia_codigo_key UNIQUE (codigo);


--
-- TOC entry 6892 (class 2606 OID 17053)
-- Name: unidad_medida_farmacia unidad_medida_farmacia_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.unidad_medida_farmacia
    ADD CONSTRAINT unidad_medida_farmacia_pkey PRIMARY KEY (unidad_medida_farmacia_id);


--
-- TOC entry 6898 (class 2606 OID 17090)
-- Name: unidad_medida_general unidad_medida_general_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.unidad_medida_general
    ADD CONSTRAINT unidad_medida_general_codigo_key UNIQUE (codigo);


--
-- TOC entry 6900 (class 2606 OID 17088)
-- Name: unidad_medida_general unidad_medida_general_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.unidad_medida_general
    ADD CONSTRAINT unidad_medida_general_pkey PRIMARY KEY (unidad_medida_id);


--
-- TOC entry 6894 (class 2606 OID 17076)
-- Name: unidad_medida_laboratorio unidad_medida_laboratorio_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.unidad_medida_laboratorio
    ADD CONSTRAINT unidad_medida_laboratorio_codigo_key UNIQUE (codigo);


--
-- TOC entry 6896 (class 2606 OID 17074)
-- Name: unidad_medida_laboratorio unidad_medida_laboratorio_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.unidad_medida_laboratorio
    ADD CONSTRAINT unidad_medida_laboratorio_pkey PRIMARY KEY (unidad_medida_lab_id);


--
-- TOC entry 7103 (class 2606 OID 18062)
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (usuario_id);


--
-- TOC entry 7105 (class 2606 OID 18064)
-- Name: usuario usuario_username_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.usuario
    ADD CONSTRAINT usuario_username_key UNIQUE (username);


--
-- TOC entry 7371 (class 2606 OID 21110)
-- Name: valor_kpi valor_kpi_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.valor_kpi
    ADD CONSTRAINT valor_kpi_pkey PRIMARY KEY (valor_kpi_id);


--
-- TOC entry 6910 (class 2606 OID 17132)
-- Name: via_administracion via_administracion_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.via_administracion
    ADD CONSTRAINT via_administracion_codigo_key UNIQUE (codigo);


--
-- TOC entry 6912 (class 2606 OID 17130)
-- Name: via_administracion via_administracion_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.via_administracion
    ADD CONSTRAINT via_administracion_pkey PRIMARY KEY (via_administracion_id);


--
-- TOC entry 6858 (class 2606 OID 16935)
-- Name: via_ingreso_hospitalario via_ingreso_hospitalario_codigo_key; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.via_ingreso_hospitalario
    ADD CONSTRAINT via_ingreso_hospitalario_codigo_key UNIQUE (codigo);


--
-- TOC entry 6860 (class 2606 OID 16933)
-- Name: via_ingreso_hospitalario via_ingreso_hospitalario_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.via_ingreso_hospitalario
    ADD CONSTRAINT via_ingreso_hospitalario_pkey PRIMARY KEY (via_ingreso_id);


--
-- TOC entry 7363 (class 2606 OID 21038)
-- Name: widget_dashboard widget_dashboard_pkey; Type: CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.widget_dashboard
    ADD CONSTRAINT widget_dashboard_pkey PRIMARY KEY (widget_id);


--
-- TOC entry 7298 (class 1259 OID 21712)
-- Name: idx_apertura_caja_fecha; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_apertura_caja_fecha ON medico.apertura_caja USING btree (fecha_apertura);


--
-- TOC entry 7299 (class 1259 OID 21713)
-- Name: idx_apertura_caja_personal; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_apertura_caja_personal ON medico.apertura_caja USING btree (personal_id);


--
-- TOC entry 7135 (class 1259 OID 21733)
-- Name: idx_atencion_eliminado; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_atencion_eliminado ON medico.atencion USING btree (eliminado) WHERE (eliminado = false);


--
-- TOC entry 7136 (class 1259 OID 21682)
-- Name: idx_atencion_estado; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_atencion_estado ON medico.atencion USING btree (estado_atencion_id);


--
-- TOC entry 7137 (class 1259 OID 21681)
-- Name: idx_atencion_fecha; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_atencion_fecha ON medico.atencion USING btree (fecha_hora_registro);


--
-- TOC entry 7138 (class 1259 OID 21680)
-- Name: idx_atencion_numero; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_atencion_numero ON medico.atencion USING btree (numero_atencion);


--
-- TOC entry 7139 (class 1259 OID 21683)
-- Name: idx_atencion_org; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_atencion_org ON medico.atencion USING btree (organizacion_id);


--
-- TOC entry 7140 (class 1259 OID 21679)
-- Name: idx_atencion_paciente; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_atencion_paciente ON medico.atencion USING btree (paciente_id);


--
-- TOC entry 7072 (class 1259 OID 21720)
-- Name: idx_cie10_codigo; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_cie10_codigo ON medico.cie10 USING btree (codigo);


--
-- TOC entry 7073 (class 1259 OID 21721)
-- Name: idx_cie10_descripcion; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_cie10_descripcion ON medico.cie10 USING gin (to_tsvector('spanish'::regconfig, descripcion));


--
-- TOC entry 7126 (class 1259 OID 21687)
-- Name: idx_cita_agenda; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_cita_agenda ON medico.cita USING btree (agenda_id);


--
-- TOC entry 7127 (class 1259 OID 21735)
-- Name: idx_cita_eliminado; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_cita_eliminado ON medico.cita USING btree (eliminado) WHERE (eliminado = false);


--
-- TOC entry 7128 (class 1259 OID 21690)
-- Name: idx_cita_estado; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_cita_estado ON medico.cita USING btree (estado_cita_id);


--
-- TOC entry 7129 (class 1259 OID 21689)
-- Name: idx_cita_fecha; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_cita_fecha ON medico.cita USING btree (fecha_hora_programada);


--
-- TOC entry 7130 (class 1259 OID 21688)
-- Name: idx_cita_paciente; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_cita_paciente ON medico.cita USING btree (paciente_id);


--
-- TOC entry 7281 (class 1259 OID 21737)
-- Name: idx_comprobante_eliminado; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_comprobante_eliminado ON medico.comprobante USING btree (eliminado) WHERE (eliminado = false);


--
-- TOC entry 7282 (class 1259 OID 21708)
-- Name: idx_comprobante_fecha; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_comprobante_fecha ON medico.comprobante USING btree (fecha_emision);


--
-- TOC entry 7283 (class 1259 OID 21711)
-- Name: idx_comprobante_org; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_comprobante_org ON medico.comprobante USING btree (organizacion_id);


--
-- TOC entry 7284 (class 1259 OID 21710)
-- Name: idx_comprobante_paciente; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_comprobante_paciente ON medico.comprobante USING btree (paciente_id);


--
-- TOC entry 7285 (class 1259 OID 21709)
-- Name: idx_comprobante_serie_numero; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_comprobante_serie_numero ON medico.comprobante USING btree (serie, numero);


--
-- TOC entry 7145 (class 1259 OID 21684)
-- Name: idx_episodio_atencion; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_episodio_atencion ON medico.episodio_clinico USING btree (atencion_id);


--
-- TOC entry 7146 (class 1259 OID 21734)
-- Name: idx_episodio_eliminado; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_episodio_eliminado ON medico.episodio_clinico USING btree (eliminado) WHERE (eliminado = false);


--
-- TOC entry 7147 (class 1259 OID 21685)
-- Name: idx_episodio_fecha; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_episodio_fecha ON medico.episodio_clinico USING btree (fecha_hora_inicio);


--
-- TOC entry 7148 (class 1259 OID 21686)
-- Name: idx_episodio_tipo; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_episodio_tipo ON medico.episodio_clinico USING btree (tipo_episodio_id);


--
-- TOC entry 7164 (class 1259 OID 21714)
-- Name: idx_evolucion_atencion; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_evolucion_atencion ON medico.evolucion_clinica USING btree (atencion_id);


--
-- TOC entry 7165 (class 1259 OID 21715)
-- Name: idx_evolucion_episodio; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_evolucion_episodio ON medico.evolucion_clinica USING btree (episodio_id);


--
-- TOC entry 7166 (class 1259 OID 21716)
-- Name: idx_evolucion_fecha; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_evolucion_fecha ON medico.evolucion_clinica USING btree (fecha_hora);


--
-- TOC entry 7191 (class 1259 OID 21692)
-- Name: idx_hospitalizacion_episodio; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_hospitalizacion_episodio ON medico.hospitalizacion USING btree (episodio_id);


--
-- TOC entry 7192 (class 1259 OID 21693)
-- Name: idx_hospitalizacion_fecha; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_hospitalizacion_fecha ON medico.hospitalizacion USING btree (fecha_hora_ingreso_hospitalario);


--
-- TOC entry 7193 (class 1259 OID 21691)
-- Name: idx_hospitalizacion_paciente; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_hospitalizacion_paciente ON medico.hospitalizacion USING btree (paciente_id);


--
-- TOC entry 7413 (class 1259 OID 21726)
-- Name: idx_log_acceso_fecha; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_log_acceso_fecha ON medico.log_acceso_sistema USING btree (fecha_hora);


--
-- TOC entry 7417 (class 1259 OID 21729)
-- Name: idx_log_acceso_hc_fecha; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_log_acceso_hc_fecha ON medico.log_acceso_hc USING btree (fecha_hora);


--
-- TOC entry 7418 (class 1259 OID 21727)
-- Name: idx_log_acceso_hc_paciente; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_log_acceso_hc_paciente ON medico.log_acceso_hc USING btree (paciente_id);


--
-- TOC entry 7419 (class 1259 OID 21728)
-- Name: idx_log_acceso_hc_usuario; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_log_acceso_hc_usuario ON medico.log_acceso_hc USING btree (usuario_id);


--
-- TOC entry 7414 (class 1259 OID 21725)
-- Name: idx_log_acceso_usuario; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_log_acceso_usuario ON medico.log_acceso_sistema USING btree (usuario_id);


--
-- TOC entry 7408 (class 1259 OID 21723)
-- Name: idx_log_auditoria_fecha; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_log_auditoria_fecha ON medico.log_auditoria_sistema USING btree (fecha_hora);


--
-- TOC entry 7409 (class 1259 OID 21722)
-- Name: idx_log_auditoria_tabla; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_log_auditoria_tabla ON medico.log_auditoria_sistema USING btree (tabla_afectada, registro_id);


--
-- TOC entry 7410 (class 1259 OID 21724)
-- Name: idx_log_auditoria_usuario; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_log_auditoria_usuario ON medico.log_auditoria_sistema USING btree (usuario_id);


--
-- TOC entry 7215 (class 1259 OID 21704)
-- Name: idx_lote_almacen; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_lote_almacen ON medico.lote_producto USING btree (almacen_id);


--
-- TOC entry 7216 (class 1259 OID 21703)
-- Name: idx_lote_producto; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_lote_producto ON medico.lote_producto USING btree (producto_id);


--
-- TOC entry 7217 (class 1259 OID 21705)
-- Name: idx_lote_vencimiento; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_lote_vencimiento ON medico.lote_producto USING btree (fecha_vencimiento);


--
-- TOC entry 7222 (class 1259 OID 21706)
-- Name: idx_movimiento_almacen_fecha; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_movimiento_almacen_fecha ON medico.movimiento_almacen USING btree (fecha_hora);


--
-- TOC entry 7223 (class 1259 OID 21707)
-- Name: idx_movimiento_almacen_tipo; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_movimiento_almacen_tipo ON medico.movimiento_almacen USING btree (tipo_movimiento_id);


--
-- TOC entry 7033 (class 1259 OID 21730)
-- Name: idx_organizacion_eliminado; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_organizacion_eliminado ON medico.organizacion USING btree (eliminado) WHERE (eliminado = false);


--
-- TOC entry 7048 (class 1259 OID 21731)
-- Name: idx_paciente_eliminado; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_paciente_eliminado ON medico.paciente USING btree (eliminado) WHERE (eliminado = false);


--
-- TOC entry 7049 (class 1259 OID 21674)
-- Name: idx_paciente_historia; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_paciente_historia ON medico.paciente USING btree (numero_historia_clinica);


--
-- TOC entry 7050 (class 1259 OID 21675)
-- Name: idx_paciente_org; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_paciente_org ON medico.paciente USING btree (organizacion_id);


--
-- TOC entry 7051 (class 1259 OID 21673)
-- Name: idx_paciente_persona; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_paciente_persona ON medico.paciente USING btree (persona_id);


--
-- TOC entry 7042 (class 1259 OID 21671)
-- Name: idx_persona_documento; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_persona_documento ON medico.persona USING btree (tipo_documento_id, numero_documento);


--
-- TOC entry 7043 (class 1259 OID 21672)
-- Name: idx_persona_nombres; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_persona_nombres ON medico.persona USING btree (apellido_paterno, apellido_materno, nombres);


--
-- TOC entry 7082 (class 1259 OID 21677)
-- Name: idx_personal_codigo; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_personal_codigo ON medico.personal USING btree (codigo_empleado);


--
-- TOC entry 7083 (class 1259 OID 21732)
-- Name: idx_personal_eliminado; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_personal_eliminado ON medico.personal USING btree (eliminado) WHERE (eliminado = false);


--
-- TOC entry 7084 (class 1259 OID 21678)
-- Name: idx_personal_org; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_personal_org ON medico.personal USING btree (organizacion_id);


--
-- TOC entry 7085 (class 1259 OID 21676)
-- Name: idx_personal_persona; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_personal_persona ON medico.personal USING btree (persona_id);


--
-- TOC entry 7208 (class 1259 OID 21701)
-- Name: idx_producto_codigo; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_producto_codigo ON medico.producto USING btree (codigo);


--
-- TOC entry 7209 (class 1259 OID 21736)
-- Name: idx_producto_eliminado; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_producto_eliminado ON medico.producto USING btree (eliminado) WHERE (eliminado = false);


--
-- TOC entry 7210 (class 1259 OID 21702)
-- Name: idx_producto_nombre; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_producto_nombre ON medico.producto USING btree (nombre_generico);


--
-- TOC entry 7230 (class 1259 OID 21694)
-- Name: idx_receta_atencion; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_receta_atencion ON medico.receta USING btree (atencion_id);


--
-- TOC entry 7231 (class 1259 OID 21696)
-- Name: idx_receta_fecha; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_receta_fecha ON medico.receta USING btree (fecha_emision);


--
-- TOC entry 7232 (class 1259 OID 21697)
-- Name: idx_receta_numero; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_receta_numero ON medico.receta USING btree (numero_receta);


--
-- TOC entry 7233 (class 1259 OID 21695)
-- Name: idx_receta_paciente; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_receta_paciente ON medico.receta USING btree (paciente_id);


--
-- TOC entry 7151 (class 1259 OID 21717)
-- Name: idx_signos_vitales_atencion; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_signos_vitales_atencion ON medico.registro_signos_vitales USING btree (atencion_id);


--
-- TOC entry 7152 (class 1259 OID 21718)
-- Name: idx_signos_vitales_episodio; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_signos_vitales_episodio ON medico.registro_signos_vitales USING btree (episodio_id);


--
-- TOC entry 7153 (class 1259 OID 21719)
-- Name: idx_signos_vitales_fecha; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_signos_vitales_fecha ON medico.registro_signos_vitales USING btree (fecha_hora);


--
-- TOC entry 7248 (class 1259 OID 21698)
-- Name: idx_solicitud_examen_atencion; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_solicitud_examen_atencion ON medico.solicitud_examen USING btree (atencion_id);


--
-- TOC entry 7249 (class 1259 OID 21700)
-- Name: idx_solicitud_examen_fecha; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_solicitud_examen_fecha ON medico.solicitud_examen USING btree (fecha_solicitud);


--
-- TOC entry 7250 (class 1259 OID 21699)
-- Name: idx_solicitud_examen_numero; Type: INDEX; Schema: medico; Owner: postgres
--

CREATE INDEX idx_solicitud_examen_numero ON medico.solicitud_examen USING btree (numero_solicitud);


--
-- TOC entry 7985 (class 2618 OID 21774)
-- Name: v_atenciones_episodios _RETURN; Type: RULE; Schema: medico; Owner: postgres
--

CREATE OR REPLACE VIEW medico.v_atenciones_episodios AS
 SELECT a.atencion_id,
    a.numero_atencion,
    a.fecha_hora_registro,
    a.fecha_hora_inicio,
    a.fecha_hora_fin,
    pac.numero_historia_clinica,
    concat(per.apellido_paterno, ' ', per.apellido_materno, ', ', per.nombres) AS paciente,
    ta.nombre AS tipo_atencion_inicial,
    ta2.nombre AS tipo_atencion_actual,
    ea.nombre AS estado_atencion,
    count(ec.episodio_id) AS total_episodios,
    string_agg(DISTINCT (te.nombre)::text, ', '::text) AS episodios,
    org.razon_social AS organizacion
   FROM ((((((((medico.atencion a
     JOIN medico.paciente pac ON ((a.paciente_id = pac.paciente_id)))
     JOIN medico.persona per ON ((pac.persona_id = per.persona_id)))
     JOIN medico.organizacion org ON ((a.organizacion_id = org.organizacion_id)))
     LEFT JOIN medico.tipo_atencion ta ON ((a.tipo_atencion_id = ta.tipo_atencion_id)))
     LEFT JOIN medico.tipo_atencion ta2 ON ((a.tipo_atencion_actual_id = ta2.tipo_atencion_id)))
     LEFT JOIN medico.estado_atencion ea ON ((a.estado_atencion_id = ea.estado_atencion_id)))
     LEFT JOIN medico.episodio_clinico ec ON (((a.atencion_id = ec.atencion_id) AND (ec.eliminado = false))))
     LEFT JOIN medico.tipo_episodio te ON ((ec.tipo_episodio_id = te.tipo_episodio_id)))
  WHERE (a.eliminado = false)
  GROUP BY a.atencion_id, pac.numero_historia_clinica, per.apellido_paterno, per.apellido_materno, per.nombres, ta.nombre, ta2.nombre, ea.nombre, org.razon_social;


--
-- TOC entry 7832 (class 2620 OID 21758)
-- Name: detalle_dispensacion trigger_actualizar_dispensacion; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_actualizar_dispensacion AFTER INSERT ON medico.detalle_dispensacion FOR EACH ROW EXECUTE FUNCTION medico.actualizar_cantidad_dispensada();


--
-- TOC entry 7831 (class 2620 OID 21760)
-- Name: detalle_receta trigger_actualizar_estado_receta; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_actualizar_estado_receta AFTER INSERT OR UPDATE ON medico.detalle_receta FOR EACH ROW EXECUTE FUNCTION medico.actualizar_estado_receta();


--
-- TOC entry 7829 (class 2620 OID 21756)
-- Name: detalle_movimiento_almacen trigger_actualizar_stock; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_actualizar_stock AFTER INSERT ON medico.detalle_movimiento_almacen FOR EACH ROW EXECUTE FUNCTION medico.actualizar_stock_lote();


--
-- TOC entry 7836 (class 2620 OID 21764)
-- Name: movimiento_caja trigger_actualizar_totales_caja; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_actualizar_totales_caja AFTER INSERT OR UPDATE ON medico.movimiento_caja FOR EACH ROW EXECUTE FUNCTION medico.actualizar_totales_caja();


--
-- TOC entry 7823 (class 2620 OID 21744)
-- Name: atencion trigger_atencion_timestamp; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_atencion_timestamp BEFORE UPDATE ON medico.atencion FOR EACH ROW EXECUTE FUNCTION medico.trigger_set_timestamp();


--
-- TOC entry 7835 (class 2620 OID 21762)
-- Name: detalle_comprobante trigger_calcular_totales_comprobante; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_calcular_totales_comprobante AFTER INSERT OR DELETE OR UPDATE ON medico.detalle_comprobante FOR EACH ROW EXECUTE FUNCTION medico.calcular_totales_comprobante();


--
-- TOC entry 7821 (class 2620 OID 21746)
-- Name: cita trigger_cita_timestamp; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_cita_timestamp BEFORE UPDATE ON medico.cita FOR EACH ROW EXECUTE FUNCTION medico.trigger_set_timestamp();


--
-- TOC entry 7834 (class 2620 OID 21750)
-- Name: comprobante trigger_comprobante_timestamp; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_comprobante_timestamp BEFORE UPDATE ON medico.comprobante FOR EACH ROW EXECUTE FUNCTION medico.trigger_set_timestamp();


--
-- TOC entry 7824 (class 2620 OID 21745)
-- Name: episodio_clinico trigger_episodio_timestamp; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_episodio_timestamp BEFORE UPDATE ON medico.episodio_clinico FOR EACH ROW EXECUTE FUNCTION medico.trigger_set_timestamp();


--
-- TOC entry 7826 (class 2620 OID 21747)
-- Name: hospitalizacion trigger_hospitalizacion_timestamp; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_hospitalizacion_timestamp BEFORE UPDATE ON medico.hospitalizacion FOR EACH ROW EXECUTE FUNCTION medico.trigger_set_timestamp();


--
-- TOC entry 7815 (class 2620 OID 21738)
-- Name: organizacion trigger_organizacion_timestamp; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_organizacion_timestamp BEFORE UPDATE ON medico.organizacion FOR EACH ROW EXECUTE FUNCTION medico.trigger_set_timestamp();


--
-- TOC entry 7818 (class 2620 OID 21741)
-- Name: paciente trigger_paciente_timestamp; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_paciente_timestamp BEFORE UPDATE ON medico.paciente FOR EACH ROW EXECUTE FUNCTION medico.trigger_set_timestamp();


--
-- TOC entry 7817 (class 2620 OID 21740)
-- Name: persona trigger_persona_timestamp; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_persona_timestamp BEFORE UPDATE ON medico.persona FOR EACH ROW EXECUTE FUNCTION medico.trigger_set_timestamp();


--
-- TOC entry 7819 (class 2620 OID 21742)
-- Name: personal trigger_personal_timestamp; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_personal_timestamp BEFORE UPDATE ON medico.personal FOR EACH ROW EXECUTE FUNCTION medico.trigger_set_timestamp();


--
-- TOC entry 7827 (class 2620 OID 21749)
-- Name: producto trigger_producto_timestamp; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_producto_timestamp BEFORE UPDATE ON medico.producto FOR EACH ROW EXECUTE FUNCTION medico.trigger_set_timestamp();


--
-- TOC entry 7830 (class 2620 OID 21748)
-- Name: receta trigger_receta_timestamp; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_receta_timestamp BEFORE UPDATE ON medico.receta FOR EACH ROW EXECUTE FUNCTION medico.trigger_set_timestamp();


--
-- TOC entry 7816 (class 2620 OID 21739)
-- Name: sede trigger_sede_timestamp; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_sede_timestamp BEFORE UPDATE ON medico.sede FOR EACH ROW EXECUTE FUNCTION medico.trigger_set_timestamp();


--
-- TOC entry 7820 (class 2620 OID 21743)
-- Name: usuario trigger_usuario_timestamp; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_usuario_timestamp BEFORE UPDATE ON medico.usuario FOR EACH ROW EXECUTE FUNCTION medico.trigger_set_timestamp();


--
-- TOC entry 7822 (class 2620 OID 21806)
-- Name: cita trigger_validar_cita_duplicada; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_validar_cita_duplicada BEFORE INSERT OR UPDATE ON medico.cita FOR EACH ROW EXECUTE FUNCTION medico.validar_cita_duplicada();


--
-- TOC entry 7825 (class 2620 OID 21810)
-- Name: episodio_clinico trigger_validar_fechas_episodio; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_validar_fechas_episodio BEFORE INSERT OR UPDATE ON medico.episodio_clinico FOR EACH ROW EXECUTE FUNCTION medico.validar_fechas_episodio();


--
-- TOC entry 7833 (class 2620 OID 21808)
-- Name: detalle_dispensacion trigger_validar_stock_dispensacion; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_validar_stock_dispensacion BEFORE INSERT ON medico.detalle_dispensacion FOR EACH ROW EXECUTE FUNCTION medico.validar_stock_dispensacion();


--
-- TOC entry 7828 (class 2620 OID 21754)
-- Name: lote_producto trigger_validar_vencimiento_lote; Type: TRIGGER; Schema: medico; Owner: postgres
--

CREATE TRIGGER trigger_validar_vencimiento_lote BEFORE INSERT OR UPDATE ON medico.lote_producto FOR EACH ROW EXECUTE FUNCTION medico.validar_fecha_vencimiento();


--
-- TOC entry 7480 (class 2606 OID 18213)
-- Name: agenda agenda_consultorio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.agenda
    ADD CONSTRAINT agenda_consultorio_id_fkey FOREIGN KEY (consultorio_id) REFERENCES medico.consultorio(consultorio_id);


--
-- TOC entry 7481 (class 2606 OID 18208)
-- Name: agenda agenda_personal_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.agenda
    ADD CONSTRAINT agenda_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7482 (class 2606 OID 18218)
-- Name: agenda agenda_servicio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.agenda
    ADD CONSTRAINT agenda_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES medico.servicio_medico(servicio_id);


--
-- TOC entry 7785 (class 2606 OID 21247)
-- Name: alerta_ia alerta_ia_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.alerta_ia
    ADD CONSTRAINT alerta_ia_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7786 (class 2606 OID 21237)
-- Name: alerta_ia alerta_ia_modelo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.alerta_ia
    ADD CONSTRAINT alerta_ia_modelo_id_fkey FOREIGN KEY (modelo_id) REFERENCES medico.modelo_ia(modelo_id);


--
-- TOC entry 7787 (class 2606 OID 21242)
-- Name: alerta_ia alerta_ia_paciente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.alerta_ia
    ADD CONSTRAINT alerta_ia_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES medico.paciente(paciente_id);


--
-- TOC entry 7788 (class 2606 OID 21262)
-- Name: alerta_ia alerta_ia_personal_atiende_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.alerta_ia
    ADD CONSTRAINT alerta_ia_personal_atiende_id_fkey FOREIGN KEY (personal_atiende_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7789 (class 2606 OID 21257)
-- Name: alerta_ia alerta_ia_producto_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.alerta_ia
    ADD CONSTRAINT alerta_ia_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES medico.producto(producto_id);


--
-- TOC entry 7790 (class 2606 OID 21252)
-- Name: alerta_ia alerta_ia_receta_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.alerta_ia
    ADD CONSTRAINT alerta_ia_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES medico.receta(receta_id);


--
-- TOC entry 7608 (class 2606 OID 19259)
-- Name: almacen almacen_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.almacen
    ADD CONSTRAINT almacen_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7609 (class 2606 OID 19274)
-- Name: almacen almacen_responsable_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.almacen
    ADD CONSTRAINT almacen_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7610 (class 2606 OID 19264)
-- Name: almacen almacen_sede_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.almacen
    ADD CONSTRAINT almacen_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES medico.sede(sede_id);


--
-- TOC entry 7611 (class 2606 OID 19269)
-- Name: almacen almacen_tipo_almacen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.almacen
    ADD CONSTRAINT almacen_tipo_almacen_id_fkey FOREIGN KEY (tipo_almacen_id) REFERENCES medico.tipo_almacen(tipo_almacen_id);


--
-- TOC entry 7450 (class 2606 OID 17855)
-- Name: antecedente_medico antecedente_medico_cie10_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.antecedente_medico
    ADD CONSTRAINT antecedente_medico_cie10_id_fkey FOREIGN KEY (cie10_id) REFERENCES medico.cie10(cie10_id);


--
-- TOC entry 7702 (class 2606 OID 20229)
-- Name: apertura_caja apertura_caja_caja_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.apertura_caja
    ADD CONSTRAINT apertura_caja_caja_id_fkey FOREIGN KEY (caja_id) REFERENCES medico.caja(caja_id);


--
-- TOC entry 7703 (class 2606 OID 20244)
-- Name: apertura_caja apertura_caja_estado_caja_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.apertura_caja
    ADD CONSTRAINT apertura_caja_estado_caja_id_fkey FOREIGN KEY (estado_caja_id) REFERENCES medico.estado_caja(estado_caja_id);


--
-- TOC entry 7704 (class 2606 OID 20234)
-- Name: apertura_caja apertura_caja_personal_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.apertura_caja
    ADD CONSTRAINT apertura_caja_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7705 (class 2606 OID 20239)
-- Name: apertura_caja apertura_caja_personal_supervisa_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.apertura_caja
    ADD CONSTRAINT apertura_caja_personal_supervisa_id_fkey FOREIGN KEY (personal_supervisa_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7445 (class 2606 OID 17748)
-- Name: aseguradora aseguradora_tipo_aseguradora_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.aseguradora
    ADD CONSTRAINT aseguradora_tipo_aseguradora_id_fkey FOREIGN KEY (tipo_aseguradora_id) REFERENCES medico.tipo_aseguradora(tipo_aseguradora_id);


--
-- TOC entry 7489 (class 2606 OID 18345)
-- Name: atencion atencion_atencion_origen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.atencion
    ADD CONSTRAINT atencion_atencion_origen_id_fkey FOREIGN KEY (atencion_origen_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7490 (class 2606 OID 18330)
-- Name: atencion atencion_cama_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.atencion
    ADD CONSTRAINT atencion_cama_id_fkey FOREIGN KEY (cama_id) REFERENCES medico.cama(cama_id);


--
-- TOC entry 7491 (class 2606 OID 18310)
-- Name: atencion atencion_cita_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.atencion
    ADD CONSTRAINT atencion_cita_id_fkey FOREIGN KEY (cita_id) REFERENCES medico.cita(cita_id);


--
-- TOC entry 7492 (class 2606 OID 18325)
-- Name: atencion atencion_consultorio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.atencion
    ADD CONSTRAINT atencion_consultorio_id_fkey FOREIGN KEY (consultorio_id) REFERENCES medico.consultorio(consultorio_id);


--
-- TOC entry 7493 (class 2606 OID 18340)
-- Name: atencion atencion_estado_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.atencion
    ADD CONSTRAINT atencion_estado_atencion_id_fkey FOREIGN KEY (estado_atencion_id) REFERENCES medico.estado_atencion(estado_atencion_id);


--
-- TOC entry 7494 (class 2606 OID 18295)
-- Name: atencion atencion_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.atencion
    ADD CONSTRAINT atencion_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7495 (class 2606 OID 18305)
-- Name: atencion atencion_paciente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.atencion
    ADD CONSTRAINT atencion_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES medico.paciente(paciente_id);


--
-- TOC entry 7496 (class 2606 OID 18335)
-- Name: atencion atencion_personal_responsable_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.atencion
    ADD CONSTRAINT atencion_personal_responsable_id_fkey FOREIGN KEY (personal_responsable_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7497 (class 2606 OID 18300)
-- Name: atencion atencion_sede_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.atencion
    ADD CONSTRAINT atencion_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES medico.sede(sede_id);


--
-- TOC entry 7498 (class 2606 OID 18320)
-- Name: atencion atencion_tipo_atencion_actual_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.atencion
    ADD CONSTRAINT atencion_tipo_atencion_actual_id_fkey FOREIGN KEY (tipo_atencion_actual_id) REFERENCES medico.tipo_atencion(tipo_atencion_id);


--
-- TOC entry 7499 (class 2606 OID 18315)
-- Name: atencion atencion_tipo_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.atencion
    ADD CONSTRAINT atencion_tipo_atencion_id_fkey FOREIGN KEY (tipo_atencion_id) REFERENCES medico.tipo_atencion(tipo_atencion_id);


--
-- TOC entry 7750 (class 2606 OID 20814)
-- Name: auditoria_hc auditoria_hc_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.auditoria_hc
    ADD CONSTRAINT auditoria_hc_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7751 (class 2606 OID 20829)
-- Name: auditoria_hc auditoria_hc_auditor_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.auditoria_hc
    ADD CONSTRAINT auditoria_hc_auditor_id_fkey FOREIGN KEY (auditor_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7752 (class 2606 OID 20819)
-- Name: auditoria_hc auditoria_hc_hospitalizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.auditoria_hc
    ADD CONSTRAINT auditoria_hc_hospitalizacion_id_fkey FOREIGN KEY (hospitalizacion_id) REFERENCES medico.hospitalizacion(hospitalizacion_id);


--
-- TOC entry 7753 (class 2606 OID 20809)
-- Name: auditoria_hc auditoria_hc_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.auditoria_hc
    ADD CONSTRAINT auditoria_hc_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7754 (class 2606 OID 20824)
-- Name: auditoria_hc auditoria_hc_tipo_auditoria_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.auditoria_hc
    ADD CONSTRAINT auditoria_hc_tipo_auditoria_id_fkey FOREIGN KEY (tipo_auditoria_id) REFERENCES medico.tipo_auditoria(tipo_auditoria_id);


--
-- TOC entry 7729 (class 2606 OID 20530)
-- Name: balance balance_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.balance
    ADD CONSTRAINT balance_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7730 (class 2606 OID 20535)
-- Name: balance balance_periodo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.balance
    ADD CONSTRAINT balance_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES medico.periodo_contable(periodo_id);


--
-- TOC entry 7731 (class 2606 OID 20550)
-- Name: balance balance_personal_aprueba_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.balance
    ADD CONSTRAINT balance_personal_aprueba_id_fkey FOREIGN KEY (personal_aprueba_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7732 (class 2606 OID 20545)
-- Name: balance balance_personal_elabora_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.balance
    ADD CONSTRAINT balance_personal_elabora_id_fkey FOREIGN KEY (personal_elabora_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7733 (class 2606 OID 20540)
-- Name: balance balance_tipo_balance_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.balance
    ADD CONSTRAINT balance_tipo_balance_id_fkey FOREIGN KEY (tipo_balance_id) REFERENCES medico.tipo_balance(tipo_balance_id);


--
-- TOC entry 7699 (class 2606 OID 20183)
-- Name: caja caja_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.caja
    ADD CONSTRAINT caja_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7700 (class 2606 OID 20188)
-- Name: caja caja_sede_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.caja
    ADD CONSTRAINT caja_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES medico.sede(sede_id);


--
-- TOC entry 7701 (class 2606 OID 20193)
-- Name: caja caja_tipo_caja_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.caja
    ADD CONSTRAINT caja_tipo_caja_id_fkey FOREIGN KEY (tipo_caja_id) REFERENCES medico.tipo_caja(tipo_caja_id);


--
-- TOC entry 7476 (class 2606 OID 18163)
-- Name: cama cama_estado_cama_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cama
    ADD CONSTRAINT cama_estado_cama_id_fkey FOREIGN KEY (estado_cama_id) REFERENCES medico.estado_cama(estado_cama_id);


--
-- TOC entry 7477 (class 2606 OID 18153)
-- Name: cama cama_sede_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cama
    ADD CONSTRAINT cama_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES medico.sede(sede_id);


--
-- TOC entry 7478 (class 2606 OID 18158)
-- Name: cama cama_tipo_cama_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cama
    ADD CONSTRAINT cama_tipo_cama_id_fkey FOREIGN KEY (tipo_cama_id) REFERENCES medico.tipo_cama(tipo_cama_id);


--
-- TOC entry 7429 (class 2606 OID 17423)
-- Name: categoria_balance categoria_balance_padre_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_balance
    ADD CONSTRAINT categoria_balance_padre_id_fkey FOREIGN KEY (padre_id) REFERENCES medico.categoria_balance(categoria_balance_id);


--
-- TOC entry 7428 (class 2606 OID 17147)
-- Name: categoria_examen categoria_examen_padre_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_examen
    ADD CONSTRAINT categoria_examen_padre_id_fkey FOREIGN KEY (padre_id) REFERENCES medico.categoria_examen(categoria_examen_id);


--
-- TOC entry 7426 (class 2606 OID 17023)
-- Name: categoria_producto categoria_producto_padre_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.categoria_producto
    ADD CONSTRAINT categoria_producto_padre_id_fkey FOREIGN KEY (padre_id) REFERENCES medico.categoria_producto(categoria_id);


--
-- TOC entry 7552 (class 2606 OID 18774)
-- Name: cie10_personalizado cie10_personalizado_cie10_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cie10_personalizado
    ADD CONSTRAINT cie10_personalizado_cie10_id_fkey FOREIGN KEY (cie10_id) REFERENCES medico.cie10(cie10_id);


--
-- TOC entry 7553 (class 2606 OID 18779)
-- Name: cie10_personalizado cie10_personalizado_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cie10_personalizado
    ADD CONSTRAINT cie10_personalizado_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7554 (class 2606 OID 18784)
-- Name: cie10_personalizado cie10_personalizado_personal_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cie10_personalizado
    ADD CONSTRAINT cie10_personalizado_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7483 (class 2606 OID 18243)
-- Name: cita cita_agenda_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cita
    ADD CONSTRAINT cita_agenda_id_fkey FOREIGN KEY (agenda_id) REFERENCES medico.agenda(agenda_id);


--
-- TOC entry 7484 (class 2606 OID 18263)
-- Name: cita cita_estado_cita_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cita
    ADD CONSTRAINT cita_estado_cita_id_fkey FOREIGN KEY (estado_cita_id) REFERENCES medico.estado_cita(estado_cita_id);


--
-- TOC entry 7485 (class 2606 OID 18258)
-- Name: cita cita_motivo_consulta_predefinido_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cita
    ADD CONSTRAINT cita_motivo_consulta_predefinido_id_fkey FOREIGN KEY (motivo_consulta_predefinido_id) REFERENCES medico.motivo_consulta_predefinido(motivo_consulta_id);


--
-- TOC entry 7486 (class 2606 OID 18248)
-- Name: cita cita_paciente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cita
    ADD CONSTRAINT cita_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES medico.paciente(paciente_id);


--
-- TOC entry 7487 (class 2606 OID 18268)
-- Name: cita cita_personal_registra_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cita
    ADD CONSTRAINT cita_personal_registra_id_fkey FOREIGN KEY (personal_registra_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7488 (class 2606 OID 18253)
-- Name: cita cita_tipo_cita_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.cita
    ADD CONSTRAINT cita_tipo_cita_id_fkey FOREIGN KEY (tipo_cita_id) REFERENCES medico.tipo_cita(tipo_cita_id);


--
-- TOC entry 7679 (class 2606 OID 20018)
-- Name: comprobante comprobante_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.comprobante
    ADD CONSTRAINT comprobante_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7680 (class 2606 OID 20038)
-- Name: comprobante comprobante_comprobante_referencia_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.comprobante
    ADD CONSTRAINT comprobante_comprobante_referencia_id_fkey FOREIGN KEY (comprobante_referencia_id) REFERENCES medico.comprobante(comprobante_id);


--
-- TOC entry 7681 (class 2606 OID 20033)
-- Name: comprobante comprobante_forma_pago_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.comprobante
    ADD CONSTRAINT comprobante_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES medico.forma_pago(forma_pago_id);


--
-- TOC entry 7682 (class 2606 OID 20028)
-- Name: comprobante comprobante_moneda_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.comprobante
    ADD CONSTRAINT comprobante_moneda_id_fkey FOREIGN KEY (moneda_id) REFERENCES medico.moneda(moneda_id);


--
-- TOC entry 7683 (class 2606 OID 20003)
-- Name: comprobante comprobante_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.comprobante
    ADD CONSTRAINT comprobante_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7684 (class 2606 OID 20013)
-- Name: comprobante comprobante_paciente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.comprobante
    ADD CONSTRAINT comprobante_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES medico.paciente(paciente_id);


--
-- TOC entry 7685 (class 2606 OID 20008)
-- Name: comprobante comprobante_tipo_comprobante_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.comprobante
    ADD CONSTRAINT comprobante_tipo_comprobante_id_fkey FOREIGN KEY (tipo_comprobante_id) REFERENCES medico.tipo_comprobante(tipo_comprobante_id);


--
-- TOC entry 7686 (class 2606 OID 20023)
-- Name: comprobante comprobante_tipo_documento_cliente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.comprobante
    ADD CONSTRAINT comprobante_tipo_documento_cliente_id_fkey FOREIGN KEY (tipo_documento_cliente_id) REFERENCES medico.tipo_documento(tipo_documento_id);


--
-- TOC entry 7719 (class 2606 OID 20394)
-- Name: concepto_planilla_personal concepto_planilla_personal_concepto_planilla_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.concepto_planilla_personal
    ADD CONSTRAINT concepto_planilla_personal_concepto_planilla_id_fkey FOREIGN KEY (concepto_planilla_id) REFERENCES medico.concepto_planilla(concepto_planilla_id);


--
-- TOC entry 7720 (class 2606 OID 20389)
-- Name: concepto_planilla_personal concepto_planilla_personal_detalle_planilla_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.concepto_planilla_personal
    ADD CONSTRAINT concepto_planilla_personal_detalle_planilla_id_fkey FOREIGN KEY (detalle_planilla_id) REFERENCES medico.detalle_planilla(detalle_planilla_id);


--
-- TOC entry 7813 (class 2606 OID 21626)
-- Name: configuracion_sistema configuracion_sistema_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.configuracion_sistema
    ADD CONSTRAINT configuracion_sistema_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7814 (class 2606 OID 21631)
-- Name: configuracion_sistema configuracion_sistema_usuario_modifica_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.configuracion_sistema
    ADD CONSTRAINT configuracion_sistema_usuario_modifica_id_fkey FOREIGN KEY (usuario_modifica_id) REFERENCES medico.usuario(usuario_id);


--
-- TOC entry 7801 (class 2606 OID 21485)
-- Name: consentimiento_informado consentimiento_informado_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.consentimiento_informado
    ADD CONSTRAINT consentimiento_informado_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7802 (class 2606 OID 21480)
-- Name: consentimiento_informado consentimiento_informado_paciente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.consentimiento_informado
    ADD CONSTRAINT consentimiento_informado_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES medico.paciente(paciente_id);


--
-- TOC entry 7803 (class 2606 OID 21495)
-- Name: consentimiento_informado consentimiento_informado_personal_informa_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.consentimiento_informado
    ADD CONSTRAINT consentimiento_informado_personal_informa_id_fkey FOREIGN KEY (personal_informa_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7804 (class 2606 OID 21490)
-- Name: consentimiento_informado consentimiento_informado_tipo_consentimiento_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.consentimiento_informado
    ADD CONSTRAINT consentimiento_informado_tipo_consentimiento_id_fkey FOREIGN KEY (tipo_consentimiento_id) REFERENCES medico.tipo_consentimiento(tipo_consentimiento_id);


--
-- TOC entry 7471 (class 2606 OID 18093)
-- Name: consultorio consultorio_sede_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.consultorio
    ADD CONSTRAINT consultorio_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES medico.sede(sede_id);


--
-- TOC entry 7472 (class 2606 OID 18098)
-- Name: consultorio consultorio_tipo_consultorio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.consultorio
    ADD CONSTRAINT consultorio_tipo_consultorio_id_fkey FOREIGN KEY (tipo_consultorio_id) REFERENCES medico.tipo_consultorio(tipo_consultorio_id);


--
-- TOC entry 7748 (class 2606 OID 20758)
-- Name: criterio_auditoria criterio_auditoria_tipo_auditoria_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.criterio_auditoria
    ADD CONSTRAINT criterio_auditoria_tipo_auditoria_id_fkey FOREIGN KEY (tipo_auditoria_id) REFERENCES medico.tipo_auditoria(tipo_auditoria_id);


--
-- TOC entry 7769 (class 2606 OID 21058)
-- Name: dashboard_rol dashboard_rol_dashboard_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.dashboard_rol
    ADD CONSTRAINT dashboard_rol_dashboard_id_fkey FOREIGN KEY (dashboard_id) REFERENCES medico.dashboard_gerencial(dashboard_id);


--
-- TOC entry 7770 (class 2606 OID 21063)
-- Name: dashboard_rol dashboard_rol_rol_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.dashboard_rol
    ADD CONSTRAINT dashboard_rol_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES medico.rol(rol_id);


--
-- TOC entry 7755 (class 2606 OID 20849)
-- Name: detalle_auditoria detalle_auditoria_auditoria_hc_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_auditoria
    ADD CONSTRAINT detalle_auditoria_auditoria_hc_id_fkey FOREIGN KEY (auditoria_hc_id) REFERENCES medico.auditoria_hc(auditoria_hc_id);


--
-- TOC entry 7756 (class 2606 OID 20854)
-- Name: detalle_auditoria detalle_auditoria_criterio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_auditoria
    ADD CONSTRAINT detalle_auditoria_criterio_id_fkey FOREIGN KEY (criterio_id) REFERENCES medico.criterio_auditoria(criterio_id);


--
-- TOC entry 7757 (class 2606 OID 20864)
-- Name: detalle_auditoria detalle_auditoria_opcion_cumplimiento_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_auditoria
    ADD CONSTRAINT detalle_auditoria_opcion_cumplimiento_id_fkey FOREIGN KEY (opcion_cumplimiento_id) REFERENCES medico.opcion_cumplimiento(opcion_cumplimiento_id);


--
-- TOC entry 7758 (class 2606 OID 20859)
-- Name: detalle_auditoria detalle_auditoria_subcriterio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_auditoria
    ADD CONSTRAINT detalle_auditoria_subcriterio_id_fkey FOREIGN KEY (subcriterio_id) REFERENCES medico.subcriterio_auditoria(subcriterio_id);


--
-- TOC entry 7734 (class 2606 OID 20572)
-- Name: detalle_balance detalle_balance_balance_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_balance
    ADD CONSTRAINT detalle_balance_balance_id_fkey FOREIGN KEY (balance_id) REFERENCES medico.balance(balance_id);


--
-- TOC entry 7735 (class 2606 OID 20577)
-- Name: detalle_balance detalle_balance_categoria_balance_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_balance
    ADD CONSTRAINT detalle_balance_categoria_balance_id_fkey FOREIGN KEY (categoria_balance_id) REFERENCES medico.categoria_balance(categoria_balance_id);


--
-- TOC entry 7736 (class 2606 OID 20582)
-- Name: detalle_balance detalle_balance_subcategoria_balance_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_balance
    ADD CONSTRAINT detalle_balance_subcategoria_balance_id_fkey FOREIGN KEY (subcategoria_balance_id) REFERENCES medico.subcategoria_balance(subcategoria_balance_id);


--
-- TOC entry 7687 (class 2606 OID 20077)
-- Name: detalle_comprobante detalle_comprobante_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_comprobante
    ADD CONSTRAINT detalle_comprobante_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7688 (class 2606 OID 20067)
-- Name: detalle_comprobante detalle_comprobante_comprobante_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_comprobante
    ADD CONSTRAINT detalle_comprobante_comprobante_id_fkey FOREIGN KEY (comprobante_id) REFERENCES medico.comprobante(comprobante_id);


--
-- TOC entry 7689 (class 2606 OID 20072)
-- Name: detalle_comprobante detalle_comprobante_concepto_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_comprobante
    ADD CONSTRAINT detalle_comprobante_concepto_id_fkey FOREIGN KEY (concepto_id) REFERENCES medico.concepto_facturacion(concepto_id);


--
-- TOC entry 7690 (class 2606 OID 20087)
-- Name: detalle_comprobante detalle_comprobante_detalle_dispensacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_comprobante
    ADD CONSTRAINT detalle_comprobante_detalle_dispensacion_id_fkey FOREIGN KEY (detalle_dispensacion_id) REFERENCES medico.detalle_dispensacion(detalle_dispensacion_id);


--
-- TOC entry 7691 (class 2606 OID 20092)
-- Name: detalle_comprobante detalle_comprobante_detalle_solicitud_examen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_comprobante
    ADD CONSTRAINT detalle_comprobante_detalle_solicitud_examen_id_fkey FOREIGN KEY (detalle_solicitud_examen_id) REFERENCES medico.detalle_solicitud_examen(detalle_solicitud_id);


--
-- TOC entry 7692 (class 2606 OID 20097)
-- Name: detalle_comprobante detalle_comprobante_hospitalizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_comprobante
    ADD CONSTRAINT detalle_comprobante_hospitalizacion_id_fkey FOREIGN KEY (hospitalizacion_id) REFERENCES medico.hospitalizacion(hospitalizacion_id);


--
-- TOC entry 7693 (class 2606 OID 20102)
-- Name: detalle_comprobante detalle_comprobante_producto_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_comprobante
    ADD CONSTRAINT detalle_comprobante_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES medico.producto(producto_id);


--
-- TOC entry 7694 (class 2606 OID 20082)
-- Name: detalle_comprobante detalle_comprobante_servicio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_comprobante
    ADD CONSTRAINT detalle_comprobante_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES medico.servicio_medico(servicio_id);


--
-- TOC entry 7695 (class 2606 OID 20107)
-- Name: detalle_comprobante detalle_comprobante_unidad_medida_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_comprobante
    ADD CONSTRAINT detalle_comprobante_unidad_medida_id_fkey FOREIGN KEY (unidad_medida_id) REFERENCES medico.unidad_medida_general(unidad_medida_id);


--
-- TOC entry 7640 (class 2606 OID 19583)
-- Name: detalle_dispensacion detalle_dispensacion_detalle_receta_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_dispensacion
    ADD CONSTRAINT detalle_dispensacion_detalle_receta_id_fkey FOREIGN KEY (detalle_receta_id) REFERENCES medico.detalle_receta(detalle_receta_id);


--
-- TOC entry 7641 (class 2606 OID 19578)
-- Name: detalle_dispensacion detalle_dispensacion_dispensacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_dispensacion
    ADD CONSTRAINT detalle_dispensacion_dispensacion_id_fkey FOREIGN KEY (dispensacion_id) REFERENCES medico.dispensacion(dispensacion_id);


--
-- TOC entry 7642 (class 2606 OID 19588)
-- Name: detalle_dispensacion detalle_dispensacion_lote_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_dispensacion
    ADD CONSTRAINT detalle_dispensacion_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES medico.lote_producto(lote_id);


--
-- TOC entry 7533 (class 2606 OID 18615)
-- Name: detalle_examen_fisico detalle_examen_fisico_examen_fisico_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_examen_fisico
    ADD CONSTRAINT detalle_examen_fisico_examen_fisico_id_fkey FOREIGN KEY (examen_fisico_id) REFERENCES medico.examen_fisico(examen_fisico_id);


--
-- TOC entry 7534 (class 2606 OID 18620)
-- Name: detalle_examen_fisico detalle_examen_fisico_sistema_corporal_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_examen_fisico
    ADD CONSTRAINT detalle_examen_fisico_sistema_corporal_id_fkey FOREIGN KEY (sistema_corporal_id) REFERENCES medico.sistema_corporal(sistema_corporal_id);


--
-- TOC entry 7624 (class 2606 OID 19426)
-- Name: detalle_movimiento_almacen detalle_movimiento_almacen_lote_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_movimiento_almacen
    ADD CONSTRAINT detalle_movimiento_almacen_lote_id_fkey FOREIGN KEY (lote_id) REFERENCES medico.lote_producto(lote_id);


--
-- TOC entry 7625 (class 2606 OID 19421)
-- Name: detalle_movimiento_almacen detalle_movimiento_almacen_movimiento_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_movimiento_almacen
    ADD CONSTRAINT detalle_movimiento_almacen_movimiento_id_fkey FOREIGN KEY (movimiento_id) REFERENCES medico.movimiento_almacen(movimiento_id);


--
-- TOC entry 7717 (class 2606 OID 20362)
-- Name: detalle_planilla detalle_planilla_periodo_planilla_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_planilla
    ADD CONSTRAINT detalle_planilla_periodo_planilla_id_fkey FOREIGN KEY (periodo_planilla_id) REFERENCES medico.periodo_planilla(periodo_planilla_id);


--
-- TOC entry 7718 (class 2606 OID 20367)
-- Name: detalle_planilla detalle_planilla_personal_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_planilla
    ADD CONSTRAINT detalle_planilla_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7631 (class 2606 OID 19501)
-- Name: detalle_receta detalle_receta_diagnostico_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_receta
    ADD CONSTRAINT detalle_receta_diagnostico_atencion_id_fkey FOREIGN KEY (diagnostico_atencion_id) REFERENCES medico.diagnostico_atencion(diagnostico_atencion_id);


--
-- TOC entry 7632 (class 2606 OID 19506)
-- Name: detalle_receta detalle_receta_producto_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_receta
    ADD CONSTRAINT detalle_receta_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES medico.producto(producto_id);


--
-- TOC entry 7633 (class 2606 OID 19496)
-- Name: detalle_receta detalle_receta_receta_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_receta
    ADD CONSTRAINT detalle_receta_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES medico.receta(receta_id);


--
-- TOC entry 7634 (class 2606 OID 19516)
-- Name: detalle_receta detalle_receta_unidad_medida_farmacia_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_receta
    ADD CONSTRAINT detalle_receta_unidad_medida_farmacia_id_fkey FOREIGN KEY (unidad_medida_farmacia_id) REFERENCES medico.unidad_medida_farmacia(unidad_medida_farmacia_id);


--
-- TOC entry 7635 (class 2606 OID 19511)
-- Name: detalle_receta detalle_receta_via_administracion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_receta
    ADD CONSTRAINT detalle_receta_via_administracion_id_fkey FOREIGN KEY (via_administracion_id) REFERENCES medico.via_administracion(via_administracion_id);


--
-- TOC entry 7651 (class 2606 OID 19702)
-- Name: detalle_solicitud_examen detalle_solicitud_examen_diagnostico_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_solicitud_examen
    ADD CONSTRAINT detalle_solicitud_examen_diagnostico_atencion_id_fkey FOREIGN KEY (diagnostico_atencion_id) REFERENCES medico.diagnostico_atencion(diagnostico_atencion_id);


--
-- TOC entry 7652 (class 2606 OID 19707)
-- Name: detalle_solicitud_examen detalle_solicitud_examen_estado_solicitud_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_solicitud_examen
    ADD CONSTRAINT detalle_solicitud_examen_estado_solicitud_id_fkey FOREIGN KEY (estado_solicitud_id) REFERENCES medico.estado_solicitud_examen(estado_solicitud_id);


--
-- TOC entry 7653 (class 2606 OID 19692)
-- Name: detalle_solicitud_examen detalle_solicitud_examen_solicitud_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_solicitud_examen
    ADD CONSTRAINT detalle_solicitud_examen_solicitud_id_fkey FOREIGN KEY (solicitud_id) REFERENCES medico.solicitud_examen(solicitud_id);


--
-- TOC entry 7654 (class 2606 OID 19697)
-- Name: detalle_solicitud_examen detalle_solicitud_examen_tipo_examen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_solicitud_examen
    ADD CONSTRAINT detalle_solicitud_examen_tipo_examen_id_fkey FOREIGN KEY (tipo_examen_id) REFERENCES medico.tipo_examen(tipo_examen_id);


--
-- TOC entry 7746 (class 2606 OID 20734)
-- Name: detalle_trama_atencion detalle_trama_atencion_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_trama_atencion
    ADD CONSTRAINT detalle_trama_atencion_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7747 (class 2606 OID 20729)
-- Name: detalle_trama_atencion detalle_trama_atencion_trama_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.detalle_trama_atencion
    ADD CONSTRAINT detalle_trama_atencion_trama_id_fkey FOREIGN KEY (trama_id) REFERENCES medico.trama_susalud(trama_id);


--
-- TOC entry 7555 (class 2606 OID 18804)
-- Name: diagnostico_atencion diagnostico_atencion_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.diagnostico_atencion
    ADD CONSTRAINT diagnostico_atencion_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7556 (class 2606 OID 18814)
-- Name: diagnostico_atencion diagnostico_atencion_cie10_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.diagnostico_atencion
    ADD CONSTRAINT diagnostico_atencion_cie10_id_fkey FOREIGN KEY (cie10_id) REFERENCES medico.cie10(cie10_id);


--
-- TOC entry 7557 (class 2606 OID 18819)
-- Name: diagnostico_atencion diagnostico_atencion_cie10_personalizado_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.diagnostico_atencion
    ADD CONSTRAINT diagnostico_atencion_cie10_personalizado_id_fkey FOREIGN KEY (cie10_personalizado_id) REFERENCES medico.cie10_personalizado(cie10_personalizado_id);


--
-- TOC entry 7558 (class 2606 OID 18809)
-- Name: diagnostico_atencion diagnostico_atencion_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.diagnostico_atencion
    ADD CONSTRAINT diagnostico_atencion_episodio_id_fkey FOREIGN KEY (episodio_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7559 (class 2606 OID 18829)
-- Name: diagnostico_atencion diagnostico_atencion_orden_diagnostico_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.diagnostico_atencion
    ADD CONSTRAINT diagnostico_atencion_orden_diagnostico_id_fkey FOREIGN KEY (orden_diagnostico_id) REFERENCES medico.orden_diagnostico(orden_diagnostico_id);


--
-- TOC entry 7560 (class 2606 OID 18824)
-- Name: diagnostico_atencion diagnostico_atencion_tipo_diagnostico_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.diagnostico_atencion
    ADD CONSTRAINT diagnostico_atencion_tipo_diagnostico_id_fkey FOREIGN KEY (tipo_diagnostico_id) REFERENCES medico.tipo_diagnostico(tipo_diagnostico_id);


--
-- TOC entry 7636 (class 2606 OID 19546)
-- Name: dispensacion dispensacion_almacen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.dispensacion
    ADD CONSTRAINT dispensacion_almacen_id_fkey FOREIGN KEY (almacen_id) REFERENCES medico.almacen(almacen_id);


--
-- TOC entry 7637 (class 2606 OID 19556)
-- Name: dispensacion dispensacion_movimiento_almacen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.dispensacion
    ADD CONSTRAINT dispensacion_movimiento_almacen_id_fkey FOREIGN KEY (movimiento_almacen_id) REFERENCES medico.movimiento_almacen(movimiento_id);


--
-- TOC entry 7638 (class 2606 OID 19551)
-- Name: dispensacion dispensacion_personal_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.dispensacion
    ADD CONSTRAINT dispensacion_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7639 (class 2606 OID 19541)
-- Name: dispensacion dispensacion_receta_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.dispensacion
    ADD CONSTRAINT dispensacion_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES medico.receta(receta_id);


--
-- TOC entry 7805 (class 2606 OID 21530)
-- Name: documento_clinico documento_clinico_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.documento_clinico
    ADD CONSTRAINT documento_clinico_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7806 (class 2606 OID 21525)
-- Name: documento_clinico documento_clinico_paciente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.documento_clinico
    ADD CONSTRAINT documento_clinico_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES medico.paciente(paciente_id);


--
-- TOC entry 7807 (class 2606 OID 21535)
-- Name: documento_clinico documento_clinico_personal_genera_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.documento_clinico
    ADD CONSTRAINT documento_clinico_personal_genera_id_fkey FOREIGN KEY (personal_genera_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7549 (class 2606 OID 18746)
-- Name: ejecucion_indicacion ejecucion_indicacion_indicacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.ejecucion_indicacion
    ADD CONSTRAINT ejecucion_indicacion_indicacion_id_fkey FOREIGN KEY (indicacion_id) REFERENCES medico.indicacion_medica(indicacion_id);


--
-- TOC entry 7550 (class 2606 OID 18751)
-- Name: ejecucion_indicacion ejecucion_indicacion_personal_ejecuta_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.ejecucion_indicacion
    ADD CONSTRAINT ejecucion_indicacion_personal_ejecuta_id_fkey FOREIGN KEY (personal_ejecuta_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7766 (class 2606 OID 20996)
-- Name: ejecucion_reporte ejecucion_reporte_reporte_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.ejecucion_reporte
    ADD CONSTRAINT ejecucion_reporte_reporte_id_fkey FOREIGN KEY (reporte_id) REFERENCES medico.reporte_configuracion(reporte_id);


--
-- TOC entry 7767 (class 2606 OID 21001)
-- Name: ejecucion_reporte ejecucion_reporte_usuario_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.ejecucion_reporte
    ADD CONSTRAINT ejecucion_reporte_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES medico.usuario(usuario_id);


--
-- TOC entry 7791 (class 2606 OID 21284)
-- Name: entrenamiento_modelo entrenamiento_modelo_modelo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.entrenamiento_modelo
    ADD CONSTRAINT entrenamiento_modelo_modelo_id_fkey FOREIGN KEY (modelo_id) REFERENCES medico.modelo_ia(modelo_id);


--
-- TOC entry 7792 (class 2606 OID 21289)
-- Name: entrenamiento_modelo entrenamiento_modelo_personal_responsable_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.entrenamiento_modelo
    ADD CONSTRAINT entrenamiento_modelo_personal_responsable_id_fkey FOREIGN KEY (personal_responsable_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7501 (class 2606 OID 18371)
-- Name: episodio_clinico episodio_clinico_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.episodio_clinico
    ADD CONSTRAINT episodio_clinico_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7502 (class 2606 OID 18386)
-- Name: episodio_clinico episodio_clinico_cama_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.episodio_clinico
    ADD CONSTRAINT episodio_clinico_cama_id_fkey FOREIGN KEY (cama_id) REFERENCES medico.cama(cama_id);


--
-- TOC entry 7503 (class 2606 OID 18396)
-- Name: episodio_clinico episodio_clinico_diagnostico_ingreso_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.episodio_clinico
    ADD CONSTRAINT episodio_clinico_diagnostico_ingreso_episodio_id_fkey FOREIGN KEY (diagnostico_ingreso_episodio_id) REFERENCES medico.cie10(cie10_id);


--
-- TOC entry 7504 (class 2606 OID 18401)
-- Name: episodio_clinico episodio_clinico_diagnostico_salida_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.episodio_clinico
    ADD CONSTRAINT episodio_clinico_diagnostico_salida_episodio_id_fkey FOREIGN KEY (diagnostico_salida_episodio_id) REFERENCES medico.cie10(cie10_id);


--
-- TOC entry 7505 (class 2606 OID 18411)
-- Name: episodio_clinico episodio_clinico_episodio_origen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.episodio_clinico
    ADD CONSTRAINT episodio_clinico_episodio_origen_id_fkey FOREIGN KEY (episodio_origen_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7506 (class 2606 OID 18406)
-- Name: episodio_clinico episodio_clinico_estado_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.episodio_clinico
    ADD CONSTRAINT episodio_clinico_estado_episodio_id_fkey FOREIGN KEY (estado_episodio_id) REFERENCES medico.estado_episodio(estado_episodio_id);


--
-- TOC entry 7507 (class 2606 OID 18391)
-- Name: episodio_clinico episodio_clinico_personal_responsable_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.episodio_clinico
    ADD CONSTRAINT episodio_clinico_personal_responsable_id_fkey FOREIGN KEY (personal_responsable_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7508 (class 2606 OID 18381)
-- Name: episodio_clinico episodio_clinico_servicio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.episodio_clinico
    ADD CONSTRAINT episodio_clinico_servicio_id_fkey FOREIGN KEY (servicio_id) REFERENCES medico.servicio_medico(servicio_id);


--
-- TOC entry 7509 (class 2606 OID 18376)
-- Name: episodio_clinico episodio_clinico_tipo_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.episodio_clinico
    ADD CONSTRAINT episodio_clinico_tipo_episodio_id_fkey FOREIGN KEY (tipo_episodio_id) REFERENCES medico.tipo_episodio(tipo_episodio_id);


--
-- TOC entry 7535 (class 2606 OID 18646)
-- Name: evolucion_clinica evolucion_clinica_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.evolucion_clinica
    ADD CONSTRAINT evolucion_clinica_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7536 (class 2606 OID 18651)
-- Name: evolucion_clinica evolucion_clinica_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.evolucion_clinica
    ADD CONSTRAINT evolucion_clinica_episodio_id_fkey FOREIGN KEY (episodio_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7537 (class 2606 OID 18661)
-- Name: evolucion_clinica evolucion_clinica_especialidad_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.evolucion_clinica
    ADD CONSTRAINT evolucion_clinica_especialidad_id_fkey FOREIGN KEY (especialidad_id) REFERENCES medico.especialidad_medica(especialidad_id);


--
-- TOC entry 7538 (class 2606 OID 18671)
-- Name: evolucion_clinica evolucion_clinica_examen_fisico_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.evolucion_clinica
    ADD CONSTRAINT evolucion_clinica_examen_fisico_id_fkey FOREIGN KEY (examen_fisico_id) REFERENCES medico.examen_fisico(examen_fisico_id);


--
-- TOC entry 7539 (class 2606 OID 18656)
-- Name: evolucion_clinica evolucion_clinica_personal_evoluciona_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.evolucion_clinica
    ADD CONSTRAINT evolucion_clinica_personal_evoluciona_id_fkey FOREIGN KEY (personal_evoluciona_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7540 (class 2606 OID 18666)
-- Name: evolucion_clinica evolucion_clinica_registro_signos_vitales_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.evolucion_clinica
    ADD CONSTRAINT evolucion_clinica_registro_signos_vitales_id_fkey FOREIGN KEY (registro_signos_vitales_id) REFERENCES medico.registro_signos_vitales(registro_signos_id);


--
-- TOC entry 7541 (class 2606 OID 18641)
-- Name: evolucion_clinica evolucion_clinica_tipo_evolucion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.evolucion_clinica
    ADD CONSTRAINT evolucion_clinica_tipo_evolucion_id_fkey FOREIGN KEY (tipo_evolucion_id) REFERENCES medico.tipo_evolucion(tipo_evolucion_id);


--
-- TOC entry 7529 (class 2606 OID 18585)
-- Name: examen_fisico examen_fisico_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_fisico
    ADD CONSTRAINT examen_fisico_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7530 (class 2606 OID 18590)
-- Name: examen_fisico examen_fisico_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_fisico
    ADD CONSTRAINT examen_fisico_episodio_id_fkey FOREIGN KEY (episodio_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7531 (class 2606 OID 18595)
-- Name: examen_fisico examen_fisico_personal_examina_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_fisico
    ADD CONSTRAINT examen_fisico_personal_examina_id_fkey FOREIGN KEY (personal_examina_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7532 (class 2606 OID 18580)
-- Name: examen_fisico examen_fisico_tipo_examen_fisico_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_fisico
    ADD CONSTRAINT examen_fisico_tipo_examen_fisico_id_fkey FOREIGN KEY (tipo_examen_fisico_id) REFERENCES medico.tipo_examen_fisico(tipo_examen_fisico_id);


--
-- TOC entry 7671 (class 2606 OID 19899)
-- Name: examen_imagen examen_imagen_detalle_solicitud_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_imagen
    ADD CONSTRAINT examen_imagen_detalle_solicitud_id_fkey FOREIGN KEY (detalle_solicitud_id) REFERENCES medico.detalle_solicitud_examen(detalle_solicitud_id);


--
-- TOC entry 7672 (class 2606 OID 19904)
-- Name: examen_imagen examen_imagen_personal_realiza_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_imagen
    ADD CONSTRAINT examen_imagen_personal_realiza_id_fkey FOREIGN KEY (personal_realiza_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7673 (class 2606 OID 19909)
-- Name: examen_imagen examen_imagen_tipo_equipo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_imagen
    ADD CONSTRAINT examen_imagen_tipo_equipo_id_fkey FOREIGN KEY (tipo_equipo_id) REFERENCES medico.tipo_equipo_laboratorio(tipo_equipo_id);


--
-- TOC entry 7658 (class 2606 OID 19763)
-- Name: examen_laboratorio examen_laboratorio_detalle_solicitud_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_laboratorio
    ADD CONSTRAINT examen_laboratorio_detalle_solicitud_id_fkey FOREIGN KEY (detalle_solicitud_id) REFERENCES medico.detalle_solicitud_examen(detalle_solicitud_id);


--
-- TOC entry 7659 (class 2606 OID 19788)
-- Name: examen_laboratorio examen_laboratorio_estado_resultado_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_laboratorio
    ADD CONSTRAINT examen_laboratorio_estado_resultado_id_fkey FOREIGN KEY (estado_resultado_id) REFERENCES medico.estado_resultado_laboratorio(estado_resultado_id);


--
-- TOC entry 7660 (class 2606 OID 19783)
-- Name: examen_laboratorio examen_laboratorio_metodo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_laboratorio
    ADD CONSTRAINT examen_laboratorio_metodo_id_fkey FOREIGN KEY (metodo_id) REFERENCES medico.metodo_examen(metodo_id);


--
-- TOC entry 7661 (class 2606 OID 19768)
-- Name: examen_laboratorio examen_laboratorio_muestra_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_laboratorio
    ADD CONSTRAINT examen_laboratorio_muestra_id_fkey FOREIGN KEY (muestra_id) REFERENCES medico.muestra_laboratorio(muestra_id);


--
-- TOC entry 7662 (class 2606 OID 19773)
-- Name: examen_laboratorio examen_laboratorio_personal_procesa_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_laboratorio
    ADD CONSTRAINT examen_laboratorio_personal_procesa_id_fkey FOREIGN KEY (personal_procesa_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7663 (class 2606 OID 19778)
-- Name: examen_laboratorio examen_laboratorio_tipo_equipo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.examen_laboratorio
    ADD CONSTRAINT examen_laboratorio_tipo_equipo_id_fkey FOREIGN KEY (tipo_equipo_id) REFERENCES medico.tipo_equipo_laboratorio(tipo_equipo_id);


--
-- TOC entry 7500 (class 2606 OID 21861)
-- Name: atencion fk_atencion_cita; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.atencion
    ADD CONSTRAINT fk_atencion_cita FOREIGN KEY (cita_id) REFERENCES medico.cita(cita_id);


--
-- TOC entry 7551 (class 2606 OID 21666)
-- Name: ejecucion_indicacion fk_ejecucion_indicacion_lote; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.ejecucion_indicacion
    ADD CONSTRAINT fk_ejecucion_indicacion_lote FOREIGN KEY (lote_id) REFERENCES medico.lote_producto(lote_id);


--
-- TOC entry 7706 (class 2606 OID 21661)
-- Name: movimiento_caja fk_movimiento_caja_pago_servicio; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_caja
    ADD CONSTRAINT fk_movimiento_caja_pago_servicio FOREIGN KEY (pago_servicio_id) REFERENCES medico.pago_servicio(pago_servicio_id);


--
-- TOC entry 7441 (class 2606 OID 21641)
-- Name: paciente fk_paciente_medico_cabecera; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente
    ADD CONSTRAINT fk_paciente_medico_cabecera FOREIGN KEY (medico_cabecera_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7432 (class 2606 OID 21636)
-- Name: sede fk_sede_responsable; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sede
    ADD CONSTRAINT fk_sede_responsable FOREIGN KEY (responsable_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7466 (class 2606 OID 21651)
-- Name: usuario fk_usuario_actualizacion; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.usuario
    ADD CONSTRAINT fk_usuario_actualizacion FOREIGN KEY (usuario_actualizacion_id) REFERENCES medico.usuario(usuario_id);


--
-- TOC entry 7467 (class 2606 OID 21646)
-- Name: usuario fk_usuario_creacion; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.usuario
    ADD CONSTRAINT fk_usuario_creacion FOREIGN KEY (usuario_creacion_id) REFERENCES medico.usuario(usuario_id);


--
-- TOC entry 7468 (class 2606 OID 21656)
-- Name: usuario fk_usuario_eliminacion; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.usuario
    ADD CONSTRAINT fk_usuario_eliminacion FOREIGN KEY (usuario_eliminacion_id) REFERENCES medico.usuario(usuario_id);


--
-- TOC entry 7572 (class 2606 OID 18954)
-- Name: historia_clinica_ambulatoria historia_clinica_ambulatoria_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_ambulatoria
    ADD CONSTRAINT historia_clinica_ambulatoria_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7573 (class 2606 OID 18959)
-- Name: historia_clinica_ambulatoria historia_clinica_ambulatoria_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_ambulatoria
    ADD CONSTRAINT historia_clinica_ambulatoria_episodio_id_fkey FOREIGN KEY (episodio_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7574 (class 2606 OID 18969)
-- Name: historia_clinica_ambulatoria historia_clinica_ambulatoria_examen_fisico_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_ambulatoria
    ADD CONSTRAINT historia_clinica_ambulatoria_examen_fisico_id_fkey FOREIGN KEY (examen_fisico_id) REFERENCES medico.examen_fisico(examen_fisico_id);


--
-- TOC entry 7575 (class 2606 OID 18964)
-- Name: historia_clinica_ambulatoria historia_clinica_ambulatoria_registro_signos_vitales_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_ambulatoria
    ADD CONSTRAINT historia_clinica_ambulatoria_registro_signos_vitales_id_fkey FOREIGN KEY (registro_signos_vitales_id) REFERENCES medico.registro_signos_vitales(registro_signos_id);


--
-- TOC entry 7576 (class 2606 OID 19015)
-- Name: historia_clinica_emergencia historia_clinica_emergencia_acompañante_parentesco_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_emergencia
    ADD CONSTRAINT "historia_clinica_emergencia_acompañante_parentesco_id_fkey" FOREIGN KEY ("acompañante_parentesco_id") REFERENCES medico.parentesco(parentesco_id);


--
-- TOC entry 7577 (class 2606 OID 18990)
-- Name: historia_clinica_emergencia historia_clinica_emergencia_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_emergencia
    ADD CONSTRAINT historia_clinica_emergencia_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7578 (class 2606 OID 19025)
-- Name: historia_clinica_emergencia historia_clinica_emergencia_diagnostico_salida_emergencia__fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_emergencia
    ADD CONSTRAINT historia_clinica_emergencia_diagnostico_salida_emergencia__fkey FOREIGN KEY (diagnostico_salida_emergencia_id) REFERENCES medico.cie10(cie10_id);


--
-- TOC entry 7579 (class 2606 OID 18995)
-- Name: historia_clinica_emergencia historia_clinica_emergencia_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_emergencia
    ADD CONSTRAINT historia_clinica_emergencia_episodio_id_fkey FOREIGN KEY (episodio_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7580 (class 2606 OID 19005)
-- Name: historia_clinica_emergencia historia_clinica_emergencia_forma_llegada_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_emergencia
    ADD CONSTRAINT historia_clinica_emergencia_forma_llegada_id_fkey FOREIGN KEY (forma_llegada_id) REFERENCES medico.forma_llegada(forma_llegada_id);


--
-- TOC entry 7581 (class 2606 OID 19030)
-- Name: historia_clinica_emergencia historia_clinica_emergencia_personal_alta_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_emergencia
    ADD CONSTRAINT historia_clinica_emergencia_personal_alta_id_fkey FOREIGN KEY (personal_alta_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7582 (class 2606 OID 19010)
-- Name: historia_clinica_emergencia historia_clinica_emergencia_prioridad_triaje_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_emergencia
    ADD CONSTRAINT historia_clinica_emergencia_prioridad_triaje_id_fkey FOREIGN KEY (prioridad_triaje_id) REFERENCES medico.prioridad_triaje(prioridad_triaje_id);


--
-- TOC entry 7583 (class 2606 OID 19000)
-- Name: historia_clinica_emergencia historia_clinica_emergencia_registro_signos_vitales_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_emergencia
    ADD CONSTRAINT historia_clinica_emergencia_registro_signos_vitales_id_fkey FOREIGN KEY (registro_signos_vitales_id) REFERENCES medico.registro_signos_vitales(registro_signos_id);


--
-- TOC entry 7584 (class 2606 OID 19020)
-- Name: historia_clinica_emergencia historia_clinica_emergencia_servicio_destino_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_emergencia
    ADD CONSTRAINT historia_clinica_emergencia_servicio_destino_id_fkey FOREIGN KEY (servicio_destino_id) REFERENCES medico.servicio_medico(servicio_id);


--
-- TOC entry 7594 (class 2606 OID 19168)
-- Name: historia_clinica_hospitalizacion historia_clinica_hospitalizac_diagnostico_alta_principal_i_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_hospitalizacion
    ADD CONSTRAINT historia_clinica_hospitalizac_diagnostico_alta_principal_i_fkey FOREIGN KEY (diagnostico_alta_principal_id) REFERENCES medico.cie10(cie10_id);


--
-- TOC entry 7595 (class 2606 OID 19163)
-- Name: historia_clinica_hospitalizacion historia_clinica_hospitalizac_personal_elabora_epicrisis_i_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_hospitalizacion
    ADD CONSTRAINT historia_clinica_hospitalizac_personal_elabora_epicrisis_i_fkey FOREIGN KEY (personal_elabora_epicrisis_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7596 (class 2606 OID 19148)
-- Name: historia_clinica_hospitalizacion historia_clinica_hospitalizac_registro_signos_vitales_ingr_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_hospitalizacion
    ADD CONSTRAINT historia_clinica_hospitalizac_registro_signos_vitales_ingr_fkey FOREIGN KEY (registro_signos_vitales_ingreso_id) REFERENCES medico.registro_signos_vitales(registro_signos_id);


--
-- TOC entry 7597 (class 2606 OID 19143)
-- Name: historia_clinica_hospitalizacion historia_clinica_hospitalizacion_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_hospitalizacion
    ADD CONSTRAINT historia_clinica_hospitalizacion_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7598 (class 2606 OID 19138)
-- Name: historia_clinica_hospitalizacion historia_clinica_hospitalizacion_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_hospitalizacion
    ADD CONSTRAINT historia_clinica_hospitalizacion_episodio_id_fkey FOREIGN KEY (episodio_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7599 (class 2606 OID 19153)
-- Name: historia_clinica_hospitalizacion historia_clinica_hospitalizacion_examen_fisico_ingreso_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_hospitalizacion
    ADD CONSTRAINT historia_clinica_hospitalizacion_examen_fisico_ingreso_id_fkey FOREIGN KEY (examen_fisico_ingreso_id) REFERENCES medico.examen_fisico(examen_fisico_id);


--
-- TOC entry 7600 (class 2606 OID 19133)
-- Name: historia_clinica_hospitalizacion historia_clinica_hospitalizacion_hospitalizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_hospitalizacion
    ADD CONSTRAINT historia_clinica_hospitalizacion_hospitalizacion_id_fkey FOREIGN KEY (hospitalizacion_id) REFERENCES medico.hospitalizacion(hospitalizacion_id);


--
-- TOC entry 7601 (class 2606 OID 19158)
-- Name: historia_clinica_hospitalizacion historia_clinica_hospitalizacion_via_ingreso_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.historia_clinica_hospitalizacion
    ADD CONSTRAINT historia_clinica_hospitalizacion_via_ingreso_id_fkey FOREIGN KEY (via_ingreso_id) REFERENCES medico.via_ingreso_hospitalario(via_ingreso_id);


--
-- TOC entry 7585 (class 2606 OID 19060)
-- Name: hospitalizacion hospitalizacion_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.hospitalizacion
    ADD CONSTRAINT hospitalizacion_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7586 (class 2606 OID 19070)
-- Name: hospitalizacion hospitalizacion_cama_actual_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.hospitalizacion
    ADD CONSTRAINT hospitalizacion_cama_actual_id_fkey FOREIGN KEY (cama_actual_id) REFERENCES medico.cama(cama_id);


--
-- TOC entry 7587 (class 2606 OID 19055)
-- Name: hospitalizacion hospitalizacion_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.hospitalizacion
    ADD CONSTRAINT hospitalizacion_episodio_id_fkey FOREIGN KEY (episodio_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7588 (class 2606 OID 19065)
-- Name: hospitalizacion hospitalizacion_paciente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.hospitalizacion
    ADD CONSTRAINT hospitalizacion_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES medico.paciente(paciente_id);


--
-- TOC entry 7589 (class 2606 OID 19075)
-- Name: hospitalizacion hospitalizacion_servicio_actual_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.hospitalizacion
    ADD CONSTRAINT hospitalizacion_servicio_actual_id_fkey FOREIGN KEY (servicio_actual_id) REFERENCES medico.servicio_medico(servicio_id);


--
-- TOC entry 7590 (class 2606 OID 19080)
-- Name: hospitalizacion hospitalizacion_tipo_alta_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.hospitalizacion
    ADD CONSTRAINT hospitalizacion_tipo_alta_id_fkey FOREIGN KEY (tipo_alta_id) REFERENCES medico.tipo_alta(tipo_alta_id);


--
-- TOC entry 7674 (class 2606 OID 19930)
-- Name: imagen_digital imagen_digital_examen_imagen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.imagen_digital
    ADD CONSTRAINT imagen_digital_examen_imagen_id_fkey FOREIGN KEY (examen_imagen_id) REFERENCES medico.examen_imagen(examen_imagen_id);


--
-- TOC entry 7675 (class 2606 OID 19935)
-- Name: imagen_digital imagen_digital_tipo_formato_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.imagen_digital
    ADD CONSTRAINT imagen_digital_tipo_formato_id_fkey FOREIGN KEY (tipo_formato_id) REFERENCES medico.tipo_formato_imagen(tipo_formato_id);


--
-- TOC entry 7542 (class 2606 OID 18699)
-- Name: indicacion_medica indicacion_medica_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicacion_medica
    ADD CONSTRAINT indicacion_medica_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7543 (class 2606 OID 18704)
-- Name: indicacion_medica indicacion_medica_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicacion_medica
    ADD CONSTRAINT indicacion_medica_episodio_id_fkey FOREIGN KEY (episodio_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7544 (class 2606 OID 18709)
-- Name: indicacion_medica indicacion_medica_evolucion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicacion_medica
    ADD CONSTRAINT indicacion_medica_evolucion_id_fkey FOREIGN KEY (evolucion_id) REFERENCES medico.evolucion_clinica(evolucion_id);


--
-- TOC entry 7545 (class 2606 OID 18714)
-- Name: indicacion_medica indicacion_medica_personal_indica_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicacion_medica
    ADD CONSTRAINT indicacion_medica_personal_indica_id_fkey FOREIGN KEY (personal_indica_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7546 (class 2606 OID 18724)
-- Name: indicacion_medica indicacion_medica_personal_suspende_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicacion_medica
    ADD CONSTRAINT indicacion_medica_personal_suspende_id_fkey FOREIGN KEY (personal_suspende_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7547 (class 2606 OID 18694)
-- Name: indicacion_medica indicacion_medica_tipo_indicacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicacion_medica
    ADD CONSTRAINT indicacion_medica_tipo_indicacion_id_fkey FOREIGN KEY (tipo_indicacion_id) REFERENCES medico.tipo_indicacion(tipo_indicacion_id);


--
-- TOC entry 7548 (class 2606 OID 18719)
-- Name: indicacion_medica indicacion_medica_via_administracion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicacion_medica
    ADD CONSTRAINT indicacion_medica_via_administracion_id_fkey FOREIGN KEY (via_administracion_id) REFERENCES medico.via_administracion(via_administracion_id);


--
-- TOC entry 7737 (class 2606 OID 20606)
-- Name: indicador_financiero indicador_financiero_periodo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicador_financiero
    ADD CONSTRAINT indicador_financiero_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES medico.periodo_contable(periodo_id);


--
-- TOC entry 7771 (class 2606 OID 21087)
-- Name: indicador_kpi indicador_kpi_widget_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.indicador_kpi
    ADD CONSTRAINT indicador_kpi_widget_id_fkey FOREIGN KEY (widget_id) REFERENCES medico.widget_dashboard(widget_id);


--
-- TOC entry 7676 (class 2606 OID 19967)
-- Name: informe_imagen informe_imagen_estado_resultado_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.informe_imagen
    ADD CONSTRAINT informe_imagen_estado_resultado_id_fkey FOREIGN KEY (estado_resultado_id) REFERENCES medico.estado_resultado_laboratorio(estado_resultado_id);


--
-- TOC entry 7677 (class 2606 OID 19957)
-- Name: informe_imagen informe_imagen_examen_imagen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.informe_imagen
    ADD CONSTRAINT informe_imagen_examen_imagen_id_fkey FOREIGN KEY (examen_imagen_id) REFERENCES medico.examen_imagen(examen_imagen_id);


--
-- TOC entry 7678 (class 2606 OID 19962)
-- Name: informe_imagen informe_imagen_personal_informa_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.informe_imagen
    ADD CONSTRAINT informe_imagen_personal_informa_id_fkey FOREIGN KEY (personal_informa_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7698 (class 2606 OID 20158)
-- Name: integracion_nubefact integracion_nubefact_comprobante_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.integracion_nubefact
    ADD CONSTRAINT integracion_nubefact_comprobante_id_fkey FOREIGN KEY (comprobante_id) REFERENCES medico.comprobante(comprobante_id);


--
-- TOC entry 7566 (class 2606 OID 18909)
-- Name: interconsulta interconsulta_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.interconsulta
    ADD CONSTRAINT interconsulta_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7567 (class 2606 OID 18914)
-- Name: interconsulta interconsulta_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.interconsulta
    ADD CONSTRAINT interconsulta_episodio_id_fkey FOREIGN KEY (episodio_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7568 (class 2606 OID 18924)
-- Name: interconsulta interconsulta_especialidad_solicitada_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.interconsulta
    ADD CONSTRAINT interconsulta_especialidad_solicitada_id_fkey FOREIGN KEY (especialidad_solicitada_id) REFERENCES medico.especialidad_medica(especialidad_id);


--
-- TOC entry 7569 (class 2606 OID 18934)
-- Name: interconsulta interconsulta_estado_interconsulta_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.interconsulta
    ADD CONSTRAINT interconsulta_estado_interconsulta_id_fkey FOREIGN KEY (estado_interconsulta_id) REFERENCES medico.estado_interconsulta(estado_interconsulta_id);


--
-- TOC entry 7570 (class 2606 OID 18929)
-- Name: interconsulta interconsulta_personal_interconsultor_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.interconsulta
    ADD CONSTRAINT interconsulta_personal_interconsultor_id_fkey FOREIGN KEY (personal_interconsultor_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7571 (class 2606 OID 18919)
-- Name: interconsulta interconsulta_personal_solicita_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.interconsulta
    ADD CONSTRAINT interconsulta_personal_solicita_id_fkey FOREIGN KEY (personal_solicita_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7810 (class 2606 OID 21605)
-- Name: log_acceso_hc log_acceso_hc_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.log_acceso_hc
    ADD CONSTRAINT log_acceso_hc_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7811 (class 2606 OID 21600)
-- Name: log_acceso_hc log_acceso_hc_paciente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.log_acceso_hc
    ADD CONSTRAINT log_acceso_hc_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES medico.paciente(paciente_id);


--
-- TOC entry 7812 (class 2606 OID 21595)
-- Name: log_acceso_hc log_acceso_hc_usuario_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.log_acceso_hc
    ADD CONSTRAINT log_acceso_hc_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES medico.usuario(usuario_id);


--
-- TOC entry 7809 (class 2606 OID 21574)
-- Name: log_acceso_sistema log_acceso_sistema_usuario_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.log_acceso_sistema
    ADD CONSTRAINT log_acceso_sistema_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES medico.usuario(usuario_id);


--
-- TOC entry 7808 (class 2606 OID 21555)
-- Name: log_auditoria_sistema log_auditoria_sistema_usuario_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.log_auditoria_sistema
    ADD CONSTRAINT log_auditoria_sistema_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES medico.usuario(usuario_id);


--
-- TOC entry 7793 (class 2606 OID 21313)
-- Name: log_ia log_ia_modelo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.log_ia
    ADD CONSTRAINT log_ia_modelo_id_fkey FOREIGN KEY (modelo_id) REFERENCES medico.modelo_ia(modelo_id);


--
-- TOC entry 7794 (class 2606 OID 21318)
-- Name: log_ia log_ia_usuario_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.log_ia
    ADD CONSTRAINT log_ia_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES medico.usuario(usuario_id);


--
-- TOC entry 7615 (class 2606 OID 19343)
-- Name: lote_producto lote_producto_almacen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.lote_producto
    ADD CONSTRAINT lote_producto_almacen_id_fkey FOREIGN KEY (almacen_id) REFERENCES medico.almacen(almacen_id);


--
-- TOC entry 7616 (class 2606 OID 19338)
-- Name: lote_producto lote_producto_producto_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.lote_producto
    ADD CONSTRAINT lote_producto_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES medico.producto(producto_id);


--
-- TOC entry 7617 (class 2606 OID 19348)
-- Name: lote_producto lote_producto_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.lote_producto
    ADD CONSTRAINT lote_producto_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES medico.proveedor(proveedor_id);


--
-- TOC entry 7800 (class 2606 OID 21457)
-- Name: mapeo_codigo mapeo_codigo_personal_registra_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.mapeo_codigo
    ADD CONSTRAINT mapeo_codigo_personal_registra_id_fkey FOREIGN KEY (personal_registra_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7591 (class 2606 OID 19107)
-- Name: medico_hospitalizacion medico_hospitalizacion_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.medico_hospitalizacion
    ADD CONSTRAINT medico_hospitalizacion_episodio_id_fkey FOREIGN KEY (episodio_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7592 (class 2606 OID 19102)
-- Name: medico_hospitalizacion medico_hospitalizacion_hospitalizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.medico_hospitalizacion
    ADD CONSTRAINT medico_hospitalizacion_hospitalizacion_id_fkey FOREIGN KEY (hospitalizacion_id) REFERENCES medico.hospitalizacion(hospitalizacion_id);


--
-- TOC entry 7593 (class 2606 OID 19112)
-- Name: medico_hospitalizacion medico_hospitalizacion_personal_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.medico_hospitalizacion
    ADD CONSTRAINT medico_hospitalizacion_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7798 (class 2606 OID 21430)
-- Name: mensaje_hl7 mensaje_hl7_sistema_externo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.mensaje_hl7
    ADD CONSTRAINT mensaje_hl7_sistema_externo_id_fkey FOREIGN KEY (sistema_externo_id) REFERENCES medico.sistema_externo(sistema_externo_id);


--
-- TOC entry 7799 (class 2606 OID 21425)
-- Name: mensaje_hl7 mensaje_hl7_tipo_mensaje_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.mensaje_hl7
    ADD CONSTRAINT mensaje_hl7_tipo_mensaje_id_fkey FOREIGN KEY (tipo_mensaje_id) REFERENCES medico.tipo_mensaje_hl7(tipo_mensaje_id);


--
-- TOC entry 7774 (class 2606 OID 21147)
-- Name: modelo_ia modelo_ia_especialidad_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.modelo_ia
    ADD CONSTRAINT modelo_ia_especialidad_id_fkey FOREIGN KEY (especialidad_id) REFERENCES medico.especialidad_medica(especialidad_id);


--
-- TOC entry 7775 (class 2606 OID 21142)
-- Name: modelo_ia modelo_ia_tipo_modelo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.modelo_ia
    ADD CONSTRAINT modelo_ia_tipo_modelo_id_fkey FOREIGN KEY (tipo_modelo_id) REFERENCES medico.tipo_modelo_ia(tipo_modelo_id);


--
-- TOC entry 7479 (class 2606 OID 18182)
-- Name: motivo_consulta_predefinido motivo_consulta_predefinido_especialidad_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.motivo_consulta_predefinido
    ADD CONSTRAINT motivo_consulta_predefinido_especialidad_id_fkey FOREIGN KEY (especialidad_id) REFERENCES medico.especialidad_medica(especialidad_id);


--
-- TOC entry 7618 (class 2606 OID 19400)
-- Name: movimiento_almacen movimiento_almacen_almacen_destino_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_almacen
    ADD CONSTRAINT movimiento_almacen_almacen_destino_id_fkey FOREIGN KEY (almacen_destino_id) REFERENCES medico.almacen(almacen_id);


--
-- TOC entry 7619 (class 2606 OID 19380)
-- Name: movimiento_almacen movimiento_almacen_almacen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_almacen
    ADD CONSTRAINT movimiento_almacen_almacen_id_fkey FOREIGN KEY (almacen_id) REFERENCES medico.almacen(almacen_id);


--
-- TOC entry 7620 (class 2606 OID 19375)
-- Name: movimiento_almacen movimiento_almacen_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_almacen
    ADD CONSTRAINT movimiento_almacen_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7621 (class 2606 OID 19390)
-- Name: movimiento_almacen movimiento_almacen_personal_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_almacen
    ADD CONSTRAINT movimiento_almacen_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7622 (class 2606 OID 19395)
-- Name: movimiento_almacen movimiento_almacen_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_almacen
    ADD CONSTRAINT movimiento_almacen_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES medico.proveedor(proveedor_id);


--
-- TOC entry 7623 (class 2606 OID 19385)
-- Name: movimiento_almacen movimiento_almacen_tipo_movimiento_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_almacen
    ADD CONSTRAINT movimiento_almacen_tipo_movimiento_id_fkey FOREIGN KEY (tipo_movimiento_id) REFERENCES medico.tipo_movimiento_almacen(tipo_movimiento_id);


--
-- TOC entry 7707 (class 2606 OID 20270)
-- Name: movimiento_caja movimiento_caja_apertura_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_caja
    ADD CONSTRAINT movimiento_caja_apertura_id_fkey FOREIGN KEY (apertura_id) REFERENCES medico.apertura_caja(apertura_id);


--
-- TOC entry 7708 (class 2606 OID 20275)
-- Name: movimiento_caja movimiento_caja_categoria_movimiento_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_caja
    ADD CONSTRAINT movimiento_caja_categoria_movimiento_id_fkey FOREIGN KEY (categoria_movimiento_id) REFERENCES medico.categoria_movimiento(categoria_movimiento_id);


--
-- TOC entry 7709 (class 2606 OID 20280)
-- Name: movimiento_caja movimiento_caja_comprobante_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_caja
    ADD CONSTRAINT movimiento_caja_comprobante_id_fkey FOREIGN KEY (comprobante_id) REFERENCES medico.comprobante(comprobante_id);


--
-- TOC entry 7710 (class 2606 OID 20290)
-- Name: movimiento_caja movimiento_caja_forma_pago_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_caja
    ADD CONSTRAINT movimiento_caja_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES medico.forma_pago(forma_pago_id);


--
-- TOC entry 7711 (class 2606 OID 20295)
-- Name: movimiento_caja movimiento_caja_moneda_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_caja
    ADD CONSTRAINT movimiento_caja_moneda_id_fkey FOREIGN KEY (moneda_id) REFERENCES medico.moneda(moneda_id);


--
-- TOC entry 7712 (class 2606 OID 20285)
-- Name: movimiento_caja movimiento_caja_pago_comprobante_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_caja
    ADD CONSTRAINT movimiento_caja_pago_comprobante_id_fkey FOREIGN KEY (pago_comprobante_id) REFERENCES medico.pago_comprobante(pago_comprobante_id);


--
-- TOC entry 7713 (class 2606 OID 20310)
-- Name: movimiento_caja movimiento_caja_personal_autoriza_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_caja
    ADD CONSTRAINT movimiento_caja_personal_autoriza_id_fkey FOREIGN KEY (personal_autoriza_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7714 (class 2606 OID 20305)
-- Name: movimiento_caja movimiento_caja_personal_beneficiario_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_caja
    ADD CONSTRAINT movimiento_caja_personal_beneficiario_id_fkey FOREIGN KEY (personal_beneficiario_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7715 (class 2606 OID 20300)
-- Name: movimiento_caja movimiento_caja_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_caja
    ADD CONSTRAINT movimiento_caja_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES medico.proveedor(proveedor_id);


--
-- TOC entry 7602 (class 2606 OID 19201)
-- Name: movimiento_cama movimiento_cama_cama_destino_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_cama
    ADD CONSTRAINT movimiento_cama_cama_destino_id_fkey FOREIGN KEY (cama_destino_id) REFERENCES medico.cama(cama_id);


--
-- TOC entry 7603 (class 2606 OID 19196)
-- Name: movimiento_cama movimiento_cama_cama_origen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_cama
    ADD CONSTRAINT movimiento_cama_cama_origen_id_fkey FOREIGN KEY (cama_origen_id) REFERENCES medico.cama(cama_id);


--
-- TOC entry 7604 (class 2606 OID 19191)
-- Name: movimiento_cama movimiento_cama_hospitalizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_cama
    ADD CONSTRAINT movimiento_cama_hospitalizacion_id_fkey FOREIGN KEY (hospitalizacion_id) REFERENCES medico.hospitalizacion(hospitalizacion_id);


--
-- TOC entry 7605 (class 2606 OID 19206)
-- Name: movimiento_cama movimiento_cama_personal_autoriza_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.movimiento_cama
    ADD CONSTRAINT movimiento_cama_personal_autoriza_id_fkey FOREIGN KEY (personal_autoriza_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7655 (class 2606 OID 19743)
-- Name: muestra_laboratorio muestra_laboratorio_personal_toma_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.muestra_laboratorio
    ADD CONSTRAINT muestra_laboratorio_personal_toma_id_fkey FOREIGN KEY (personal_toma_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7656 (class 2606 OID 19733)
-- Name: muestra_laboratorio muestra_laboratorio_solicitud_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.muestra_laboratorio
    ADD CONSTRAINT muestra_laboratorio_solicitud_id_fkey FOREIGN KEY (solicitud_id) REFERENCES medico.solicitud_examen(solicitud_id);


--
-- TOC entry 7657 (class 2606 OID 19738)
-- Name: muestra_laboratorio muestra_laboratorio_tipo_muestra_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.muestra_laboratorio
    ADD CONSTRAINT muestra_laboratorio_tipo_muestra_id_fkey FOREIGN KEY (tipo_muestra_id) REFERENCES medico.tipo_muestra(tipo_muestra_id);


--
-- TOC entry 7430 (class 2606 OID 17600)
-- Name: organizacion organizacion_tipo_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.organizacion
    ADD CONSTRAINT organizacion_tipo_organizacion_id_fkey FOREIGN KEY (tipo_organizacion_id) REFERENCES medico.tipo_organizacion(tipo_organizacion_id);


--
-- TOC entry 7431 (class 2606 OID 17605)
-- Name: organizacion organizacion_ubigeo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.organizacion
    ADD CONSTRAINT organizacion_ubigeo_id_fkey FOREIGN KEY (ubigeo_id) REFERENCES medico.ubigeo(ubigeo_id);


--
-- TOC entry 7448 (class 2606 OID 17817)
-- Name: paciente_alergia paciente_alergia_alergia_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_alergia
    ADD CONSTRAINT paciente_alergia_alergia_id_fkey FOREIGN KEY (alergia_id) REFERENCES medico.alergia(alergia_id);


--
-- TOC entry 7449 (class 2606 OID 17812)
-- Name: paciente_alergia paciente_alergia_paciente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_alergia
    ADD CONSTRAINT paciente_alergia_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES medico.paciente(paciente_id);


--
-- TOC entry 7454 (class 2606 OID 17914)
-- Name: paciente_antecedente_familiar paciente_antecedente_familiar_antecedente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_antecedente_familiar
    ADD CONSTRAINT paciente_antecedente_familiar_antecedente_id_fkey FOREIGN KEY (antecedente_id) REFERENCES medico.antecedente_medico(antecedente_id);


--
-- TOC entry 7455 (class 2606 OID 17919)
-- Name: paciente_antecedente_familiar paciente_antecedente_familiar_cie10_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_antecedente_familiar
    ADD CONSTRAINT paciente_antecedente_familiar_cie10_id_fkey FOREIGN KEY (cie10_id) REFERENCES medico.cie10(cie10_id);


--
-- TOC entry 7456 (class 2606 OID 17909)
-- Name: paciente_antecedente_familiar paciente_antecedente_familiar_paciente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_antecedente_familiar
    ADD CONSTRAINT paciente_antecedente_familiar_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES medico.paciente(paciente_id);


--
-- TOC entry 7457 (class 2606 OID 17924)
-- Name: paciente_antecedente_familiar paciente_antecedente_familiar_parentesco_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_antecedente_familiar
    ADD CONSTRAINT paciente_antecedente_familiar_parentesco_id_fkey FOREIGN KEY (parentesco_id) REFERENCES medico.parentesco(parentesco_id);


--
-- TOC entry 7451 (class 2606 OID 17882)
-- Name: paciente_antecedente_personal paciente_antecedente_personal_antecedente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_antecedente_personal
    ADD CONSTRAINT paciente_antecedente_personal_antecedente_id_fkey FOREIGN KEY (antecedente_id) REFERENCES medico.antecedente_medico(antecedente_id);


--
-- TOC entry 7452 (class 2606 OID 17887)
-- Name: paciente_antecedente_personal paciente_antecedente_personal_cie10_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_antecedente_personal
    ADD CONSTRAINT paciente_antecedente_personal_cie10_id_fkey FOREIGN KEY (cie10_id) REFERENCES medico.cie10(cie10_id);


--
-- TOC entry 7453 (class 2606 OID 17877)
-- Name: paciente_antecedente_personal paciente_antecedente_personal_paciente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_antecedente_personal
    ADD CONSTRAINT paciente_antecedente_personal_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES medico.paciente(paciente_id);


--
-- TOC entry 7446 (class 2606 OID 17774)
-- Name: paciente_aseguradora paciente_aseguradora_aseguradora_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_aseguradora
    ADD CONSTRAINT paciente_aseguradora_aseguradora_id_fkey FOREIGN KEY (aseguradora_id) REFERENCES medico.aseguradora(aseguradora_id);


--
-- TOC entry 7447 (class 2606 OID 17769)
-- Name: paciente_aseguradora paciente_aseguradora_paciente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente_aseguradora
    ADD CONSTRAINT paciente_aseguradora_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES medico.paciente(paciente_id);


--
-- TOC entry 7442 (class 2606 OID 17719)
-- Name: paciente paciente_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente
    ADD CONSTRAINT paciente_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7443 (class 2606 OID 17714)
-- Name: paciente paciente_persona_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente
    ADD CONSTRAINT paciente_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES medico.persona(persona_id);


--
-- TOC entry 7444 (class 2606 OID 17724)
-- Name: paciente paciente_tipo_paciente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.paciente
    ADD CONSTRAINT paciente_tipo_paciente_id_fkey FOREIGN KEY (tipo_paciente_id) REFERENCES medico.tipo_paciente(tipo_paciente_id);


--
-- TOC entry 7696 (class 2606 OID 20130)
-- Name: pago_comprobante pago_comprobante_comprobante_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.pago_comprobante
    ADD CONSTRAINT pago_comprobante_comprobante_id_fkey FOREIGN KEY (comprobante_id) REFERENCES medico.comprobante(comprobante_id);


--
-- TOC entry 7697 (class 2606 OID 20135)
-- Name: pago_comprobante pago_comprobante_forma_pago_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.pago_comprobante
    ADD CONSTRAINT pago_comprobante_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES medico.forma_pago(forma_pago_id);


--
-- TOC entry 7721 (class 2606 OID 20416)
-- Name: pago_planilla pago_planilla_detalle_planilla_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.pago_planilla
    ADD CONSTRAINT pago_planilla_detalle_planilla_id_fkey FOREIGN KEY (detalle_planilla_id) REFERENCES medico.detalle_planilla(detalle_planilla_id);


--
-- TOC entry 7722 (class 2606 OID 20421)
-- Name: pago_planilla pago_planilla_forma_pago_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.pago_planilla
    ADD CONSTRAINT pago_planilla_forma_pago_id_fkey FOREIGN KEY (forma_pago_id) REFERENCES medico.forma_pago(forma_pago_id);


--
-- TOC entry 7723 (class 2606 OID 20426)
-- Name: pago_planilla pago_planilla_movimiento_caja_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.pago_planilla
    ADD CONSTRAINT pago_planilla_movimiento_caja_id_fkey FOREIGN KEY (movimiento_caja_id) REFERENCES medico.movimiento_caja(movimiento_caja_id);


--
-- TOC entry 7724 (class 2606 OID 20450)
-- Name: pago_servicio pago_servicio_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.pago_servicio
    ADD CONSTRAINT pago_servicio_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7725 (class 2606 OID 20465)
-- Name: pago_servicio pago_servicio_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.pago_servicio
    ADD CONSTRAINT pago_servicio_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES medico.proveedor(proveedor_id);


--
-- TOC entry 7726 (class 2606 OID 20455)
-- Name: pago_servicio pago_servicio_sede_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.pago_servicio
    ADD CONSTRAINT pago_servicio_sede_id_fkey FOREIGN KEY (sede_id) REFERENCES medico.sede(sede_id);


--
-- TOC entry 7727 (class 2606 OID 20460)
-- Name: pago_servicio pago_servicio_tipo_servicio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.pago_servicio
    ADD CONSTRAINT pago_servicio_tipo_servicio_id_fkey FOREIGN KEY (tipo_servicio_id) REFERENCES medico.tipo_servicio_basico(tipo_servicio_id);


--
-- TOC entry 7664 (class 2606 OID 19812)
-- Name: parametro_laboratorio parametro_laboratorio_tipo_examen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.parametro_laboratorio
    ADD CONSTRAINT parametro_laboratorio_tipo_examen_id_fkey FOREIGN KEY (tipo_examen_id) REFERENCES medico.tipo_examen(tipo_examen_id);


--
-- TOC entry 7665 (class 2606 OID 19817)
-- Name: parametro_laboratorio parametro_laboratorio_unidad_medida_lab_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.parametro_laboratorio
    ADD CONSTRAINT parametro_laboratorio_unidad_medida_lab_id_fkey FOREIGN KEY (unidad_medida_lab_id) REFERENCES medico.unidad_medida_laboratorio(unidad_medida_lab_id);


--
-- TOC entry 7728 (class 2606 OID 20490)
-- Name: periodo_contable periodo_contable_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.periodo_contable
    ADD CONSTRAINT periodo_contable_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7716 (class 2606 OID 20335)
-- Name: periodo_planilla periodo_planilla_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.periodo_planilla
    ADD CONSTRAINT periodo_planilla_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7741 (class 2606 OID 20664)
-- Name: periodo_reporte_susalud periodo_reporte_susalud_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.periodo_reporte_susalud
    ADD CONSTRAINT periodo_reporte_susalud_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7435 (class 2606 OID 17672)
-- Name: persona persona_estado_civil_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.persona
    ADD CONSTRAINT persona_estado_civil_id_fkey FOREIGN KEY (estado_civil_id) REFERENCES medico.estado_civil(estado_civil_id);


--
-- TOC entry 7436 (class 2606 OID 17687)
-- Name: persona persona_factor_rh_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.persona
    ADD CONSTRAINT persona_factor_rh_id_fkey FOREIGN KEY (factor_rh_id) REFERENCES medico.factor_rh(factor_rh_id);


--
-- TOC entry 7437 (class 2606 OID 17682)
-- Name: persona persona_grupo_sanguineo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.persona
    ADD CONSTRAINT persona_grupo_sanguineo_id_fkey FOREIGN KEY (grupo_sanguineo_id) REFERENCES medico.grupo_sanguineo(grupo_sanguineo_id);


--
-- TOC entry 7438 (class 2606 OID 17667)
-- Name: persona persona_sexo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.persona
    ADD CONSTRAINT persona_sexo_id_fkey FOREIGN KEY (sexo_id) REFERENCES medico.sexo(sexo_id);


--
-- TOC entry 7439 (class 2606 OID 17662)
-- Name: persona persona_tipo_documento_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.persona
    ADD CONSTRAINT persona_tipo_documento_id_fkey FOREIGN KEY (tipo_documento_id) REFERENCES medico.tipo_documento(tipo_documento_id);


--
-- TOC entry 7440 (class 2606 OID 17677)
-- Name: persona persona_ubigeo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.persona
    ADD CONSTRAINT persona_ubigeo_id_fkey FOREIGN KEY (ubigeo_id) REFERENCES medico.ubigeo(ubigeo_id);


--
-- TOC entry 7458 (class 2606 OID 17963)
-- Name: personal personal_cargo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.personal
    ADD CONSTRAINT personal_cargo_id_fkey FOREIGN KEY (cargo_id) REFERENCES medico.cargo(cargo_id);


--
-- TOC entry 7462 (class 2606 OID 17988)
-- Name: personal_especialidad personal_especialidad_especialidad_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.personal_especialidad
    ADD CONSTRAINT personal_especialidad_especialidad_id_fkey FOREIGN KEY (especialidad_id) REFERENCES medico.especialidad_medica(especialidad_id);


--
-- TOC entry 7463 (class 2606 OID 17983)
-- Name: personal_especialidad personal_especialidad_personal_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.personal_especialidad
    ADD CONSTRAINT personal_especialidad_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7459 (class 2606 OID 17953)
-- Name: personal personal_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.personal
    ADD CONSTRAINT personal_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7460 (class 2606 OID 17948)
-- Name: personal personal_persona_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.personal
    ADD CONSTRAINT personal_persona_id_fkey FOREIGN KEY (persona_id) REFERENCES medico.persona(persona_id);


--
-- TOC entry 7564 (class 2606 OID 18884)
-- Name: personal_procedimiento personal_procedimiento_personal_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.personal_procedimiento
    ADD CONSTRAINT personal_procedimiento_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7565 (class 2606 OID 18879)
-- Name: personal_procedimiento personal_procedimiento_procedimiento_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.personal_procedimiento
    ADD CONSTRAINT personal_procedimiento_procedimiento_id_fkey FOREIGN KEY (procedimiento_id) REFERENCES medico.procedimiento_realizado(procedimiento_id);


--
-- TOC entry 7461 (class 2606 OID 17958)
-- Name: personal personal_tipo_personal_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.personal
    ADD CONSTRAINT personal_tipo_personal_id_fkey FOREIGN KEY (tipo_personal_id) REFERENCES medico.tipo_personal(tipo_personal_id);


--
-- TOC entry 7759 (class 2606 OID 20887)
-- Name: plan_mejora_auditoria plan_mejora_auditoria_auditoria_hc_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.plan_mejora_auditoria
    ADD CONSTRAINT plan_mejora_auditoria_auditoria_hc_id_fkey FOREIGN KEY (auditoria_hc_id) REFERENCES medico.auditoria_hc(auditoria_hc_id);


--
-- TOC entry 7760 (class 2606 OID 20892)
-- Name: plan_mejora_auditoria plan_mejora_auditoria_criterio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.plan_mejora_auditoria
    ADD CONSTRAINT plan_mejora_auditoria_criterio_id_fkey FOREIGN KEY (criterio_id) REFERENCES medico.criterio_auditoria(criterio_id);


--
-- TOC entry 7761 (class 2606 OID 20897)
-- Name: plan_mejora_auditoria plan_mejora_auditoria_responsable_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.plan_mejora_auditoria
    ADD CONSTRAINT plan_mejora_auditoria_responsable_id_fkey FOREIGN KEY (responsable_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7738 (class 2606 OID 20634)
-- Name: presupuesto presupuesto_categoria_balance_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.presupuesto
    ADD CONSTRAINT presupuesto_categoria_balance_id_fkey FOREIGN KEY (categoria_balance_id) REFERENCES medico.categoria_balance(categoria_balance_id);


--
-- TOC entry 7739 (class 2606 OID 20629)
-- Name: presupuesto presupuesto_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.presupuesto
    ADD CONSTRAINT presupuesto_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7740 (class 2606 OID 20639)
-- Name: presupuesto presupuesto_subcategoria_balance_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.presupuesto
    ADD CONSTRAINT presupuesto_subcategoria_balance_id_fkey FOREIGN KEY (subcategoria_balance_id) REFERENCES medico.subcategoria_balance(subcategoria_balance_id);


--
-- TOC entry 7561 (class 2606 OID 18854)
-- Name: procedimiento_realizado procedimiento_realizado_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.procedimiento_realizado
    ADD CONSTRAINT procedimiento_realizado_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7562 (class 2606 OID 18859)
-- Name: procedimiento_realizado procedimiento_realizado_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.procedimiento_realizado
    ADD CONSTRAINT procedimiento_realizado_episodio_id_fkey FOREIGN KEY (episodio_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7563 (class 2606 OID 18849)
-- Name: procedimiento_realizado procedimiento_realizado_tipo_procedimiento_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.procedimiento_realizado
    ADD CONSTRAINT procedimiento_realizado_tipo_procedimiento_id_fkey FOREIGN KEY (tipo_procedimiento_id) REFERENCES medico.tipo_procedimiento(tipo_procedimiento_id);


--
-- TOC entry 7612 (class 2606 OID 19301)
-- Name: producto producto_categoria_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.producto
    ADD CONSTRAINT producto_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES medico.categoria_producto(categoria_id);


--
-- TOC entry 7613 (class 2606 OID 19306)
-- Name: producto producto_forma_farmaceutica_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.producto
    ADD CONSTRAINT producto_forma_farmaceutica_id_fkey FOREIGN KEY (forma_farmaceutica_id) REFERENCES medico.tipo_forma_farmaceutica(forma_farmaceutica_id);


--
-- TOC entry 7614 (class 2606 OID 19311)
-- Name: producto producto_unidad_medida_farmacia_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.producto
    ADD CONSTRAINT producto_unidad_medida_farmacia_id_fkey FOREIGN KEY (unidad_medida_farmacia_id) REFERENCES medico.unidad_medida_farmacia(unidad_medida_farmacia_id);


--
-- TOC entry 7606 (class 2606 OID 19230)
-- Name: proveedor proveedor_tipo_documento_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.proveedor
    ADD CONSTRAINT proveedor_tipo_documento_id_fkey FOREIGN KEY (tipo_documento_id) REFERENCES medico.tipo_documento(tipo_documento_id);


--
-- TOC entry 7607 (class 2606 OID 19235)
-- Name: proveedor proveedor_ubigeo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.proveedor
    ADD CONSTRAINT proveedor_ubigeo_id_fkey FOREIGN KEY (ubigeo_id) REFERENCES medico.ubigeo(ubigeo_id);


--
-- TOC entry 7626 (class 2606 OID 19453)
-- Name: receta receta_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.receta
    ADD CONSTRAINT receta_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7627 (class 2606 OID 19458)
-- Name: receta receta_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.receta
    ADD CONSTRAINT receta_episodio_id_fkey FOREIGN KEY (episodio_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7628 (class 2606 OID 19473)
-- Name: receta receta_estado_receta_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.receta
    ADD CONSTRAINT receta_estado_receta_id_fkey FOREIGN KEY (estado_receta_id) REFERENCES medico.estado_receta(estado_receta_id);


--
-- TOC entry 7629 (class 2606 OID 19463)
-- Name: receta receta_paciente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.receta
    ADD CONSTRAINT receta_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES medico.paciente(paciente_id);


--
-- TOC entry 7630 (class 2606 OID 19468)
-- Name: receta receta_personal_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.receta
    ADD CONSTRAINT receta_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7795 (class 2606 OID 21364)
-- Name: recurso_fhir recurso_fhir_tipo_recurso_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.recurso_fhir
    ADD CONSTRAINT recurso_fhir_tipo_recurso_id_fkey FOREIGN KEY (tipo_recurso_id) REFERENCES medico.tipo_recurso_fhir(tipo_recurso_id);


--
-- TOC entry 7521 (class 2606 OID 18512)
-- Name: registro_signos_vitales registro_signos_vitales_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.registro_signos_vitales
    ADD CONSTRAINT registro_signos_vitales_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7522 (class 2606 OID 18517)
-- Name: registro_signos_vitales registro_signos_vitales_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.registro_signos_vitales
    ADD CONSTRAINT registro_signos_vitales_episodio_id_fkey FOREIGN KEY (episodio_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7523 (class 2606 OID 18522)
-- Name: registro_signos_vitales registro_signos_vitales_personal_registra_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.registro_signos_vitales
    ADD CONSTRAINT registro_signos_vitales_personal_registra_id_fkey FOREIGN KEY (personal_registra_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7524 (class 2606 OID 18507)
-- Name: registro_signos_vitales registro_signos_vitales_tipo_registro_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.registro_signos_vitales
    ADD CONSTRAINT registro_signos_vitales_tipo_registro_id_fkey FOREIGN KEY (tipo_registro_id) REFERENCES medico.tipo_registro_signos_vitales(tipo_registro_id);


--
-- TOC entry 7762 (class 2606 OID 20922)
-- Name: reporte_configuracion reporte_configuracion_categoria_reporte_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.reporte_configuracion
    ADD CONSTRAINT reporte_configuracion_categoria_reporte_id_fkey FOREIGN KEY (categoria_reporte_id) REFERENCES medico.categoria_reporte(categoria_reporte_id);


--
-- TOC entry 7763 (class 2606 OID 20945)
-- Name: reporte_parametro reporte_parametro_reporte_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.reporte_parametro
    ADD CONSTRAINT reporte_parametro_reporte_id_fkey FOREIGN KEY (reporte_id) REFERENCES medico.reporte_configuracion(reporte_id);


--
-- TOC entry 7764 (class 2606 OID 20967)
-- Name: reporte_rol reporte_rol_reporte_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.reporte_rol
    ADD CONSTRAINT reporte_rol_reporte_id_fkey FOREIGN KEY (reporte_id) REFERENCES medico.reporte_configuracion(reporte_id);


--
-- TOC entry 7765 (class 2606 OID 20972)
-- Name: reporte_rol reporte_rol_rol_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.reporte_rol
    ADD CONSTRAINT reporte_rol_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES medico.rol(rol_id);


--
-- TOC entry 7668 (class 2606 OID 19877)
-- Name: resultado_laboratorio resultado_laboratorio_estado_resultado_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.resultado_laboratorio
    ADD CONSTRAINT resultado_laboratorio_estado_resultado_id_fkey FOREIGN KEY (estado_resultado_id) REFERENCES medico.estado_resultado_laboratorio(estado_resultado_id);


--
-- TOC entry 7669 (class 2606 OID 19867)
-- Name: resultado_laboratorio resultado_laboratorio_examen_lab_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.resultado_laboratorio
    ADD CONSTRAINT resultado_laboratorio_examen_lab_id_fkey FOREIGN KEY (examen_lab_id) REFERENCES medico.examen_laboratorio(examen_lab_id);


--
-- TOC entry 7670 (class 2606 OID 19872)
-- Name: resultado_laboratorio resultado_laboratorio_personal_valida_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.resultado_laboratorio
    ADD CONSTRAINT resultado_laboratorio_personal_valida_id_fkey FOREIGN KEY (personal_valida_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7666 (class 2606 OID 19840)
-- Name: resultado_parametro resultado_parametro_examen_lab_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.resultado_parametro
    ADD CONSTRAINT resultado_parametro_examen_lab_id_fkey FOREIGN KEY (examen_lab_id) REFERENCES medico.examen_laboratorio(examen_lab_id);


--
-- TOC entry 7667 (class 2606 OID 19845)
-- Name: resultado_parametro resultado_parametro_parametro_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.resultado_parametro
    ADD CONSTRAINT resultado_parametro_parametro_id_fkey FOREIGN KEY (parametro_id) REFERENCES medico.parametro_laboratorio(parametro_id);


--
-- TOC entry 7464 (class 2606 OID 18042)
-- Name: rol_permiso rol_permiso_permiso_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.rol_permiso
    ADD CONSTRAINT rol_permiso_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES medico.permiso(permiso_id);


--
-- TOC entry 7465 (class 2606 OID 18037)
-- Name: rol_permiso rol_permiso_rol_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.rol_permiso
    ADD CONSTRAINT rol_permiso_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES medico.rol(rol_id);


--
-- TOC entry 7433 (class 2606 OID 17631)
-- Name: sede sede_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sede
    ADD CONSTRAINT sede_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7434 (class 2606 OID 17636)
-- Name: sede sede_ubigeo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sede
    ADD CONSTRAINT sede_ubigeo_id_fkey FOREIGN KEY (ubigeo_id) REFERENCES medico.ubigeo(ubigeo_id);


--
-- TOC entry 7473 (class 2606 OID 18127)
-- Name: servicio_medico servicio_medico_especialidad_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.servicio_medico
    ADD CONSTRAINT servicio_medico_especialidad_id_fkey FOREIGN KEY (especialidad_id) REFERENCES medico.especialidad_medica(especialidad_id);


--
-- TOC entry 7474 (class 2606 OID 18122)
-- Name: servicio_medico servicio_medico_tipo_servicio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.servicio_medico
    ADD CONSTRAINT servicio_medico_tipo_servicio_id_fkey FOREIGN KEY (tipo_servicio_id) REFERENCES medico.tipo_servicio_medico(tipo_servicio_id);


--
-- TOC entry 7475 (class 2606 OID 18132)
-- Name: servicio_medico servicio_medico_unidad_medida_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.servicio_medico
    ADD CONSTRAINT servicio_medico_unidad_medida_id_fkey FOREIGN KEY (unidad_medida_id) REFERENCES medico.unidad_medida_general(unidad_medida_id);


--
-- TOC entry 7796 (class 2606 OID 21391)
-- Name: sincronizacion_fhir sincronizacion_fhir_recurso_fhir_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sincronizacion_fhir
    ADD CONSTRAINT sincronizacion_fhir_recurso_fhir_id_fkey FOREIGN KEY (recurso_fhir_id) REFERENCES medico.recurso_fhir(recurso_fhir_id);


--
-- TOC entry 7797 (class 2606 OID 21396)
-- Name: sincronizacion_fhir sincronizacion_fhir_sistema_externo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sincronizacion_fhir
    ADD CONSTRAINT sincronizacion_fhir_sistema_externo_id_fkey FOREIGN KEY (sistema_externo_id) REFERENCES medico.sistema_externo(sistema_externo_id);


--
-- TOC entry 7645 (class 2606 OID 19646)
-- Name: solicitud_examen solicitud_examen_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.solicitud_examen
    ADD CONSTRAINT solicitud_examen_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7646 (class 2606 OID 19651)
-- Name: solicitud_examen solicitud_examen_episodio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.solicitud_examen
    ADD CONSTRAINT solicitud_examen_episodio_id_fkey FOREIGN KEY (episodio_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7647 (class 2606 OID 19671)
-- Name: solicitud_examen solicitud_examen_estado_solicitud_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.solicitud_examen
    ADD CONSTRAINT solicitud_examen_estado_solicitud_id_fkey FOREIGN KEY (estado_solicitud_id) REFERENCES medico.estado_solicitud_examen(estado_solicitud_id);


--
-- TOC entry 7648 (class 2606 OID 19656)
-- Name: solicitud_examen solicitud_examen_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.solicitud_examen
    ADD CONSTRAINT solicitud_examen_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7649 (class 2606 OID 19661)
-- Name: solicitud_examen solicitud_examen_personal_solicita_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.solicitud_examen
    ADD CONSTRAINT solicitud_examen_personal_solicita_id_fkey FOREIGN KEY (personal_solicita_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7650 (class 2606 OID 19666)
-- Name: solicitud_examen solicitud_examen_prioridad_solicitud_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.solicitud_examen
    ADD CONSTRAINT solicitud_examen_prioridad_solicitud_id_fkey FOREIGN KEY (prioridad_solicitud_id) REFERENCES medico.prioridad_solicitud(prioridad_solicitud_id);


--
-- TOC entry 7749 (class 2606 OID 20782)
-- Name: subcriterio_auditoria subcriterio_auditoria_criterio_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.subcriterio_auditoria
    ADD CONSTRAINT subcriterio_auditoria_criterio_id_fkey FOREIGN KEY (criterio_id) REFERENCES medico.criterio_auditoria(criterio_id);


--
-- TOC entry 7776 (class 2606 OID 21181)
-- Name: sugerencia_ia sugerencia_ia_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sugerencia_ia
    ADD CONSTRAINT sugerencia_ia_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7777 (class 2606 OID 21201)
-- Name: sugerencia_ia sugerencia_ia_examen_imagen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sugerencia_ia
    ADD CONSTRAINT sugerencia_ia_examen_imagen_id_fkey FOREIGN KEY (examen_imagen_id) REFERENCES medico.examen_imagen(examen_imagen_id);


--
-- TOC entry 7778 (class 2606 OID 21171)
-- Name: sugerencia_ia sugerencia_ia_modelo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sugerencia_ia
    ADD CONSTRAINT sugerencia_ia_modelo_id_fkey FOREIGN KEY (modelo_id) REFERENCES medico.modelo_ia(modelo_id);


--
-- TOC entry 7779 (class 2606 OID 21186)
-- Name: sugerencia_ia sugerencia_ia_paciente_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sugerencia_ia
    ADD CONSTRAINT sugerencia_ia_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES medico.paciente(paciente_id);


--
-- TOC entry 7780 (class 2606 OID 21211)
-- Name: sugerencia_ia sugerencia_ia_personal_revisa_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sugerencia_ia
    ADD CONSTRAINT sugerencia_ia_personal_revisa_id_fkey FOREIGN KEY (personal_revisa_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7781 (class 2606 OID 21206)
-- Name: sugerencia_ia sugerencia_ia_producto_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sugerencia_ia
    ADD CONSTRAINT sugerencia_ia_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES medico.producto(producto_id);


--
-- TOC entry 7782 (class 2606 OID 21191)
-- Name: sugerencia_ia sugerencia_ia_receta_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sugerencia_ia
    ADD CONSTRAINT sugerencia_ia_receta_id_fkey FOREIGN KEY (receta_id) REFERENCES medico.receta(receta_id);


--
-- TOC entry 7783 (class 2606 OID 21196)
-- Name: sugerencia_ia sugerencia_ia_solicitud_examen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sugerencia_ia
    ADD CONSTRAINT sugerencia_ia_solicitud_examen_id_fkey FOREIGN KEY (solicitud_examen_id) REFERENCES medico.solicitud_examen(solicitud_id);


--
-- TOC entry 7784 (class 2606 OID 21176)
-- Name: sugerencia_ia sugerencia_ia_tipo_sugerencia_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.sugerencia_ia
    ADD CONSTRAINT sugerencia_ia_tipo_sugerencia_id_fkey FOREIGN KEY (tipo_sugerencia_id) REFERENCES medico.tipo_sugerencia_ia(tipo_sugerencia_id);


--
-- TOC entry 7643 (class 2606 OID 19619)
-- Name: tipo_examen tipo_examen_area_examen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_examen
    ADD CONSTRAINT tipo_examen_area_examen_id_fkey FOREIGN KEY (area_examen_id) REFERENCES medico.area_examen(area_examen_id);


--
-- TOC entry 7644 (class 2606 OID 19614)
-- Name: tipo_examen tipo_examen_categoria_examen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.tipo_examen
    ADD CONSTRAINT tipo_examen_categoria_examen_id_fkey FOREIGN KEY (categoria_examen_id) REFERENCES medico.categoria_examen(categoria_examen_id);


--
-- TOC entry 7742 (class 2606 OID 20691)
-- Name: trama_susalud trama_susalud_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.trama_susalud
    ADD CONSTRAINT trama_susalud_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES medico.organizacion(organizacion_id);


--
-- TOC entry 7743 (class 2606 OID 20696)
-- Name: trama_susalud trama_susalud_periodo_reporte_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.trama_susalud
    ADD CONSTRAINT trama_susalud_periodo_reporte_id_fkey FOREIGN KEY (periodo_reporte_id) REFERENCES medico.periodo_reporte_susalud(periodo_reporte_id);


--
-- TOC entry 7744 (class 2606 OID 20706)
-- Name: trama_susalud trama_susalud_personal_genera_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.trama_susalud
    ADD CONSTRAINT trama_susalud_personal_genera_id_fkey FOREIGN KEY (personal_genera_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7745 (class 2606 OID 20701)
-- Name: trama_susalud trama_susalud_tipo_trama_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.trama_susalud
    ADD CONSTRAINT trama_susalud_tipo_trama_id_fkey FOREIGN KEY (tipo_trama_id) REFERENCES medico.tipo_trama_susalud(tipo_trama_id);


--
-- TOC entry 7510 (class 2606 OID 18435)
-- Name: transicion_atencion transicion_atencion_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.transicion_atencion
    ADD CONSTRAINT transicion_atencion_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7511 (class 2606 OID 18475)
-- Name: transicion_atencion transicion_atencion_cama_destino_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.transicion_atencion
    ADD CONSTRAINT transicion_atencion_cama_destino_id_fkey FOREIGN KEY (cama_destino_id) REFERENCES medico.cama(cama_id);


--
-- TOC entry 7512 (class 2606 OID 18470)
-- Name: transicion_atencion transicion_atencion_cama_origen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.transicion_atencion
    ADD CONSTRAINT transicion_atencion_cama_origen_id_fkey FOREIGN KEY (cama_origen_id) REFERENCES medico.cama(cama_id);


--
-- TOC entry 7513 (class 2606 OID 18480)
-- Name: transicion_atencion transicion_atencion_diagnostico_momento_transicion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.transicion_atencion
    ADD CONSTRAINT transicion_atencion_diagnostico_momento_transicion_id_fkey FOREIGN KEY (diagnostico_momento_transicion_id) REFERENCES medico.cie10(cie10_id);


--
-- TOC entry 7514 (class 2606 OID 18445)
-- Name: transicion_atencion transicion_atencion_episodio_destino_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.transicion_atencion
    ADD CONSTRAINT transicion_atencion_episodio_destino_id_fkey FOREIGN KEY (episodio_destino_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7515 (class 2606 OID 18440)
-- Name: transicion_atencion transicion_atencion_episodio_origen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.transicion_atencion
    ADD CONSTRAINT transicion_atencion_episodio_origen_id_fkey FOREIGN KEY (episodio_origen_id) REFERENCES medico.episodio_clinico(episodio_id);


--
-- TOC entry 7516 (class 2606 OID 18485)
-- Name: transicion_atencion transicion_atencion_personal_acompaña_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.transicion_atencion
    ADD CONSTRAINT "transicion_atencion_personal_acompaña_id_fkey" FOREIGN KEY ("personal_acompaña_id") REFERENCES medico.personal(personal_id);


--
-- TOC entry 7517 (class 2606 OID 18455)
-- Name: transicion_atencion transicion_atencion_personal_autoriza_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.transicion_atencion
    ADD CONSTRAINT transicion_atencion_personal_autoriza_id_fkey FOREIGN KEY (personal_autoriza_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7518 (class 2606 OID 18465)
-- Name: transicion_atencion transicion_atencion_servicio_destino_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.transicion_atencion
    ADD CONSTRAINT transicion_atencion_servicio_destino_id_fkey FOREIGN KEY (servicio_destino_id) REFERENCES medico.servicio_medico(servicio_id);


--
-- TOC entry 7519 (class 2606 OID 18460)
-- Name: transicion_atencion transicion_atencion_servicio_origen_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.transicion_atencion
    ADD CONSTRAINT transicion_atencion_servicio_origen_id_fkey FOREIGN KEY (servicio_origen_id) REFERENCES medico.servicio_medico(servicio_id);


--
-- TOC entry 7520 (class 2606 OID 18450)
-- Name: transicion_atencion transicion_atencion_tipo_transicion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.transicion_atencion
    ADD CONSTRAINT transicion_atencion_tipo_transicion_id_fkey FOREIGN KEY (tipo_transicion_id) REFERENCES medico.tipo_transicion(tipo_transicion_id);


--
-- TOC entry 7525 (class 2606 OID 18544)
-- Name: triaje triaje_atencion_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.triaje
    ADD CONSTRAINT triaje_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES medico.atencion(atencion_id);


--
-- TOC entry 7526 (class 2606 OID 18554)
-- Name: triaje triaje_personal_triaje_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.triaje
    ADD CONSTRAINT triaje_personal_triaje_id_fkey FOREIGN KEY (personal_triaje_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7527 (class 2606 OID 18559)
-- Name: triaje triaje_prioridad_triaje_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.triaje
    ADD CONSTRAINT triaje_prioridad_triaje_id_fkey FOREIGN KEY (prioridad_triaje_id) REFERENCES medico.prioridad_triaje(prioridad_triaje_id);


--
-- TOC entry 7528 (class 2606 OID 18549)
-- Name: triaje triaje_registro_signos_vitales_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.triaje
    ADD CONSTRAINT triaje_registro_signos_vitales_id_fkey FOREIGN KEY (registro_signos_vitales_id) REFERENCES medico.registro_signos_vitales(registro_signos_id);


--
-- TOC entry 7427 (class 2606 OID 17056)
-- Name: unidad_medida_farmacia unidad_medida_farmacia_unidad_base_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.unidad_medida_farmacia
    ADD CONSTRAINT unidad_medida_farmacia_unidad_base_id_fkey FOREIGN KEY (unidad_base_id) REFERENCES medico.unidad_medida_farmacia(unidad_medida_farmacia_id);


--
-- TOC entry 7469 (class 2606 OID 18065)
-- Name: usuario usuario_personal_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.usuario
    ADD CONSTRAINT usuario_personal_id_fkey FOREIGN KEY (personal_id) REFERENCES medico.personal(personal_id);


--
-- TOC entry 7470 (class 2606 OID 18070)
-- Name: usuario usuario_rol_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.usuario
    ADD CONSTRAINT usuario_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES medico.rol(rol_id);


--
-- TOC entry 7772 (class 2606 OID 21111)
-- Name: valor_kpi valor_kpi_kpi_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.valor_kpi
    ADD CONSTRAINT valor_kpi_kpi_id_fkey FOREIGN KEY (kpi_id) REFERENCES medico.indicador_kpi(kpi_id);


--
-- TOC entry 7773 (class 2606 OID 21116)
-- Name: valor_kpi valor_kpi_periodo_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.valor_kpi
    ADD CONSTRAINT valor_kpi_periodo_id_fkey FOREIGN KEY (periodo_id) REFERENCES medico.periodo_contable(periodo_id);


--
-- TOC entry 7768 (class 2606 OID 21039)
-- Name: widget_dashboard widget_dashboard_dashboard_id_fkey; Type: FK CONSTRAINT; Schema: medico; Owner: postgres
--

ALTER TABLE ONLY medico.widget_dashboard
    ADD CONSTRAINT widget_dashboard_dashboard_id_fkey FOREIGN KEY (dashboard_id) REFERENCES medico.dashboard_gerencial(dashboard_id);


-- Completed on 2025-11-25 00:44:07

--
-- PostgreSQL database dump complete
--

\unrestrict nrDO2I7xxqCjPmodwt265TdklY6se0i7mzrn9xm4SKSManqM0gtUtQSaQAcfaHu

