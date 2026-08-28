/**
 * Borra operarios y asistencia del area LINEA para recargar desde cero.
 *
 * Pide confirmacion explicita porque es destructivo. No toca cierre_diario.
 *
 *   node server/reset-personal.mjs --confirm
 */
import { pool, query } from './db.mjs';

if (!process.argv.includes('--confirm')) {
  console.error('Operacion destructiva. Vuelve a ejecutar con --confirm para continuar.');
  process.exit(1);
}

try {
  const [{ nAsis }] = await query('SELECT COUNT(*) AS nAsis FROM asistencia_operario');
  const [{ nOps }] = await query('SELECT COUNT(*) AS nOps FROM operario');
  console.log(`Antes : ${nOps} operarios, ${nAsis} marcas de asistencia`);

  // asistencia_operario tiene ON DELETE CASCADE sobre operario, pero se borra
  // explicito para dejar el conteo a la vista.
  await query('DELETE FROM asistencia_operario');
  await query('DELETE FROM operario');

  const [{ a }] = await query('SELECT COUNT(*) AS a FROM asistencia_operario');
  const [{ o }] = await query('SELECT COUNT(*) AS o FROM operario');
  console.log(`Despues: ${o} operarios, ${a} marcas`);
} finally {
  await pool.end();
}
