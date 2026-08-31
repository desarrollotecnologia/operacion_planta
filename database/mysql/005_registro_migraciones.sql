-- ---------------------------------------------------------------------------
-- 005 - Registro de migraciones aplicadas
-- ---------------------------------------------------------------------------
-- Permite que el despliegue avise cuando llega una migracion sin aplicar. La
-- deteccion compara los archivos de esta carpeta contra esta tabla, de modo que
-- una migracion nueva se detecta sola por existir el archivo.
--
-- aplicar_migracion.ps1 inserta aqui cada archivo que ejecuta con exito.
--
-- Idempotente: se puede volver a ejecutar sin efectos adicionales.
-- ---------------------------------------------------------------------------

USE cierre_operaciones;

CREATE TABLE IF NOT EXISTS migracion_aplicada (
  archivo     VARCHAR(160) NOT NULL,
  aplicada_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (archivo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Estas ya estaban aplicadas cuando se creo el registro.
INSERT IGNORE INTO migracion_aplicada (archivo) VALUES
  ('001_crear_base_mysql.sql'),
  ('002_usuario_app_mysql.sql'),
  ('003_duracion_cruce_medianoche.sql'),
  ('004_simulacion_horas.sql'),
  ('005_registro_migraciones.sql');
