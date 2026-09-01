-- Reses sacrificadas (entrada manual RESUMEN DEL DIA E8).
USE cierre_operaciones;

ALTER TABLE simulacion_dia
  ADD COLUMN reses_sacrificadas INT NULL DEFAULT 0 AFTER reses;
