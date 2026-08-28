-- Usuario de aplicación (ajusta contraseña antes de ejecutar)
-- Ejecutar conectado como superusuario (postgres)

CREATE USER cierre_app WITH PASSWORD 'CAMBIAR_PASSWORD_SEGURO';

GRANT CONNECT ON DATABASE cierre_operaciones TO cierre_app;
GRANT USAGE ON SCHEMA public TO cierre_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cierre_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cierre_app;
GRANT SELECT ON vw_consolidado_cierre TO cierre_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cierre_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO cierre_app;
