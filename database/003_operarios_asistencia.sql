-- Operarios y asistencia diaria (reemplaza NOVEDADES DE PERSONAL AREA LINEA)
-- Ejecutar después de 001_schema.sql

BEGIN;

-- Puestos de trabajo en línea
CREATE TABLE IF NOT EXISTS cat_puesto (
  id          SMALLSERIAL PRIMARY KEY,
  codigo      VARCHAR(40) NOT NULL UNIQUE,
  nombre      VARCHAR(120) NOT NULL,
  area_id     SMALLINT NOT NULL REFERENCES cat_area(id),
  activo      BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO cat_puesto (codigo, nombre, area_id) VALUES
  ('AFANADOR', 'Afanador', (SELECT id FROM cat_area WHERE codigo = 'LINEA')),
  ('DEGUELLO', 'Degüello', (SELECT id FROM cat_area WHERE codigo = 'LINEA')),
  ('DESUELLO', 'Desuello', (SELECT id FROM cat_area WHERE codigo = 'LINEA')),
  ('RAYADO', 'Rayado y corte de manos', (SELECT id FROM cat_area WHERE codigo = 'LINEA')),
  ('OPERARIO_LINEA', 'Operario línea', (SELECT id FROM cat_area WHERE codigo = 'LINEA')),
  ('LIDER', 'Líder / apoyo', (SELECT id FROM cat_area WHERE codigo = 'LINEA')),
  ('OPERARIO_PCCOM', 'Operario PCCOM', (SELECT id FROM cat_area WHERE codigo = 'PCCOM'))
ON CONFLICT (codigo) DO NOTHING;

-- Catálogo extra desde hoja BD del Excel
INSERT INTO cat_estado_novedad (codigo, nombre, es_ausentismo) VALUES
  ('PERMISO_REMUNERADO', 'Permiso remunerado', TRUE),
  ('LICENCIA_PATERNIDAD', 'Licencia de paternidad', TRUE),
  ('DIA_FAMILIA', 'Día de la familia', TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- Operarios / trabajadores (matriz filas 30+ de hojas mensuales)
CREATE TABLE IF NOT EXISTS operario (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id           SMALLINT NOT NULL REFERENCES cat_area(id),
  item_orden        INTEGER NOT NULL,
  puesto_id         SMALLINT REFERENCES cat_puesto(id),
  puesto_texto      VARCHAR(120),
  nombre_completo   VARCHAR(200) NOT NULL,
  nombre_corto      VARCHAR(120),
  documento         VARCHAR(30),
  activo            BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_ingreso     DATE,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (area_id, item_orden)
);

CREATE INDEX IF NOT EXISTS idx_operario_area_activo ON operario (area_id, activo);
CREATE INDEX IF NOT EXISTS idx_operario_nombre ON operario (nombre_completo);

-- Asistencia diaria: una celda del Excel = operario + fecha + estado
CREATE TABLE IF NOT EXISTS asistencia_operario (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operario_id       UUID NOT NULL REFERENCES operario(id) ON DELETE CASCADE,
  fecha             DATE NOT NULL,
  estado_id         SMALLINT NOT NULL REFERENCES cat_estado_novedad(id),
  observacion       TEXT,
  registrado_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operario_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_asistencia_fecha ON asistencia_operario (fecha);
CREATE INDEX IF NOT EXISTS idx_asistencia_estado ON asistencia_operario (estado_id);

-- Meta mensual (PRESUPUESTADO / CONTRATADO filas 3-4 de hoja mensual)
CREATE TABLE IF NOT EXISTS planilla_mes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id           SMALLINT NOT NULL REFERENCES cat_area(id),
  anio              INTEGER NOT NULL,
  mes               SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  presupuestado     INTEGER NOT NULL DEFAULT 0,
  contratado        INTEGER NOT NULL DEFAULT 0,
  UNIQUE (area_id, anio, mes)
);

-- Histórico largo (BASE DE DATOS NOVEDADES del Excel)
CREATE TABLE IF NOT EXISTS novedad_historico (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operario_id       UUID REFERENCES operario(id) ON DELETE SET NULL,
  fecha             DATE NOT NULL,
  estado_id         SMALLINT NOT NULL REFERENCES cat_estado_novedad(id),
  area_id           SMALLINT NOT NULL REFERENCES cat_area(id),
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_novedad_historico_fecha ON novedad_historico (fecha DESC);

-- Vista: resumen del día calculado (reemplaza fórmulas COUNTIF de RESUMEN)
CREATE OR REPLACE VIEW vw_resumen_novedades_dia AS
SELECT
  a.fecha,
  o.area_id,
  e.codigo AS estado_codigo,
  e.nombre AS estado_nombre,
  COUNT(*)::INTEGER AS cantidad,
  STRING_AGG(o.nombre_completo, ' / ' ORDER BY o.item_orden) AS colaboradores
FROM asistencia_operario a
JOIN operario o ON o.id = a.operario_id
JOIN cat_estado_novedad e ON e.id = a.estado_id
WHERE o.activo = TRUE
GROUP BY a.fecha, o.area_id, e.codigo, e.nombre;

-- Vista: matriz asistencia del mes (para pantalla tipo Excel)
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
WHERE o.activo = TRUE;

DROP TRIGGER IF EXISTS trg_operario_updated ON operario;
CREATE TRIGGER trg_operario_updated
  BEFORE UPDATE ON operario
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

COMMIT;
