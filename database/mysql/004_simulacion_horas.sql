-- Horas de control en simulacion (ultima noqueada / ultima pesada).
USE cierre_operaciones;

ALTER TABLE simulacion_dia
  ADD COLUMN ultima_noqueada TIME NULL AFTER hora_inicio,
  ADD COLUMN ultima_pesada   TIME NULL AFTER ultima_noqueada;
