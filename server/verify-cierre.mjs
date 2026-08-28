/**
 * Compara lo cargado en la base contra el Excel de origen, dia por dia.
 *
 *   node server/verify-cierre.mjs
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

import { pool, query } from './db.mjs';
import { num, readSheetRows, toIsoDate, toSqlTime } from './xlsx-utils.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DESDE = '2026-01-01';
const HASTA = '2026-08-27';

const wb = XLSX.readFile(resolve(ROOT, 'data/import/cierre-diario-beneficio.xlsx'), { cellDates: true });
const rows = readSheetRows(wb, 'BASE DE DATOS CIERRE');

const esperado = new Map();
for (let i = 1; i < rows.length; i += 1) {
  const r = rows[i];
  const fecha = toIsoDate(r?.[0]);
  if (!fecha || fecha < DESDE || fecha > HASTA) continue;
  const total = num(r[2]);
  const ini = toSqlTime(r[3]);
  if (total <= 0 || !ini) continue;
  esperado.set(fecha, {
    total: Math.round(total),
    ini,
    fin: toSqlTime(r[4]),
    duracion: Math.round(num(r[5])),
    paradas: Math.round(num(r[6])),
  });
}

const filas = await query(
  `SELECT fecha, total_beneficio, hora_inicio, hora_fin, duracion_min, tiempo_paradas_min
     FROM cierre_diario WHERE fecha >= ? AND fecha <= ? ORDER BY fecha`,
  [DESDE, HASTA],
);
const enBase = new Map(filas.map((f) => [f.fecha, f]));

console.log(`Excel (dias con produccion) : ${esperado.size}`);
console.log(`Base  (cierre_diario)       : ${enBase.size}`);

const faltantes = [...esperado.keys()].filter((f) => !enBase.has(f));
const sobrantes = [...enBase.keys()].filter((f) => !esperado.has(f));
console.log(`Faltan en la base           : ${faltantes.length}${faltantes.length ? ` -> ${faltantes.slice(0, 10).join(', ')}` : ''}`);
console.log(`Sobran en la base (sin Excel): ${sobrantes.length}${sobrantes.length ? ` -> ${sobrantes.slice(0, 10).join(', ')}` : ''}`);

const difs = [];
for (const [fecha, e] of esperado) {
  const b = enBase.get(fecha);
  if (!b) continue;
  const problemas = [];
  if (Number(b.total_beneficio) !== e.total) problemas.push(`beneficio ${b.total_beneficio} != ${e.total}`);
  if (b.hora_inicio !== e.ini) problemas.push(`inicio ${b.hora_inicio} != ${e.ini}`);
  if (e.fin && b.hora_fin !== e.fin) problemas.push(`fin ${b.hora_fin} != ${e.fin}`);
  if (Math.abs(Number(b.duracion_min) - e.duracion) > 1) problemas.push(`duracion ${b.duracion_min} != ${e.duracion}`);
  if (Math.abs(Number(b.tiempo_paradas_min) - e.paradas) > 1) problemas.push(`paradas ${b.tiempo_paradas_min} != ${e.paradas}`);
  if (problemas.length) difs.push({ fecha, problemas });
}

if (difs.length) {
  console.log(`\n*** ${difs.length} dias con diferencias ***`);
  for (const d of difs.slice(0, 25)) console.log(`  ${d.fecha}: ${d.problemas.join(' | ')}`);
  if (difs.length > 25) console.log(`  ... y ${difs.length - 25} mas`);
} else {
  console.log('\nTodos los dias coinciden con el Excel.');
}

const sumaExcel = [...esperado.values()].reduce((a, e) => a + e.total, 0);
const sumaBase = filas.reduce((a, f) => a + Number(f.total_beneficio), 0);
console.log(`\nTotal de reses  Excel=${sumaExcel}  Base=${sumaBase}  ${sumaExcel === sumaBase ? 'OK' : 'DIFIERE'}`);

const rango = await query('SELECT MIN(fecha) a, MAX(fecha) b, COUNT(*) n FROM cierre_diario');
console.log(`Rango en base: ${rango[0].a} a ${rango[0].b}  (${rango[0].n} dias)`);

const neg = await query('SELECT fecha, hora_inicio, hora_fin, duracion_min FROM cierre_diario WHERE duracion_min < 0 ORDER BY fecha');
console.log(`\nDias con duracion_min negativa: ${neg.length}`);
for (const f of neg.slice(0, 5)) console.log(`  ${f.fecha}  ${f.hora_inicio} -> ${f.hora_fin}  = ${f.duracion_min}`);

for (const t of ['simulacion_dia', 'cierre_proceso_detalle', 'personal_dia', 'novedad_resumen_dia']) {
  const r = await query(`SELECT COUNT(*) AS n FROM ${t}`);
  console.log(`  ${t.padEnd(24)} ${r[0].n} filas`);
}

await pool.end();
