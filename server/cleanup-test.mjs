/** Elimina los residuos que deja server/smoke-test.mjs. */
import { pool, query } from './db.mjs';

try {
  const r1 = await query("DELETE FROM operario WHERE nombre_completo = 'TEMPORAL AUTOMATICO'");
  const r2 = await query("DELETE FROM cierre_diario WHERE fecha IN ('2019-01-02','2019-01-03')");
  console.log(`Operarios de prueba eliminados : ${r1.affectedRows}`);
  console.log(`Cierres de prueba eliminados   : ${r2.affectedRows}`);

  for (const t of ['operario', 'asistencia_operario', 'cierre_diario']) {
    const [{ c }] = await query(`SELECT COUNT(*) AS c FROM \`${t}\``);
    console.log(`  ${t.padEnd(22)} ${c} filas`);
  }
} finally {
  await pool.end();
}
