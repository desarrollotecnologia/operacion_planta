/**
 * Importa operarios y asistencia PCCOM desde el Excel de novedades.
 * Ignora la hoja BONIFICACION.
 *
 * Layout hojas mensuales 2026 (ej. AGOSTO 2026):
 *   fila 24: ITEM | ID | NOMBRE | RENUNCIAS | fechas...
 *   fila 25+: datos
 *
 *   npm run import:novedades:pccom -- --dry-run
 *   npm run import:novedades:pccom
 *   npm run import:novedades:pccom -- --archivo ruta.xlsx --hasta 2026-08-31
 */
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

import { pool, query, queryOne, transaction } from './db.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEFAULT_FILE = resolve(ROOT, 'data/import/novedades-personal-pccom.xlsx');
const DEFAULT_HASTA = '2026-12-31';
const AREA_CODIGO = 'PCCOM';

const HOJAS_IGNORAR = /^BONIFICACION$/i;

const HOJAS_2026 = [
  'ENERO 2026', 'FEBRERO 2026', 'MARZO 2026', 'ABRIL 2026',
  'MAYO 2026', 'JUNIO 2026', 'JULIO 2026', 'AGOSTO 2026', 'SETIEMBRE 2026',
];

const FILA_FECHAS = 23;
const PRIMERA_FILA_DATOS = 24;
const COL_ITEM = 1;
const COL_DOCUMENTO = 2;
const COL_NOMBRE = 3;
const COL_RENUNCIAS = 4;
const COL_FIRST_DATE = 5;
const MAX_HUECO = 8;

const ESTADO_ALIASES = new Map([
  ['LABORANDO', 'LABORANDO'],
  ['DOMINGO O FESTIVO', 'DOMINGO_FESTIVO'],
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
  ['PERMISO NO REMUNERADO', 'LICENCIA_NR'],
  ['LICENCIA NO REMUNERADA', 'LICENCIA_NR'],
  ['PERMISO REMUNERADO', 'PERMISO_REMUNERADO'],
  ['LICENCIA PATERNIDAD', 'LICENCIA_PATERNIDAD'],
  ['LICENCIA DE PATERNIDAD', 'LICENCIA_PATERNIDAD'],
  ['DIA DE CERO ACCIDENTE', 'DIA_CERO_AT'],
  ['DIA DE CERO A.T.', 'DIA_CERO_AT'],
  ['INDUCCION', 'INDUCCION'],
  ['SUSPENSION', 'SUSPENSION'],
  ['SUSPENSIÓN', 'SUSPENSION'],
  ['ENTRENAMIENTO', 'ENTRENAMIENTO'],
  ['AISLAMIENTO', 'AISLAMIENTO'],
  ['LICENCIA MATRIMONIO', 'LICENCIA_MATRIMONIO'],
  ['TRABAJO EN CASA', 'TRABAJO_EN_CASA'],
]);

function parseArgs(argv) {
  const args = { archivo: DEFAULT_FILE, hasta: DEFAULT_HASTA, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--archivo' && argv[i + 1]) { args.archivo = resolve(argv[i + 1]); i += 1; }
    else if (argv[i] === '--hasta' && argv[i + 1]) { args.hasta = argv[i + 1]; i += 1; }
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  return args;
}

const cleanText = (v) =>
  v == null ? '' : String(v).replace(/\t/g, ' ').trim().replace(/\s+/g, ' ');

const claveNombre = (nombre) =>
  cleanText(nombre)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function parseItem(raw) {
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  const m = String(raw ?? '').match(/(\d+)\s*$/);
  return m ? Number(m[1]) : NaN;
}

function normalizeEstado(raw) {
  if (raw == null) return { codigo: null, bruto: null };
  const text = cleanText(raw).toUpperCase();
  if (!text || text === 'X') return { codigo: null, bruto: null };
  return { codigo: ESTADO_ALIASES.get(text) ?? null, bruto: text };
}

function toIsoDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number') {
    const p = XLSX.SSF.parse_date_code(value);
    if (!p) return null;
    return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value.trim())) {
    return value.trim().slice(0, 10);
  }
  return null;
}

function inferNombreCorto(nombreCompleto) {
  const parts = cleanText(nombreCompleto).split(' ');
  return parts.length <= 1 ? cleanText(nombreCompleto) : `${parts[0]} ${parts[parts.length - 1]}`;
}

function leerHoja(rows) {
  const header = rows[FILA_FECHAS];
  if (!header) return { fechas: [], personas: [], filasFueraBloque: [] };

  const fechas = [];
  for (let col = COL_FIRST_DATE; col < header.length; col += 1) {
    const iso = toIsoDate(header[col]);
    if (iso) fechas.push({ col, iso });
  }

  const personas = [];
  const filasFueraBloque = [];
  let hueco = 0;
  let bloqueTerminado = false;

  for (let r = PRIMERA_FILA_DATOS; r < rows.length; r += 1) {
    const row = rows[r];
    const item = parseItem(row?.[COL_ITEM]);
    const nombreCompleto = cleanText(row?.[COL_NOMBRE]);
    const valida = row && Number.isFinite(item) && item > 0 && nombreCompleto && nombreCompleto !== 'X';

    if (!valida) {
      if (personas.length) hueco += 1;
      if (hueco > MAX_HUECO) bloqueTerminado = true;
      continue;
    }

    if (bloqueTerminado) {
      filasFueraBloque.push({ fila: r + 1, item, nombreCompleto });
      continue;
    }

    hueco = 0;
    const documento = cleanText(row[COL_DOCUMENTO]).replace(/\D/g, '') || null;
    const renuncias = cleanText(row[COL_RENUNCIAS]) || null;

    personas.push({
      fila: r + 1,
      item,
      documento,
      nombreCompleto,
      nombreCorto: inferNombreCorto(nombreCompleto),
      renuncias,
      celdas: fechas.map(({ col, iso }) => ({ iso, ...normalizeEstado(row[col]) })),
    });
  }

  return { fechas, personas, filasFueraBloque };
}

async function main() {
  const { archivo, hasta, dryRun } = parseArgs(process.argv.slice(2));
  if (!existsSync(archivo)) throw new Error(`No se encontro el archivo: ${archivo}`);

  const wb = XLSX.readFile(archivo, { cellDates: true });
  const hojas = HOJAS_2026.filter((h) => wb.Sheets[h] && !HOJAS_IGNORAR.test(h));

  const personas = new Map();
  const noMapeados = new Map();
  const fueraBloque = [];
  let marcasLeidas = 0;
  let marcasFueraRango = 0;

  console.log(`Archivo: ${archivo}`);
  console.log(`Area   : ${AREA_CODIGO}`);
  console.log(`Hojas  : ${hojas.join(', ')}\n`);

  for (const hoja of hojas) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[hoja], { header: 1, defval: null, raw: true });
    const { personas: filas, filasFueraBloque } = leerHoja(rows);
    for (const f of filasFueraBloque) fueraBloque.push({ hoja, ...f });

    let enHoja = 0;
    for (const p of filas) {
      const clave = claveNombre(p.nombreCompleto);
      if (!clave) continue;

      if (!personas.has(clave)) {
        personas.set(clave, {
          nombreCompleto: p.nombreCompleto,
          nombreCorto: p.nombreCorto,
          documento: p.documento,
          renuncias: p.renuncias,
          ultimoItem: p.item,
          ultimaHoja: hoja,
          marcas: new Map(),
        });
      }
      const reg = personas.get(clave);
      reg.nombreCompleto = p.nombreCompleto;
      reg.nombreCorto = p.nombreCorto;
      reg.documento = p.documento ?? reg.documento;
      reg.renuncias = p.renuncias ?? reg.renuncias;
      reg.ultimoItem = p.item;
      reg.ultimaHoja = hoja;

      for (const celda of p.celdas) {
        if (!celda.bruto) continue;
        if (!celda.codigo) {
          noMapeados.set(celda.bruto, (noMapeados.get(celda.bruto) ?? 0) + 1);
          continue;
        }
        if (celda.iso < '2026-01-01' || celda.iso > hasta) { marcasFueraRango += 1; continue; }
        reg.marcas.set(celda.iso, celda.codigo);
        enHoja += 1;
        marcasLeidas += 1;
      }
    }
    console.log(`  ${hoja.padEnd(16)} ${String(filas.length).padStart(3)} filas  ${String(enHoja).padStart(5)} marcas`);
  }

  const ultimaHoja = hojas[hojas.length - 1];
  const activos = [...personas.values()].filter((p) => p.ultimaHoja === ultimaHoja);
  const inactivos = [...personas.values()].filter((p) => p.ultimaHoja !== ultimaHoja);
  const marcasUnicas = [...personas.values()].reduce((acc, p) => acc + p.marcas.size, 0);

  console.log(`\nPersonas distintas   : ${personas.size}`);
  console.log(`  vigentes (${ultimaHoja}): ${activos.length}`);
  console.log(`  ya no aparecen      : ${inactivos.length}`);
  console.log(`Marcas leidas        : ${marcasLeidas}`);
  console.log(`Marcas unicas a cargar: ${marcasUnicas}  (2026-01-01 .. ${hasta})`);
  console.log(`Marcas fuera de rango : ${marcasFueraRango}`);

  if (noMapeados.size) {
    console.warn(`\nTextos no reconocidos (omitidos): ${noMapeados.size}`);
    for (const [k, n] of [...noMapeados].sort((a, b) => b[1] - a[1])) console.warn(`  "${k}": ${n}`);
  }

  if (dryRun) {
    console.log('\n--dry-run: no se escribio nada en la base.');
    return;
  }

  const area = await queryOne("SELECT id FROM cat_area WHERE codigo = ?", [AREA_CODIGO]);
  if (!area) throw new Error(`Falta el area ${AREA_CODIGO}. Ejecuta database/mysql/001_crear_base_mysql.sql.`);
  const estados = new Map((await query('SELECT id, codigo FROM cat_estado_novedad')).map((r) => [r.codigo, r.id]));

  const existentes = new Map(
    (await query('SELECT id, nombre_completo FROM operario WHERE area_id = ?', [area.id]))
      .map((r) => [claveNombre(r.nombre_completo), r.id]),
  );

  console.log('\nGuardando operarios PCCOM...');
  const idsPorClave = new Map();
  let siguienteItem = Math.max(0, ...activos.map((p) => p.ultimoItem)) + 1;

  const ordenadas = [...personas.entries()].sort((a, b) => {
    const va = a[1].ultimaHoja === ultimaHoja;
    const vb = b[1].ultimaHoja === ultimaHoja;
    if (va !== vb) return va ? -1 : 1;
    return a[1].ultimoItem - b[1].ultimoItem;
  });

  for (const [clave, p] of ordenadas) {
    const vigente = p.ultimaHoja === ultimaHoja;
    const item = vigente ? p.ultimoItem : siguienteItem++;
    const id = existentes.get(clave) ?? randomUUID();
    idsPorClave.set(clave, id);

    await query(
      `INSERT INTO operario (
         id, area_id, item_orden, puesto_texto, nombre_completo, nombre_corto,
         documento, renuncias_texto, activo
       ) VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         item_orden      = VALUES(item_orden),
         nombre_corto    = VALUES(nombre_corto),
         documento       = COALESCE(VALUES(documento), documento),
         renuncias_texto = COALESCE(VALUES(renuncias_texto), renuncias_texto),
         activo          = VALUES(activo)`,
      [
        id,
        area.id,
        item,
        cleanText(p.nombreCompleto).split(' ')[0],
        p.nombreCompleto,
        p.nombreCorto,
        p.documento,
        p.renuncias,
        vigente ? 1 : 0,
      ],
    );
  }
  console.log(`  Operarios   : ${personas.size} (${activos.length} activos, ${inactivos.length} inactivos)`);

  console.log('\nGuardando asistencia PCCOM...');
  const pendientes = [];
  for (const [clave, p] of personas) {
    const operarioId = idsPorClave.get(clave);
    for (const [fecha, codigo] of p.marcas) {
      const estadoId = estados.get(codigo);
      if (operarioId && estadoId) pendientes.push([randomUUID(), operarioId, fecha, estadoId]);
    }
  }

  const BATCH = 500;
  let guardadas = 0;
  for (let i = 0; i < pendientes.length; i += BATCH) {
    const lote = pendientes.slice(i, i + BATCH);
    await transaction(async (conn) => {
      for (const params of lote) {
        await conn.execute(
          `INSERT INTO asistencia_operario (id, operario_id, fecha, estado_id)
           VALUES (?,?,?,?)
           ON DUPLICATE KEY UPDATE estado_id = VALUES(estado_id)`,
          params,
        );
      }
    });
    guardadas += lote.length;
    process.stdout.write(`\r  Progreso    : ${guardadas} / ${pendientes.length}`);
  }
  process.stdout.write('\n');
  console.log(`  Asistencia  : ${guardadas} registros`);
  console.log('\nImportacion PCCOM completada.');
}

main()
  .catch((err) => {
    console.error(`\nFallo la importacion PCCOM: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
