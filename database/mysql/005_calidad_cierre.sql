-- Indicadores de calidad en cierre diario (columnas 16-18 del Excel).
USE cierre_operaciones;

ALTER TABLE cierre_diario
  ADD COLUMN corte_pierna       DECIMAL(10,6) NOT NULL DEFAULT 0 AFTER pieles,
  ADD COLUMN sobrebarriga_rota  DECIMAL(10,6) NOT NULL DEFAULT 0 AFTER corte_pierna,
  ADD COLUMN cobertura_grasa    DECIMAL(10,6) NOT NULL DEFAULT 0 AFTER sobrebarriga_rota;
