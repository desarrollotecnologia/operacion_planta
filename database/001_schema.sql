-- Cierre de Operaciones — esquema PostgreSQL (2026+)
-- Ejecutar en el servidor 205 como usuario con permisos de creación

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Catálogos
CREATE TABLE IF NOT EXISTS cat_area (
  id          SMALLSERIAL PRIMARY KEY,
  codigo      VARCHAR(20) NOT NULL UNIQUE,  -- LINEA | PCCOM
  nombre      VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS cat_estado_novedad (
  id          SMALLSERIAL PRIMARY KEY,
  codigo      VARCHAR(40) NOT NULL UNIQUE,
  nombre      VARCHAR(80) NOT NULL,
  es_ausentismo BOOLEAN NOT NULL DEFAULT FALSE,
  activo      BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO cat_area (codigo, nombre) VALUES
  ('LINEA', 'Línea de beneficio'),
  ('PCCOM', 'Productos cárnicos comestibles')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO cat_estado_novedad (codigo, nombre, es_ausentismo) VALUES
  ('LABORANDO', 'Laborando', FALSE),
  ('VACACIONES', 'Vacaciones', TRUE),
  ('INCAPACIDAD', 'Incapacidad', TRUE),
  ('INCAPACIDAD_LARGA', 'Incapacidad larga', TRUE),
  ('CALAMIDAD', 'Calamidad', TRUE),
  ('AMORTIZAR_EXTRAS', 'Amortizar extras', TRUE),
  ('REUBICADO', 'Reubicado', TRUE),
  ('RENUNCIA', 'Renuncia', TRUE),
  ('PDTE_CONTRATAR', 'Pendiente por contratar', TRUE),
  ('LICENCIA_NR', 'Licencia no remunerada', TRUE),
  ('DIA_CERO_AT', 'Día de cero A.T.', TRUE),
  ('AUSENTISMO', 'Ausentismo', TRUE),
  ('COMPENSATORIO', 'Compensatorio', TRUE),
  ('SUSPENSION', 'Suspensión', TRUE),
  ('DOMINGO_FESTIVO', 'Domingo y festivo', FALSE),
  ('ENTRENAMIENTO', 'Entrenamiento', FALSE),
  ('INDUCCION', 'Inducción', FALSE)
ON CONFLICT (codigo) DO NOTHING;

-- Tabla maestra: equivale a BASE DE DATOS CIERRE
CREATE TABLE IF NOT EXISTS cierre_diario (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha                   DATE NOT NULL UNIQUE,
  total_beneficio         INTEGER NOT NULL CHECK (total_beneficio >= 0),
  hora_inicio             TIME NOT NULL,
  hora_fin                TIME NOT NULL,
  duracion_min            INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (hora_fin - hora_inicio))::INTEGER / 60
  ) STORED,
  tiempo_paradas_min      INTEGER NOT NULL DEFAULT 0,
  parada_programada_min   INTEGER NOT NULL DEFAULT 0,
  velocidad_linea         NUMERIC(8,2) NOT NULL,
  horas_laboradas         NUMERIC(8,2) NOT NULL,
  tardanza_inicio_min     INTEGER NOT NULL DEFAULT 0,
  productividad           NUMERIC(8,2) NOT NULL,
  velocidad_neta          NUMERIC(8,2) NOT NULL,
  velocidad_bruta         NUMERIC(8,2) NOT NULL,
  tolerancia_cero         NUMERIC(10,6) NOT NULL DEFAULT 0,
  pieles                  NUMERIC(8,4) NOT NULL DEFAULT 0,
  observacion             TEXT,
  mes                     VARCHAR(15) GENERATED ALWAYS AS (
    UPPER(TRIM(TO_CHAR(fecha, 'TMMonth')))
  ) STORED,
  anio                    INTEGER GENERATED ALWAYS AS (
    EXTRACT(YEAR FROM fecha)::INTEGER
  ) STORED,
  creado_en               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cierre_diario_anio_mes ON cierre_diario (anio, mes);
CREATE INDEX IF NOT EXISTS idx_cierre_diario_fecha ON cierre_diario (fecha DESC);

-- Simulación del día (hoja SIMULACION)
CREATE TABLE IF NOT EXISTS simulacion_dia (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cierre_id               UUID NOT NULL UNIQUE REFERENCES cierre_diario(id) ON DELETE CASCADE,
  reses                   INTEGER NOT NULL,
  velocidad_bruta         NUMERIC(8,2) NOT NULL,
  parada_programada_hr    NUMERIC(8,4) NOT NULL DEFAULT 0,
  vaciado_linea_hr        NUMERIC(8,4) NOT NULL DEFAULT 0,
  hora_inicio             TIME,
  duracion_deseada_hr     NUMERIC(8,4),
  duracion_efectiva_hr    NUMERIC(8,4),
  duracion_noqueo_hr      NUMERIC(8,4),
  velocidad_neta          NUMERIC(8,2),
  velocidad_neta_noqueo   NUMERIC(8,2),
  reses_por_min           NUMERIC(8,4),
  segundos_por_res        INTEGER
);

-- Detalle de cierre de proceso (observaciones, OEE, fallos)
CREATE TABLE IF NOT EXISTS cierre_proceso_detalle (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cierre_id               UUID NOT NULL UNIQUE REFERENCES cierre_diario(id) ON DELETE CASCADE,
  oee_mes                 NUMERIC(8,4),
  oee_dia                 NUMERIC(8,4),
  fallos_maquinaria       TEXT,
  observaciones_proceso   TEXT
);

-- Operatividad importada desde Novedades (RESUMEN!H3:M12)
CREATE TABLE IF NOT EXISTS operatividad_dia (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cierre_id               UUID NOT NULL REFERENCES cierre_diario(id) ON DELETE CASCADE,
  area_id                 SMALLINT NOT NULL REFERENCES cat_area(id),
  criterio                VARCHAR(60) NOT NULL,
  real                    NUMERIC(8,2) NOT NULL DEFAULT 0,
  pct                     NUMERIC(8,4) NOT NULL DEFAULT 0,
  dia                     NUMERIC(8,2) NOT NULL DEFAULT 0,
  dia_pct                 NUMERIC(8,4) NOT NULL DEFAULT 0,
  dif                     NUMERIC(8,4) NOT NULL DEFAULT 0,
  UNIQUE (cierre_id, area_id, criterio)
);

-- Resumen laborando / novedades (RESUMEN!C26:F34)
CREATE TABLE IF NOT EXISTS novedad_resumen_dia (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cierre_id               UUID NOT NULL REFERENCES cierre_diario(id) ON DELETE CASCADE,
  area_id                 SMALLINT NOT NULL REFERENCES cat_area(id),
  item                    SMALLINT NOT NULL,
  estado_id               SMALLINT NOT NULL REFERENCES cat_estado_novedad(id),
  personas                INTEGER NOT NULL DEFAULT 0,
  pct                     NUMERIC(8,4) NOT NULL DEFAULT 0,
  colaboradores           TEXT,
  UNIQUE (cierre_id, area_id, item)
);

-- Personal asignado/contratado por día (CONSOLIDADO col M)
CREATE TABLE IF NOT EXISTS personal_dia (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cierre_id               UUID NOT NULL REFERENCES cierre_diario(id) ON DELETE CASCADE,
  area_id                 SMALLINT NOT NULL REFERENCES cat_area(id),
  personal_asignado       INTEGER NOT NULL DEFAULT 0,
  personal_contratado     INTEGER NOT NULL DEFAULT 0,
  compensatorio           INTEGER NOT NULL DEFAULT 0,
  permiso                 INTEGER NOT NULL DEFAULT 0,
  UNIQUE (cierre_id, area_id)
);

-- Vista consolidado (reemplaza cálculos de hoja CONSOLIDADO DE CIERRE)
CREATE OR REPLACE VIEW vw_consolidado_cierre AS
SELECT
  c.fecha,
  c.total_beneficio,
  c.hora_inicio,
  c.hora_fin,
  ROUND((c.tiempo_paradas_min::NUMERIC / 60), 2) AS total_paros_hr,
  c.horas_laboradas AS duracion_hr,
  CASE WHEN c.horas_laboradas > 0
    THEN ROUND(c.total_beneficio / c.horas_laboradas, 2)
    ELSE NULL END AS rendimiento_bruto,
  CASE WHEN (c.horas_laboradas - (c.tiempo_paradas_min::NUMERIC / 60)) > 0
    THEN ROUND(c.total_beneficio / (c.horas_laboradas - (c.tiempo_paradas_min::NUMERIC / 60)), 2)
    ELSE NULL END AS rendimiento_neto,
  p.personal_asignado,
  p.personal_contratado,
  c.observacion AS novedades_texto,
  c.anio,
  c.mes
FROM cierre_diario c
LEFT JOIN personal_dia p
  ON p.cierre_id = c.id
 AND p.area_id = (SELECT id FROM cat_area WHERE codigo = 'LINEA');

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cierre_diario_updated ON cierre_diario;
CREATE TRIGGER trg_cierre_diario_updated
  BEFORE UPDATE ON cierre_diario
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

COMMIT;
