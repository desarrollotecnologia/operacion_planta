-- =============================================================================
-- Cierre de Operaciones — MySQL 8.0+ (servidor 205)
-- Ejecutar: mysql -u root -p < 001_crear_base_mysql.sql
-- =============================================================================

CREATE DATABASE IF NOT EXISTS cierre_operaciones
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cierre_operaciones;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cat_area (
  id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo      VARCHAR(20)  NOT NULL,
  nombre      VARCHAR(80)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cat_area_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cat_estado_novedad (
  id            SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo        VARCHAR(40)  NOT NULL,
  nombre        VARCHAR(80)  NOT NULL,
  es_ausentismo TINYINT(1)   NOT NULL DEFAULT 0,
  activo        TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cat_estado_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO cat_area (codigo, nombre) VALUES
  ('LINEA', 'Línea de beneficio'),
  ('PCCOM', 'Productos cárnicos comestibles')
AS new
ON DUPLICATE KEY UPDATE nombre = new.nombre;

INSERT INTO cat_estado_novedad (codigo, nombre, es_ausentismo) VALUES
  ('LABORANDO',           'Laborando',                 0),
  ('VACACIONES',          'Vacaciones',                1),
  ('INCAPACIDAD',         'Incapacidad',               1),
  ('INCAPACIDAD_LARGA',   'Incapacidad larga',         1),
  ('CALAMIDAD',           'Calamidad',                 1),
  ('AMORTIZAR_EXTRAS',    'Amortizar extras',          1),
  ('REUBICADO',           'Reubicado',                 1),
  ('RENUNCIA',            'Renuncia',                  1),
  ('PDTE_CONTRATAR',      'Pendiente por contratar',   1),
  ('LICENCIA_NR',         'Licencia no remunerada',    1),
  ('DIA_CERO_AT',         'Día de cero A.T.',          1),
  ('AUSENTISMO',          'Ausentismo',                1),
  ('COMPENSATORIO',       'Compensatorio',             1),
  ('SUSPENSION',          'Suspensión',                1),
  ('DOMINGO_FESTIVO',     'Domingo y festivo',         0),
  ('ENTRENAMIENTO',       'Entrenamiento',             0),
  ('INDUCCION',           'Inducción',                 0),
  ('PERMISO_REMUNERADO',  'Permiso remunerado',        1),
  ('LICENCIA_PATERNIDAD', 'Licencia de paternidad',    1),
  ('DIA_FAMILIA',         'Día de la familia',         1)
AS new
ON DUPLICATE KEY UPDATE nombre = new.nombre, es_ausentismo = new.es_ausentismo;

CREATE TABLE IF NOT EXISTS cat_puesto (
  id        SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo    VARCHAR(40)  NOT NULL,
  nombre    VARCHAR(120) NOT NULL,
  area_id   SMALLINT UNSIGNED NOT NULL,
  activo    TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cat_puesto_codigo (codigo),
  KEY idx_cat_puesto_area (area_id),
  CONSTRAINT fk_cat_puesto_area FOREIGN KEY (area_id) REFERENCES cat_area (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO cat_puesto (codigo, nombre, area_id)
SELECT 'AFANADOR',       'Afanador',                id FROM cat_area WHERE codigo = 'LINEA';
INSERT IGNORE INTO cat_puesto (codigo, nombre, area_id)
SELECT 'DEGUELLO',       'Degüello',                id FROM cat_area WHERE codigo = 'LINEA';
INSERT IGNORE INTO cat_puesto (codigo, nombre, area_id)
SELECT 'DESUELLO',       'Desuello',                id FROM cat_area WHERE codigo = 'LINEA';
INSERT IGNORE INTO cat_puesto (codigo, nombre, area_id)
SELECT 'RAYADO',         'Rayado y corte de manos', id FROM cat_area WHERE codigo = 'LINEA';
INSERT IGNORE INTO cat_puesto (codigo, nombre, area_id)
SELECT 'OPERARIO_LINEA', 'Operario línea',          id FROM cat_area WHERE codigo = 'LINEA';
INSERT IGNORE INTO cat_puesto (codigo, nombre, area_id)
SELECT 'LIDER',          'Líder / apoyo',           id FROM cat_area WHERE codigo = 'LINEA';
INSERT IGNORE INTO cat_puesto (codigo, nombre, area_id)
SELECT 'OPERARIO_PCCOM', 'Operario PCCOM',          id FROM cat_area WHERE codigo = 'PCCOM';

-- ---------------------------------------------------------------------------
-- BASE DE DATOS CIERRE (tabla maestra)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cierre_diario (
  id                    CHAR(36)     NOT NULL DEFAULT (UUID()),
  fecha                 DATE         NOT NULL,
  total_beneficio       INT          NOT NULL,
  hora_inicio           TIME         NOT NULL,
  hora_fin              TIME         NOT NULL,
  -- El turno puede terminar despues de medianoche (14:00 -> 01:34), por eso se
  -- suma un dia antes del modulo en lugar de restar horas directamente.
  duracion_min          INT GENERATED ALWAYS AS (
    MOD(
      TIMESTAMPDIFF(
        MINUTE,
        CONCAT('2000-01-01 ', hora_inicio),
        CONCAT('2000-01-01 ', hora_fin)
      ) + 1440,
      1440
    )
  ) STORED,
  tiempo_paradas_min    INT          NOT NULL DEFAULT 0,
  parada_programada_min INT          NOT NULL DEFAULT 0,
  velocidad_linea       DECIMAL(8,2) NOT NULL,
  horas_laboradas       DECIMAL(8,2) NOT NULL,
  tardanza_inicio_min   INT          NOT NULL DEFAULT 0,
  productividad         DECIMAL(8,2) NOT NULL,
  velocidad_neta        DECIMAL(8,2) NOT NULL,
  velocidad_bruta       DECIMAL(8,2) NOT NULL,
  tolerancia_cero       DECIMAL(10,6) NOT NULL DEFAULT 0,
  pieles                DECIMAL(8,4) NOT NULL DEFAULT 0,
  corte_pierna          DECIMAL(10,6) NOT NULL DEFAULT 0,
  sobrebarriga_rota     DECIMAL(10,6) NOT NULL DEFAULT 0,
  cobertura_grasa       DECIMAL(10,6) NOT NULL DEFAULT 0,
  observacion           TEXT         NULL,
  mes                   VARCHAR(15) GENERATED ALWAYS AS (
    ELT(MONTH(fecha),
      'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
      'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE')
  ) STORED,
  anio                  INT GENERATED ALWAYS AS (YEAR(fecha)) STORED,
  creado_en             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cierre_fecha (fecha),
  KEY idx_cierre_anio_mes (anio, mes),
  KEY idx_cierre_fecha (fecha),
  CONSTRAINT chk_cierre_beneficio CHECK (total_beneficio >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS simulacion_dia (
  id                    CHAR(36)     NOT NULL DEFAULT (UUID()),
  cierre_id             CHAR(36)     NOT NULL,
  reses                 INT          NOT NULL,
  velocidad_bruta       DECIMAL(8,2) NOT NULL,
  parada_programada_hr  DECIMAL(8,4) NOT NULL DEFAULT 0,
  vaciado_linea_hr      DECIMAL(8,4) NOT NULL DEFAULT 0,
  hora_inicio           TIME         NULL,
  ultima_noqueada       TIME         NULL,
  ultima_pesada         TIME         NULL,
  duracion_deseada_hr   DECIMAL(8,4) NULL,
  duracion_efectiva_hr  DECIMAL(8,4) NULL,
  duracion_noqueo_hr    DECIMAL(8,4) NULL,
  velocidad_neta        DECIMAL(8,2) NULL,
  velocidad_neta_noqueo DECIMAL(8,2) NULL,
  reses_por_min         DECIMAL(8,4) NULL,
  segundos_por_res      INT          NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_simulacion_cierre (cierre_id),
  CONSTRAINT fk_simulacion_cierre FOREIGN KEY (cierre_id) REFERENCES cierre_diario (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cierre_proceso_detalle (
  id                    CHAR(36)     NOT NULL DEFAULT (UUID()),
  cierre_id             CHAR(36)     NOT NULL,
  oee_mes               DECIMAL(8,4) NULL,
  oee_dia               DECIMAL(8,4) NULL,
  fallos_maquinaria     TEXT         NULL,
  observaciones_proceso TEXT         NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_cierre_proceso_cierre (cierre_id),
  CONSTRAINT fk_cierre_proceso_cierre FOREIGN KEY (cierre_id) REFERENCES cierre_diario (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS operatividad_dia (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  cierre_id   CHAR(36)     NOT NULL,
  area_id     SMALLINT UNSIGNED NOT NULL,
  criterio    VARCHAR(60)  NOT NULL,
  real_val    DECIMAL(8,2) NOT NULL DEFAULT 0,
  pct         DECIMAL(8,4) NOT NULL DEFAULT 0,
  dia_val     DECIMAL(8,2) NOT NULL DEFAULT 0,
  dia_pct     DECIMAL(8,4) NOT NULL DEFAULT 0,
  dif         DECIMAL(8,4) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_operatividad (cierre_id, area_id, criterio),
  KEY idx_operatividad_area (area_id),
  CONSTRAINT fk_operatividad_cierre FOREIGN KEY (cierre_id) REFERENCES cierre_diario (id) ON DELETE CASCADE,
  CONSTRAINT fk_operatividad_area FOREIGN KEY (area_id) REFERENCES cat_area (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS novedad_resumen_dia (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  cierre_id     CHAR(36)     NOT NULL,
  area_id       SMALLINT UNSIGNED NOT NULL,
  item          SMALLINT     NOT NULL,
  estado_id     SMALLINT UNSIGNED NOT NULL,
  personas      INT          NOT NULL DEFAULT 0,
  pct           DECIMAL(8,4) NOT NULL DEFAULT 0,
  colaboradores TEXT         NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_novedad_resumen (cierre_id, area_id, item),
  CONSTRAINT fk_novedad_resumen_cierre FOREIGN KEY (cierre_id) REFERENCES cierre_diario (id) ON DELETE CASCADE,
  CONSTRAINT fk_novedad_resumen_area FOREIGN KEY (area_id) REFERENCES cat_area (id),
  CONSTRAINT fk_novedad_resumen_estado FOREIGN KEY (estado_id) REFERENCES cat_estado_novedad (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS personal_dia (
  id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
  cierre_id           CHAR(36)     NOT NULL,
  area_id             SMALLINT UNSIGNED NOT NULL,
  personal_asignado   INT          NOT NULL DEFAULT 0,
  personal_contratado INT          NOT NULL DEFAULT 0,
  compensatorio       INT          NOT NULL DEFAULT 0,
  permiso             INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_personal_dia (cierre_id, area_id),
  CONSTRAINT fk_personal_dia_cierre FOREIGN KEY (cierre_id) REFERENCES cierre_diario (id) ON DELETE CASCADE,
  CONSTRAINT fk_personal_dia_area FOREIGN KEY (area_id) REFERENCES cat_area (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- NOVEDADES DE PERSONAL (operarios + asistencia)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operario (
  id              CHAR(36)     NOT NULL DEFAULT (UUID()),
  area_id         SMALLINT UNSIGNED NOT NULL,
  item_orden      INT          NOT NULL,
  puesto_id       SMALLINT UNSIGNED NULL,
  puesto_texto    VARCHAR(120) NULL,
  nombre_completo VARCHAR(200) NOT NULL,
  nombre_corto    VARCHAR(120) NULL,
  documento       VARCHAR(30)  NULL,
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  fecha_ingreso   DATE         NULL,
  creado_en       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_operario_area_item (area_id, item_orden),
  KEY idx_operario_area_activo (area_id, activo),
  KEY idx_operario_nombre (nombre_completo),
  CONSTRAINT fk_operario_area FOREIGN KEY (area_id) REFERENCES cat_area (id),
  CONSTRAINT fk_operario_puesto FOREIGN KEY (puesto_id) REFERENCES cat_puesto (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS asistencia_operario (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  operario_id   CHAR(36)     NOT NULL,
  fecha         DATE         NOT NULL,
  estado_id     SMALLINT UNSIGNED NOT NULL,
  observacion   TEXT         NULL,
  registrado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_asistencia_operario_fecha (operario_id, fecha),
  KEY idx_asistencia_fecha (fecha),
  KEY idx_asistencia_estado (estado_id),
  CONSTRAINT fk_asistencia_operario FOREIGN KEY (operario_id) REFERENCES operario (id) ON DELETE CASCADE,
  CONSTRAINT fk_asistencia_estado FOREIGN KEY (estado_id) REFERENCES cat_estado_novedad (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS planilla_mes (
  id            CHAR(36)     NOT NULL DEFAULT (UUID()),
  area_id       SMALLINT UNSIGNED NOT NULL,
  anio          INT          NOT NULL,
  mes           TINYINT      NOT NULL,
  presupuestado INT          NOT NULL DEFAULT 0,
  contratado    INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_planilla_mes (area_id, anio, mes),
  CONSTRAINT fk_planilla_area FOREIGN KEY (area_id) REFERENCES cat_area (id),
  CONSTRAINT chk_planilla_mes CHECK (mes BETWEEN 1 AND 12)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS novedad_historico (
  id          CHAR(36)     NOT NULL DEFAULT (UUID()),
  operario_id CHAR(36)     NULL,
  fecha       DATE         NOT NULL,
  estado_id   SMALLINT UNSIGNED NOT NULL,
  area_id     SMALLINT UNSIGNED NOT NULL,
  creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_novedad_historico_fecha (fecha),
  CONSTRAINT fk_novedad_hist_operario FOREIGN KEY (operario_id) REFERENCES operario (id) ON DELETE SET NULL,
  CONSTRAINT fk_novedad_hist_estado FOREIGN KEY (estado_id) REFERENCES cat_estado_novedad (id),
  CONSTRAINT fk_novedad_hist_area FOREIGN KEY (area_id) REFERENCES cat_area (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- Vistas
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_consolidado_cierre AS
SELECT
  c.fecha,
  c.total_beneficio,
  c.hora_inicio,
  c.hora_fin,
  ROUND(c.tiempo_paradas_min / 60, 2) AS total_paros_hr,
  c.horas_laboradas AS duracion_hr,
  CASE WHEN c.horas_laboradas > 0
    THEN ROUND(c.total_beneficio / c.horas_laboradas, 2)
    ELSE NULL END AS rendimiento_bruto,
  CASE WHEN (c.horas_laboradas - (c.tiempo_paradas_min / 60)) > 0
    THEN ROUND(c.total_beneficio / (c.horas_laboradas - (c.tiempo_paradas_min / 60)), 2)
    ELSE NULL END AS rendimiento_neto,
  p.personal_asignado,
  p.personal_contratado,
  c.observacion AS novedades_texto,
  c.anio,
  c.mes
FROM cierre_diario c
LEFT JOIN personal_dia p
  ON p.cierre_id = c.id
 AND p.area_id = (SELECT id FROM cat_area WHERE codigo = 'LINEA' LIMIT 1);

CREATE OR REPLACE VIEW vw_resumen_novedades_dia AS
SELECT
  a.fecha,
  o.area_id,
  e.codigo AS estado_codigo,
  e.nombre AS estado_nombre,
  COUNT(*) AS cantidad,
  GROUP_CONCAT(o.nombre_completo ORDER BY o.item_orden SEPARATOR ' / ') AS colaboradores
FROM asistencia_operario a
JOIN operario o ON o.id = a.operario_id
JOIN cat_estado_novedad e ON e.id = a.estado_id
WHERE o.activo = 1
GROUP BY a.fecha, o.area_id, e.codigo, e.nombre;

CREATE OR REPLACE VIEW vw_asistencia_mes AS
SELECT
  o.id AS operario_id,
  o.item_orden,
  o.nombre_completo,
  COALESCE(o.puesto_texto, p.nombre) AS puesto,
  a.fecha,
  e.codigo AS estado_codigo,
  e.nombre AS estado_nombre,
  o.area_id
FROM operario o
LEFT JOIN cat_puesto p ON p.id = o.puesto_id
LEFT JOIN asistencia_operario a ON a.operario_id = o.id
LEFT JOIN cat_estado_novedad e ON e.id = a.estado_id
WHERE o.activo = 1;
