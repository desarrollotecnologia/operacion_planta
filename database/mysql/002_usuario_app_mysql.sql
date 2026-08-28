-- Usuario de aplicación MySQL (servidor 205)
-- Ejecutar: mysql -u root -p < 002_usuario_app_mysql.sql
-- CAMBIAR la contraseña antes de ejecutar en producción
--
-- Alternativa recomendada: `deploy_205.ps1` pide la contraseña en tiempo de
-- ejecución y aplica estos mismos GRANT sin dejarla escrita en el repositorio.

CREATE USER IF NOT EXISTS 'cierre_app'@'localhost' IDENTIFIED BY 'CAMBIAR_PASSWORD_SEGURO';
CREATE USER IF NOT EXISTS 'cierre_app'@'%' IDENTIFIED BY 'CAMBIAR_PASSWORD_SEGURO';

GRANT SELECT, INSERT, UPDATE, DELETE ON cierre_operaciones.* TO 'cierre_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON cierre_operaciones.* TO 'cierre_app'@'%';

FLUSH PRIVILEGES;

-- Cadena de conexión para la API:
-- mysql://cierre_app:TU_PASSWORD@IP_SERVIDOR_205:3306/cierre_operaciones
