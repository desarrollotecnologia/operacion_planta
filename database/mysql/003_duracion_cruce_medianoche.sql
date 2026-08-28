-- ---------------------------------------------------------------------------
-- 003 - Corrige duracion_min cuando el turno cruza la medianoche
-- ---------------------------------------------------------------------------
-- La definicion original restaba hora_fin - hora_inicio sobre una misma fecha,
-- de modo que un turno de 14:00 a 01:34 daba -746 minutos en lugar de 694.
-- En el historico 2026 hay 18 dias en esa condicion.
--
-- Idempotente: se puede volver a ejecutar sin efectos adicionales.
-- ---------------------------------------------------------------------------

USE cierre_operaciones;

ALTER TABLE cierre_diario
  MODIFY COLUMN duracion_min INT GENERATED ALWAYS AS (
    MOD(
      TIMESTAMPDIFF(
        MINUTE,
        CONCAT('2000-01-01 ', hora_inicio),
        CONCAT('2000-01-01 ', hora_fin)
      ) + 1440,
      1440
    )
  ) STORED;
