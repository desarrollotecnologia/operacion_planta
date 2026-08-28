/**
 * Inspeccion en seco del Excel de novedades. No escribe nada en la base.
 *
 * Reporta que se importaria y, sobre todo, que textos del Excel NO se
 * reconocen: el importador los descarta en silencio, asi que sin este
 * listado no habria forma de notar datos perdidos.
 *
 *   node server/inspect-novedades.mjs [ruta.xlsx] [hasta]
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const archivo = resolve(process.argv[2] ?? resolve(ROOT, 'data/import/novedades-personal-linea.xlsx'));
const HASTA = process.argv[3] ?? '2026-08-27';

const ESTADO_ALIASES = new Set([
  'LABORANDO', 'DOMINGO Y FESTIVO', 'INCAPACIDAD', 'INCAPACIDAD LARGA', 'VACACIONES',
  'REUBICADO', 'PDTE POR CONTRATAR', 'PDTE X CONTRATAR', 'PENDIENTE POR CONTRATAR',
  'DIA DE LA FAMILIA', 'AMORTIZAR EXTRAS', 'RENUNCIA', 'CALAMIDAD', 'COMPENSATORIO',
  'AUSENTISMO', 'LICENCIA NO REMUNERADA', 'DIA DE CERO A.T.', 'INDUCCION', 'SUSPENSION',
  'SUSPENSIÓN', 'ENTRENAMIENTO', 'PERMISO REMUNERADO', 'LICENCIA DE PATERNIDAD',
]);

const toIso = (v) => {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
  }
  if (typeof v === 'number') {
    const p = XLSX.SSF.parse_date_code(v);
    if (!p) return null;
    return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
  }
  return null;
};

const limpiar = (v) => (v == null ? '' : String(v).replace(/\t/g, ' ').trim().replace(/\s+/g, ' '));

if (!existsSync(archivo)) {
  console.error(`No se encontro: ${archivo}`);
  process.exit(1);
}

const wb = XLSX.readFile(archivo, { cellDates: true });
console.log(`Archivo: ${archivo}`);
console.log(`Hojas (${wb.SheetNames.length}): ${wb.SheetNames.join(' | ')}\n`);

const HOJAS = [
  'ENERO 2026', 'FEBRERO 2026', 'MARZO 2026', 'ABRIL 2026',
  'MAYO 2026', 'JUNIO 2026', 'JULIO 2026', 'AGOSTO 2026',
];

const operarios = new Map();
const desconocidos = new Map();
const reconocidos = new Map();
let totalDentroRango = 0;
let totalFueraRango = 0;
let maxFecha = '';

for (const hoja of HOJAS) {
  const sheet = wb.Sheets[hoja];
  if (!sheet) {
    console.log(`  ${hoja.padEnd(15)} HOJA NO ENCONTRADA`);
    continue;
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  const header = rows[28];
  if (!header) {
    console.log(`  ${hoja.padEnd(15)} sin fila de fechas en la posicion esperada (fila 29)`);
    continue;
  }

  const fechas = [];
  for (let col = 4; col < header.length; col += 1) {
    const iso = toIso(header[col]);
    if (iso) fechas.push({ col, iso });
  }

  let dentro = 0;
  let fuera = 0;
  let nOps = 0;

  for (let r = 29; r < rows.length; r += 1) {
    const row = rows[r];
    if (!row) continue;
    const item = Number(row[1]);
    const nombre = limpiar(row[2]);
    if (!Number.isFinite(item) || item <= 0 || !nombre || nombre === 'X') continue;

    operarios.set(item, nombre);
    nOps += 1;

    for (const { col, iso } of fechas) {
      const bruto = limpiar(row[col]).toUpperCase();
      if (!bruto || bruto === 'X') continue;

      if (ESTADO_ALIASES.has(bruto)) reconocidos.set(bruto, (reconocidos.get(bruto) ?? 0) + 1);
      else desconocidos.set(bruto, (desconocidos.get(bruto) ?? 0) + 1);

      if (iso <= HASTA) { dentro += 1; if (iso > maxFecha) maxFecha = iso; }
      else fuera += 1;
    }
  }

  const rango = fechas.length ? `${fechas[0].iso} a ${fechas[fechas.length - 1].iso}` : 'sin fechas';
  console.log(`  ${hoja.padEnd(15)} ${String(nOps).padStart(3)} operarios  ${String(fechas.length).padStart(2)} dias (${rango})  ${String(dentro).padStart(5)} marcas`);
  totalDentroRango += dentro;
  totalFueraRango += fuera;
}

console.log(`\nOperarios distintos          : ${operarios.size}`);
console.log(`Marcas a importar (<= ${HASTA}) : ${totalDentroRango}`);
console.log(`Marcas posteriores (omitidas): ${totalFueraRango}`);
console.log(`Fecha mas reciente a importar: ${maxFecha || '-'}`);

console.log(`\nEstados reconocidos (${reconocidos.size}):`);
for (const [k, v] of [...reconocidos].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(5)}  ${k}`);
}

if (desconocidos.size) {
  console.log(`\n*** ATENCION: ${desconocidos.size} textos NO reconocidos, se perderian ***`);
  for (const [k, v] of [...desconocidos].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(5)}  "${k}"`);
  }
} else {
  console.log('\nTodos los textos del Excel estan mapeados.');
}
