/**
 * Importa operarios y asistencia desde el Excel de novedades de personal.
 *
 * IDENTIDAD POR NOMBRE, NO POR ITEM.
 * En el Excel el numero de item es la posicion en una lista alfabetica: cuando
 * alguien entra o sale, todos los de abajo se corren. El item 9 es una persona
 * distinta en enero, en mayo y en agosto. Usarlo como clave atribuye la
 * asistencia a quien no corresponde, asi que la identidad es el nombre
 * normalizado y el item queda solo como orden de presentacion.
 *
 *   npm run import:novedades -- --dry-run
 *   npm run import:novedades
 *   npm run import:novedades -- --archivo ruta.xlsx --hasta 2026-08-27
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

/** Orden cronologico: la ultima hoja define la nomina vigente. */
const HOJAS_2026 = [
  'ENERO 2026', 'FEBRERO 2026', 'MARZO 2026', 'ABRIL 2026',
  'MAYO 2026', 'JUNIO 2026', 'JULIO 2026', 'AGOSTO 2026',
];

const FILA_FECHAS = 28;      // fila 29 del Excel
const PRIMERA_FILA_DATOS = 29;
/** Tras el bloque de la nomina hay filas sueltas (residuos de la hoja). */
const MAX_HUECO = 8;

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

/** Clave de identidad: sin acentos ni signos, para tolerar tildes inconsistentes. */
const claveNombre = (nombre) =>
  cleanText(nombre)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

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
  return null;
}

function inferNombreCorto(nombreCompleto, celdaCorto) {
  const corto = cleanText(celdaCorto);
  if (corto && corto !== 'X' && !/^\d+(\.\d+)?$/.test(corto)) return corto;
  const parts = cleanText(nombreCompleto).split(' ');
  return parts.length <= 1 ? cleanText(nombreCompleto) : `${parts[0]} ${parts[parts.length - 1]}`;
}

/**
 * Lee el bloque contiguo de la nomina. Se detiene tras MAX_HUECO filas
 * seguidas sin operario valido, para no arrastrar las filas sueltas que
 * quedaron muy por debajo de la tabla.
 */
function leerHoja(rows) {
  const header = rows[FILA_FECHAS];
  if (!header) return { fechas: [], personas: [], filasFueraBloque: [] };

  const fechas = [];
  for (let col = 4; col < header.length; col += 1) {
    const iso = toIsoDate(header[col]);
    if (iso) fechas.push({ col, iso });
  }

  const personas = [];
  const filasFueraBloque = [];
  let hueco = 0;
  let bloqueTerminado = false;

  for (let r = PRIMERA_FILA_DATOS; r < rows.length; r += 1) {
    const row = rows[r];
    const item = Number(row?.[1]);
    const nombreCompleto = cleanText(row?.[2]);
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
    personas.push({
      fila: r + 1,
      item,
      nombreCompleto,
      nombreCorto: inferNombreCorto(nombreCompleto, row[3]),
      celdas: fechas.map(({ col, iso }) => ({ iso, ...normalizeEstado(row[col]) })),
    });
  }

  return { fechas, personas, filasFueraBloque };
}

async function main() {
  const { archivo, hasta, dryRun } = parseArgs(process.argv.slice(2));
  if (!existsSync(archivo)) throw new Error(`No se encontro el archivo: ${archivo}`);

  const wb = XLSX.readFile(archivo, { cellDates: true });

  /** clave -> { nombreCompleto, nombreCorto, ultimoItem, ultimaHoja, marcas: Map(fecha->codigo) } */
  const personas = new Map();
  const noMapeados = new Map();
  const fueraBloque = [];
  let marcasLeidas = 0;
  let marcasFueraRango = 0;

  for (const hoja of HOJAS_2026) {
    const sheet = wb.Sheets[hoja];
    if (!sheet) { console.warn(`  [omitida] Hoja no encontrada: ${hoja}`); continue; }

    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
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
          ultimoItem: p.item,
          ultimaHoja: hoja,
          marcas: new Map(),
        });
      }
      const reg = personas.get(clave);
      // La hoja mas reciente manda para nombre, item y vigencia.
      reg.nombreCompleto = p.nombreCompleto;
      reg.nombreCorto = p.nombreCorto;
      reg.ultimoItem = p.item;
      reg.ultimaHoja = hoja;

      for (const celda of p.celdas) {
        if (!celda.bruto) continue;
        if (!celda.codigo) {
          noMapeados.set(celda.bruto, (noMapeados.get(celda.bruto) ?? 0) + 1);
          continue;
        }
        if (celda.iso > hasta) { marcasFueraRango += 1; continue; }
        reg.marcas.set(celda.iso, celda.codigo);
        enHoja += 1;
        marcasLeidas += 1;
      }
    }
    console.log(`  ${hoja.padEnd(15)} ${String(filas.length).padStart(3)} filas  ${String(enHoja).padStart(5)} marcas`);
  }

  const ultimaHoja = HOJAS_2026[HOJAS_2026.length - 1];
  const activos = [...personas.values()].filter((p) => p.ultimaHoja === ultimaHoja);
  const inactivos = [...personas.values()].filter((p) => p.ultimaHoja !== ultimaHoja);
  const marcasUnicas = [...personas.values()].reduce((acc, p) => acc + p.marcas.size, 0);

  console.log(`\nPersonas distintas   : ${personas.size}`);
  console.log(`  vigentes (${ultimaHoja}): ${activos.length}`);
  console.log(`  ya no aparecen      : ${inactivos.length}`);
  console.log(`Marcas leidas        : ${marcasLeidas}`);
  console.log(`Marcas unicas a cargar: ${marcasUnicas}  (hasta ${hasta})`);
  console.log(`Marcas posteriores omitidas: ${marcasFueraRango}`);

  if (fueraBloque.length) {
    console.warn(`\nFilas fuera del bloque de nomina (NO se importan): ${fueraBloque.length}`);
    const resumen = new Map();
    for (const f of fueraBloque) {
      const k = `${f.nombreCompleto} (item ${f.item}, fila ${f.fila})`;
      resumen.set(k, (resumen.get(k) ?? 0) + 1);
    }
    for (const [k, n] of resumen) console.warn(`  ${k} x${n} hojas`);
  }

  if (noMapeados.size) {
    console.warn(`\nTextos no reconocidos (omitidos): ${noMapeados.size}`);
    for (const [k, n] of [...noMapeados].sort((a, b) => b[1] - a[1])) console.warn(`  "${k}": ${n}`);
  }

  if (dryRun) {
    console.log('\n--dry-run: no se escribio nada en la base.');
    return;
  }

  const area = await queryOne("SELECT id FROM cat_area WHERE codigo = 'LINEA'");
  if (!area) throw new Error('Falta el catalogo de areas. Ejecuta database/mysql/deploy_205.ps1 primero.');
  const estados = new Map((await query('SELECT id, codigo FROM cat_estado_novedad')).map((r) => [r.codigo, r.id]));

  // El item del Excel se reasigna cada mes, asi que no sirve para reconocer
  // filas ya cargadas: la correspondencia se hace por nombre.
  const existentes = new Map(
    (await query('SELECT id, nombre_completo FROM operario WHERE area_id = ?', [area.id]))
      .map((r) => [claveNombre(r.nombre_completo), r.id]),
  );

  console.log('\nGuardando operarios...');
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
      `INSERT INTO operario (id, area_id, item_orden, puesto_texto, nombre_completo, nombre_corto, activo)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         item_orden   = VALUES(item_orden),
         nombre_corto = VALUES(nombre_corto),
         activo       = VALUES(activo)`,
      [id, area.id, item, cleanText(p.nombreCompleto).split(' ')[0], p.nombreCompleto, p.nombreCorto, vigente ? 1 : 0],
    );
  }
  console.log(`  Operarios   : ${personas.size} (${activos.length} activos, ${inactivos.length} inactivos)`);

  console.log('\nGuardando asistencia...');
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
  console.log('\nImportacion completada.');
}

main()
  .catch((err) => {
    console.error(`\nFallo la importacion: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
