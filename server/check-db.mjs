/** Diagnostico de la conexion y del esquema. Uso: node server/check-db.mjs */
import { pool, query, checkConnection, describeTarget } from './db.mjs';

const N = 'cierre_operaciones';

try {
  console.log(`Destino : ${describeTarget()}`);
  const info = await checkConnection();
  console.log(`Conexion: OK -> base '${info.db}', MySQL ${info.version}\n`);

  const tablas = await query(
    `SELECT table_name AS t FROM information_schema.tables
      WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name`,
    [N],
  );
  const vistas = await query(
    'SELECT table_name AS t FROM information_schema.views WHERE table_schema = ? ORDER BY table_name',
    [N],
  );

  console.log(`Tablas (${tablas.length}): ${tablas.map((r) => r.t).join(', ')}`);
  console.log(`Vistas (${vistas.length}): ${vistas.map((r) => r.t).join(', ')}\n`);

  for (const t of ['cat_area', 'cat_estado_novedad', 'cat_puesto', 'operario', 'asistencia_operario', 'cierre_diario']) {
    const [{ c }] = await query(`SELECT COUNT(*) AS c FROM \`${t}\``);
    console.log(`  ${t.padEnd(22)} ${c} filas`);
  }
} catch (err) {
  console.error(`ERROR ${err.code ?? ''}: ${err.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
