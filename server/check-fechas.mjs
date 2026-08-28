/** Resumen y validacion de lo cargado. Uso: node server/check-fechas.mjs */
import { pool, query } from './db.mjs';

try {
  const [{ total }] = await query('SELECT COUNT(*) AS total FROM operario');
  const [{ act }] = await query('SELECT COUNT(*) AS act FROM operario WHERE activo = 1');
  const [{ nAsis, desde, hasta, dias }] = await query(
    `SELECT COUNT(*) AS nAsis, MIN(fecha) AS desde, MAX(fecha) AS hasta, COUNT(DISTINCT fecha) AS dias
       FROM asistencia_operario`,
  );

  console.log(`Operarios : ${total} (${act} activos, ${total - act} inactivos)`);
  console.log(`Asistencia: ${nAsis} marcas, ${dias} dias, de ${desde} a ${hasta}\n`);

  const porMes = await query(
    `SELECT DATE_FORMAT(fecha,'%Y-%m') AS mes, COUNT(*) AS n, COUNT(DISTINCT fecha) AS dias,
            COUNT(DISTINCT operario_id) AS personas
       FROM asistencia_operario GROUP BY mes ORDER BY mes`,
  );
  console.log('Mes      marcas  dias  personas');
  for (const m of porMes) {
    console.log(`${m.mes}   ${String(m.n).padStart(5)}   ${String(m.dias).padStart(3)}   ${String(m.personas).padStart(3)}`);
  }

  console.log('\nValidacion de identidad (personas que antes se mezclaban):');
  for (const nombre of ['BARAJAS APARICIO FIDEL', 'BECERRA JAIMES DIEGO ARMANDO', 'BASTO MORENO BRAYAN STEVEN']) {
    const r = await query(
      `SELECT o.item_orden, o.activo, COUNT(a.id) AS marcas, MIN(a.fecha) AS desde, MAX(a.fecha) AS hasta
         FROM operario o LEFT JOIN asistencia_operario a ON a.operario_id = o.id
        WHERE o.nombre_completo = ? GROUP BY o.id`,
      [nombre],
    );
    for (const x of r) {
      console.log(`  ${nombre.padEnd(32)} item ${String(x.item_orden).padStart(2)}  ${x.activo ? 'activo  ' : 'inactivo'}  ${String(x.marcas).padStart(3)} marcas  ${x.desde} a ${x.hasta}`);
    }
  }

  console.log('\nResumen del 2026-08-27 (ultimo dia cargado):');
  const dia = await query(
    `SELECT e.codigo, COUNT(*) AS n FROM asistencia_operario a
       JOIN cat_estado_novedad e ON e.id = a.estado_id
      WHERE a.fecha = '2026-08-27' GROUP BY e.codigo ORDER BY n DESC`,
  );
  for (const d of dia) console.log(`  ${String(d.n).padStart(3)}  ${d.codigo}`);

  const [{ dup }] = await query(
    `SELECT COUNT(*) AS dup FROM (
       SELECT operario_id, fecha FROM asistencia_operario
        GROUP BY operario_id, fecha HAVING COUNT(*) > 1) x`,
  );
  console.log(`\nDuplicados operario+fecha: ${dup}`);
} finally {
  await pool.end();
}
