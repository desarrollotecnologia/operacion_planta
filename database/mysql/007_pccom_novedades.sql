-- ---------------------------------------------------------------------------
-- 007 - Catalogo y columnas para novedades PCCOM
-- ---------------------------------------------------------------------------
-- Fuente: NOVEDADES DE PERSONAL PRODUCTOS CARNICOS COMESTIBLES.xlsx
--   Hoja BD (estados). El importador ignora la hoja BONIFICACION.
-- Idempotente en catalogo (INSERT ... ON DUPLICATE KEY UPDATE).
-- ---------------------------------------------------------------------------

USE cierre_operaciones;

INSERT INTO cat_estado_novedad (codigo, nombre, es_ausentismo) VALUES
  ('AISLAMIENTO',        'Aislamiento',          1),
  ('LICENCIA_MATRIMONIO','Licencia matrimonio',  1),
  ('TRABAJO_EN_CASA',    'Trabajo en casa',      1)
AS new
ON DUPLICATE KEY UPDATE
  nombre = new.nombre,
  es_ausentismo = new.es_ausentismo;

-- Columna RENUNCIAS del Excel (sustituciones / bajas por persona).
ALTER TABLE operario
  ADD COLUMN renuncias_texto VARCHAR(200) NULL AFTER documento;

CREATE INDEX idx_operario_documento ON operario (documento);
