/**
 * Inspeccion en seco del Excel de cierre diario. No escribe en la base.
 *
 * Valida el mapeo de columnas que usa import-cierre.mjs y reporta que se
 * cargaria y que filas se descartarian, para no perder datos en silencio.
 *
 *   node server/inspect-cierre.mjs [hasta]
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';
import { num, readSheetRows, text, toIsoDate, toSqlTime } from './xlsx-utils.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const archivo = resolve(ROOT, 'data/import/cierre-diario-beneficio.xlsx');
const HASTA = process.argv[2] ?? '2026-08-27';
const DESDE = '2026-01-01';

const wb = XLSX.readFile(archivo, { cellDates: true });
console.log(`Archivo: ${archivo}`);
console.log(`Hojas (${wb.SheetNames.length}): ${wb.SheetNames.join(' | ')}\n`);

const corto = (v) => {
  if (v == null) return '·';
  if (v instanceof Date) {
    return v.getFullYear() === 1900
      ? `${String(v.getHours()).padStart(2, '0')}:${String(v.getMinutes()).padStart(2, '0')}`
      : v.toISOString().slice(0, 10);
  }
  return String(v).trim().replace(/\s+/g, ' ').slice(0, 14);
};

for (const hoja of ['BASE DE DATOS CIERRE', 'CONSOLIDADO DE CIERRE']) {
  const rows = readSheetRows(wb, hoja);
  if (!rows) { console.log(`### ${hoja}: NO EXISTE\n`); continue; }

  console.log(`### ${hoja} — ${rows.length} filas`);
  console.log('Encabezados:');
  (rows[0] ?? []).forEach((h, i) => {
    if (h != null && String(h).trim()) console.log(`  [${String(i).padStart(2)}] ${String(h).trim().slice(0, 42)}`);
  });

  console.log('\nPrimeras filas de datos:');
  let mostradas = 0;
  for (let i = 1; i < rows.length && mostradas < 3; i += 1) {
    if (toIsoDate(rows[i]?.[0])) {
      console.log(`  fila ${i + 1}: ${(rows[i] ?? []).slice(0, 17).map(corto).join(' | ')}`);
      mostradas += 1;
    }
  }
  console.log('');
}

// --- Validacion del mapeo de BASE DE DATOS CIERRE ---
const rows = readSheetRows(wb, 'BASE DE DATOS CIERRE');
let enRango = 0;
let fueraRango = 0;
let sinFecha = 0;
let descartadas = [];
let minF = '9999';
let maxF = '';
const porAnio = new Map();

for (let i = 1; i < rows.length; i += 1) {
  const row = rows[i];
  const fecha = toIsoDate(row?.[0]);
  if (!fecha) { if (row?.some((c) => c != null)) sinFecha += 1; continue; }

  const anio = fecha.slice(0, 4);
  porAnio.set(anio, (porAnio.get(anio) ?? 0) + 1);

  if (fecha < DESDE || fecha > HASTA) { fueraRango += 1; continue; }

  const total = num(row[2]);
  const horaInicio = toSqlTime(row[3]);
  if (total <= 0 || !horaInicio) {
    descartadas.push({ fila: i + 1, fecha, total, horaInicio, motivo: total <= 0 ? 'beneficio <= 0' : 'hora inicio ilegible' });
    continue;
  }

  enRango += 1;
  if (fecha < minF) minF = fecha;
  if (fecha > maxF) maxF = fecha;
}

console.log('=== BASE DE DATOS CIERRE: que se importaria ===');
console.log(`Filas por anio: ${[...porAnio].sort().map(([a, n]) => `${a}:${n}`).join('  ')}`);
console.log(`En rango ${DESDE}..${HASTA} y validas: ${enRango}  (${minF} a ${maxF})`);
console.log(`Fuera de rango  : ${fueraRango}`);
console.log(`Sin fecha legible: ${sinFecha}`);

if (descartadas.length) {
  console.log(`\n*** ${descartadas.length} filas EN RANGO que se descartarian ***`);
  for (const d of descartadas.slice(0, 20)) {
    console.log(`  fila ${d.fila}  ${d.fecha}  beneficio=${d.total}  horaInicio=${d.horaInicio ?? 'null'}  -> ${d.motivo}`);
  }
  if (descartadas.length > 20) console.log(`  ... y ${descartadas.length - 20} mas`);
} else {
  console.log('\nNinguna fila en rango se descartaria.');
}

// Muestra el mapeo interpretado para el ultimo dia, para revisarlo a ojo.
for (let i = rows.length - 1; i > 0; i -= 1) {
  const row = rows[i];
  const fecha = toIsoDate(row?.[0]);
  if (!fecha || fecha > HASTA || fecha < DESDE || num(row[2]) <= 0) continue;
  console.log(`\n=== Interpretacion de la fila mas reciente (${fecha}) ===`);
  console.log(`  OEE dia            [1]  ${num(row[1])}`);
  console.log(`  Total beneficio    [2]  ${num(row[2])}`);
  console.log(`  Hora inicio        [3]  ${toSqlTime(row[3])}`);
  console.log(`  Hora fin           [4]  ${toSqlTime(row[4])}`);
  console.log(`  Duracion min       [5]  ${num(row[5])}`);
  console.log(`  Paradas min        [6]  ${num(row[6])}`);
  console.log(`  Parada program.    [7]  ${num(row[7])}`);
  console.log(`  Velocidad linea    [8]  ${num(row[8])}`);
  console.log(`  Horas laboradas    [9]  ${num(row[9])}`);
  console.log(`  Tardanza min      [10]  ${num(row[10])}`);
  console.log(`  Productividad     [11]  ${num(row[11])}`);
  console.log(`  Velocidad neta    [12]  ${num(row[12])}`);
  console.log(`  Velocidad bruta   [13]  ${num(row[13])}`);
  console.log(`  Tolerancia cero   [14]  ${num(row[14])}`);
  console.log(`  Pieles            [15]  ${num(row[15])}`);
  console.log(`  Observacion       [21]  "${text(row[21]).slice(0, 60)}"`);
  break;
}
