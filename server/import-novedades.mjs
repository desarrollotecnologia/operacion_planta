/**
 * Importa operarios y asistencia desde el Excel de novedades de personal.
 *
 * Alcance por defecto: hojas ENERO–AGOSTO 2026, asistencia hasta 2026-08-27.
 *
 *   npm run import:novedades
 *   npm run import:novedades -- --archivo ruta/al.xlsx --hasta 2026-08-27
 */
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

import { pool, query, queryOne, transaction } from './db.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEFAULT_FILE = resolve(ROOT, 'data/import/novedades-personal-linea.xlsx');
const DEFAULT_HASTA = '2026-08-27';

const HOJAS_2026 = [
  'ENERO 2026',
  'FEBRERO 2026',
  'MARZO 2026',
  'ABRIL 2026',
  'MAYO 2026',
  'JUNIO 2026',
  'JULIO 2026',
  'AGOSTO 2026',
];

/** Texto del Excel → codigo en cat_estado_novedad */
const ESTADO_ALIASES = new Map([
  ['LABORANDO', 'LABORANDO'],
  ['DOMINGO Y FESTIVO', 'DOMINGO_FESTIVO'],
  ['INCAPACIDAD', 'INCAPACIDAD'],
  ['INCAPACIDAD LARGA', 'INCAPACIDAD_LARGA'],
  ['VACACIONES', 'VACACIONES'],
  ['REUBICADO', 'REUBICADO'],
  ['PDTE POR CONTRATAR', 'PDTE_CONTRATAR'],
  ['PDTE X CONTRATAR', 'PDTE_CONTRATAR'],
  ['PENDIENTE POR CONTRATAR', 'PDTE_CONTRATAR'],
  ['DIA DE LA FAMILIA', 'DIA_FAMILIA'],
  ['AMORTIZAR EXTRAS', 'AMORTIZAR_EXTRAS'],
  ['RENUNCIA', 'RENUNCIA'],
  ['CALAMIDAD', 'CALAMIDAD'],
  ['COMPENSATORIO', 'COMPENSATORIO'],
  ['AUSENTISMO', 'AUSENTISMO'],
  ['LICENCIA NO REMUNERADA', 'LICENCIA_NR'],
  ['DIA DE CERO A.T.', 'DIA_CERO_AT'],
  ['INDUCCION', 'INDUCCION'],
  ['SUSPENSION', 'SUSPENSION'],
  ['SUSPENSIÓN', 'SUSPENSION'],
  ['ENTRENAMIENTO', 'ENTRENAMIENTO'],
  ['PERMISO REMUNERADO', 'PERMISO_REMUNERADO'],
  ['LICENCIA DE PATERNIDAD', 'LICENCIA_PATERNIDAD'],
]);

function parseArgs(argv) {
  const args = { archivo: DEFAULT_FILE, hasta: DEFAULT_HASTA };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--archivo' && argv[i + 1]) {
      args.archivo = resolve(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--hasta' && argv[i + 1]) {
      args.hasta = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function normalizeEstado(raw) {
  if (raw == null) return null;
  const text = String(raw).trim().replace(/\s+/g, ' ').toUpperCase();
  if (!text || text === 'X') return null;
  return ESTADO_ALIASES.get(text) ?? null;
}

function parseItem(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

function toIsoDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const m = String(parsed.m).padStart(2, '0');
    const d = String(parsed.d).padStart(2, '0');
    return `${parsed.y}-${m}-${d}`;
  }
  return null;
}

function cleanText(value) {
  if (value == null) return '';
  return String(value).replace(/\t/g, ' ').trim().replace(/\s+/g, ' ');
}

function isShortName(value) {
  const text = cleanText(value);
  if (!text || text === 'X') return '';
  if (/^\d+(\.\d+)?$/.test(text)) return '';
  return text;
}

function inferPuesto(nombreCompleto) {
  const parts = cleanText(nombreCompleto).split(' ');
  return parts[0] ?? '';
}

function inferNombreCorto(nombreCompleto, nombreCorto) {
  const corto = isShortName(nombreCorto);
  if (corto) return corto;
  const parts = cleanText(nombreCompleto).split(' ');
  if (parts.length <= 1) return cleanText(nombreCompleto);
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

/** Fila 29 (index 28): fechas desde columna E en adelante. */
function readSheetMatrix(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
}

function extractOperariosFromSheet(rows, operarios) {
  const header = rows[28];
  if (!header) return { fechas: [], asistencias: [] };

  const fechas = [];
  for (let col = 4; col < header.length; col += 1) {
    const iso = toIsoDate(header[col]);
    if (iso) fechas.push({ col, iso });
  }

  const asistencias = [];

  for (let rowIdx = 29; rowIdx < rows.length; rowIdx += 1) {
    const row = rows[rowIdx];
    if (!row) continue;

    const item = parseItem(row[1]);
    const nombreCompleto = cleanText(row[2]);
    if (!item || !nombreCompleto || nombreCompleto === 'X') continue;

    const puesto = inferPuesto(nombreCompleto);
    const corto = inferNombreCorto(nombreCompleto, row[3]);

    operarios.set(item, {
      itemOrden: item,
      puesto,
      nombreCompleto,
      nombreCorto: corto,
    });

    for (const { col, iso } of fechas) {
      const codigo = normalizeEstado(row[col]);
      if (!codigo) continue;
      asistencias.push({ itemOrden: item, fecha: iso, estadoCodigo: codigo });
    }
  }

  return { fechas, asistencias };
}

async function loadEstados() {
  const rows = await query('SELECT id, codigo FROM cat_estado_novedad');
  const map = new Map(rows.map((r) => [r.codigo, r.id]));
  return map;
}

async function upsertOperarios(areaId, operarios, idsByItem) {
  let count = 0;
  for (const op of [...operarios.values()].sort((a, b) => a.itemOrden - b.itemOrden)) {
    let id = idsByItem.get(op.itemOrden);
    if (!id) {
      id = randomUUID();
      idsByItem.set(op.itemOrden, id);
    }

    await query(
      `INSERT INTO operario (id, area_id, item_orden, puesto_texto, nombre_completo, nombre_corto, activo)
       VALUES (?,?,?,?,?,?,1)
       ON DUPLICATE KEY UPDATE
         puesto_texto    = VALUES(puesto_texto),
         nombre_completo = VALUES(nombre_completo),
         nombre_corto    = VALUES(nombre_corto),
         activo          = 1`,
      [id, areaId, op.itemOrden, op.puesto, op.nombreCompleto, op.nombreCorto],
    );
    count += 1;
  }
  return count;
}

async function upsertAsistenciaBatch(batch, idsByItem, estadosByCodigo) {
  if (!batch.length) return 0;

  await transaction(async (conn) => {
    for (const row of batch) {
      const operarioId = idsByItem.get(row.itemOrden);
      const estadoId = estadosByCodigo.get(row.estadoCodigo);
      if (!operarioId || !estadoId) continue;

      await conn.execute(
        `INSERT INTO asistencia_operario (id, operario_id, fecha, estado_id)
         VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE estado_id = VALUES(estado_id)`,
        [randomUUID(), operarioId, row.fecha, estadoId],
      );
    }
  });

  return batch.length;
}

async function main() {
  const { archivo, hasta } = parseArgs(process.argv.slice(2));

  if (!existsSync(archivo)) {
    throw new Error(`No se encontro el archivo: ${archivo}`);
  }

  const area = await queryOne("SELECT id FROM cat_area WHERE codigo = 'LINEA'");
  if (!area) {
    throw new Error("Falta el catalogo de areas. Ejecuta database/mysql/deploy_205.ps1 primero.");
  }

  const estadosByCodigo = await loadEstados();
  if (!estadosByCodigo.size) {
    throw new Error('Faltan estados de novedad en la base de datos.');
  }

  const wb = XLSX.readFile(archivo, { cellDates: true });
  const operarios = new Map();
  const allAsistencias = [];
  const estadosDesconocidos = new Map();

  for (const hoja of HOJAS_2026) {
    const sheet = wb.Sheets[hoja];
    if (!sheet) {
      console.warn(`  [omitida] Hoja no encontrada: ${hoja}`);
      continue;
    }

    const rows = readSheetMatrix(sheet);
    const { asistencias } = extractOperariosFromSheet(rows, operarios);

    const filtradas = asistencias.filter((a) => a.fecha <= hasta);
    for (const a of asistencias) {
      if (!estadosByCodigo.has(a.estadoCodigo)) {
        estadosDesconocidos.set(a.estadoCodigo, (estadosDesconocidos.get(a.estadoCodigo) ?? 0) + 1);
      }
    }

    allAsistencias.push(...filtradas);
    console.log(`  ${hoja}: ${filtradas.length} registros de asistencia`);
  }

  const idsByItem = new Map(
    (await query('SELECT id, item_orden FROM operario WHERE area_id = ?', [area.id])).map((r) => [
      r.item_orden,
      r.id,
    ]),
  );

  console.log('\nImportando operarios...');
  const numOperarios = await upsertOperarios(area.id, operarios, idsByItem);
  console.log(`  Operarios   : ${numOperarios}`);

  console.log('\nImportando asistencia...');
  const BATCH = 400;
  let totalAsistencia = 0;
  for (let i = 0; i < allAsistencias.length; i += BATCH) {
    const slice = allAsistencias.slice(i, i + BATCH).filter((a) => estadosByCodigo.has(a.estadoCodigo));
    totalAsistencia += await upsertAsistenciaBatch(slice, idsByItem, estadosByCodigo);
    process.stdout.write(`\r  Progreso    : ${Math.min(i + BATCH, allAsistencias.length)} / ${allAsistencias.length}`);
  }
  process.stdout.write('\n');
  console.log(`  Asistencia  : ${totalAsistencia} registros (hasta ${hasta})`);

  if (estadosDesconocidos.size) {
    console.warn('\nEstados no mapeados (omitidos):');
    for (const [codigo, n] of [...estadosDesconocidos.entries()].sort((a, b) => b[1] - a[1])) {
      console.warn(`  - ${codigo}: ${n}`);
    }
  }

  console.log('\nImportacion completada.');
}

main()
  .catch((err) => {
    console.error(`\nFallo la importacion: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
