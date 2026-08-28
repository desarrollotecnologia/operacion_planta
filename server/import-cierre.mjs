/**
 * Importa datos del Excel CIERRE DIARIO DE BENEFICIO.
 *
 * Hojas usadas:
 *   BASE DE DATOS CIERRE  -> cierre_diario, simulacion_dia, cierre_proceso_detalle
 *   CONSOLIDADO DE CIERRE -> personal_dia (+ novedad_resumen_dia por conteos)
 *
 * Tras importar cierres, sincroniza novedad_resumen_dia desde asistencia_operario
 * (si ya corrió import:novedades).
 *
 *   npm run import:cierre
 *   npm run import:cierre -- --hasta 2026-08-27
 */
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

import { pool, query, queryOne } from './db.mjs';
import {
  addMinutesToTime,
  num,
  readSheetRows,
  text,
  toIsoDate,
  toSqlTime,
} from './xlsx-utils.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEFAULT_FILE = resolve(ROOT, 'data/import/cierre-diario-beneficio.xlsx');
const DEFAULT_HASTA = '2026-08-27';
const DEFAULT_DESDE = '2026-01-01';

/** CONSOLIDADO col index -> codigo estado */
const CONSOLIDADO_ESTADOS = [
  [14, 'COMPENSATORIO'],
  [15, 'PERMISO_REMUNERADO'],
  [16, 'AUSENTISMO'],
  [17, 'RENUNCIA'],
  [18, 'INCAPACIDAD'],
  [19, 'CALAMIDAD'],
  [20, 'PDTE_CONTRATAR'],
  [21, 'VACACIONES'],
  [22, 'SUSPENSION'],
  [23, 'REUBICADO'],
  [24, 'LICENCIA_NR'],
  [25, 'AMORTIZAR_EXTRAS'],
  [26, 'DIA_CERO_AT'],
  [27, 'INDUCCION'],
  [28, 'DIA_FAMILIA'],
];

function parseArgs(argv) {
  const args = { archivo: DEFAULT_FILE, hasta: DEFAULT_HASTA, desde: DEFAULT_DESDE };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--archivo' && argv[i + 1]) {
      args.archivo = resolve(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--hasta' && argv[i + 1]) {
      args.hasta = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--desde' && argv[i + 1]) {
      args.desde = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function inRange(fecha, desde, hasta) {
  return fecha >= desde && fecha <= hasta;
}

function parseBaseRow(row) {
  const fecha = toIsoDate(row[0]);
  if (!fecha) return null;

  const total = num(row[2]);
  if (total <= 0) return null;

  const horaInicio = toSqlTime(row[3]);
  if (!horaInicio) return null;

  let horaFin = toSqlTime(row[4]);
  const duracionMin = num(row[5]);
  if (!horaFin) {
    horaFin = addMinutesToTime(horaInicio, duracionMin) ?? horaInicio;
  }

  return {
    fecha,
    oeeDia: num(row[1]) || null,
    total_beneficio: Math.round(total),
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    tiempo_paradas_min: Math.round(num(row[6])),
    parada_programada_min: Math.round(num(row[7])),
    velocidad_linea: num(row[8]),
    horas_laboradas: num(row[9]),
    tardanza_inicio_min: Math.round(num(row[10])),
    productividad: num(row[11]),
    velocidad_neta: num(row[12]),
    velocidad_bruta: num(row[13]),
    tolerancia_cero: num(row[14]),
    pieles: num(row[15]),
    observacion: text(row[21]),
  };
}

function simulacionFromCierre(cierre) {
  const reses = cierre.total_beneficio;
  const velBruta = cierre.velocidad_bruta || cierre.velocidad_linea || 75;
  const paradaHr = cierre.parada_programada_min / 60;
  const duracionDeseada = velBruta > 0 ? reses / velBruta : cierre.horas_laboradas;
  const duracionEfectiva = cierre.horas_laboradas || Math.max(duracionDeseada - paradaHr, 0);
  const vaciadoHr = Math.max(duracionDeseada - duracionEfectiva - paradaHr, 0);
  const duracionNoqueo = Math.max(duracionEfectiva - vaciadoHr, 0);
  const velNeta = cierre.velocidad_neta || (duracionEfectiva > 0 ? reses / duracionEfectiva : 0);
  const velNoqueo = duracionNoqueo > 0 ? reses / duracionNoqueo : velNeta;
  const resesPorMin = duracionEfectiva > 0 ? reses / (duracionEfectiva * 60) : 0;
  const segPorRes = resesPorMin > 0 ? Math.round(60 / resesPorMin) : null;

  return {
    reses,
    velocidad_bruta: velBruta,
    parada_programada_hr: paradaHr,
    vaciado_linea_hr: Number(vaciadoHr.toFixed(4)),
    hora_inicio: cierre.hora_inicio,
    duracion_deseada_hr: Number(duracionDeseada.toFixed(4)),
    duracion_efectiva_hr: Number(duracionEfectiva.toFixed(4)),
    duracion_noqueo_hr: Number(duracionNoqueo.toFixed(4)),
    velocidad_neta: Number(velNeta.toFixed(2)),
    velocidad_neta_noqueo: Number(velNoqueo.toFixed(2)),
    reses_por_min: Number(resesPorMin.toFixed(4)),
    segundos_por_res: segPorRes,
  };
}

async function upsertCierre(data) {
  await query(
    `INSERT INTO cierre_diario (
       fecha, total_beneficio, hora_inicio, hora_fin, tiempo_paradas_min,
       parada_programada_min, velocidad_linea, horas_laboradas, tardanza_inicio_min,
       productividad, velocidad_neta, velocidad_bruta, tolerancia_cero, pieles, observacion
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       total_beneficio       = VALUES(total_beneficio),
       hora_inicio           = VALUES(hora_inicio),
       hora_fin              = VALUES(hora_fin),
       tiempo_paradas_min    = VALUES(tiempo_paradas_min),
       parada_programada_min = VALUES(parada_programada_min),
       velocidad_linea       = VALUES(velocidad_linea),
       horas_laboradas       = VALUES(horas_laboradas),
       tardanza_inicio_min   = VALUES(tardanza_inicio_min),
       productividad         = VALUES(productividad),
       velocidad_neta        = VALUES(velocidad_neta),
       velocidad_bruta       = VALUES(velocidad_bruta),
       tolerancia_cero       = VALUES(tolerancia_cero),
       pieles                = VALUES(pieles),
       observacion           = VALUES(observacion)`,
    [
      data.fecha, data.total_beneficio, data.hora_inicio, data.hora_fin,
      data.tiempo_paradas_min, data.parada_programada_min, data.velocidad_linea,
      data.horas_laboradas, data.tardanza_inicio_min, data.productividad,
      data.velocidad_neta, data.velocidad_bruta, data.tolerancia_cero,
      data.pieles, data.observacion,
    ],
  );
  return queryOne('SELECT id FROM cierre_diario WHERE fecha = ?', [data.fecha]);
}

async function upsertSimulacion(cierreId, sim) {
  await query(
    `INSERT INTO simulacion_dia (
       id, cierre_id, reses, velocidad_bruta, parada_programada_hr, vaciado_linea_hr,
       hora_inicio, duracion_deseada_hr, duracion_efectiva_hr, duracion_noqueo_hr,
       velocidad_neta, velocidad_neta_noqueo, reses_por_min, segundos_por_res
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       reses = VALUES(reses),
       velocidad_bruta = VALUES(velocidad_bruta),
       parada_programada_hr = VALUES(parada_programada_hr),
       vaciado_linea_hr = VALUES(vaciado_linea_hr),
       hora_inicio = VALUES(hora_inicio),
       duracion_deseada_hr = VALUES(duracion_deseada_hr),
       duracion_efectiva_hr = VALUES(duracion_efectiva_hr),
       duracion_noqueo_hr = VALUES(duracion_noqueo_hr),
       velocidad_neta = VALUES(velocidad_neta),
       velocidad_neta_noqueo = VALUES(velocidad_neta_noqueo),
       reses_por_min = VALUES(reses_por_min),
       segundos_por_res = VALUES(segundos_por_res)`,
    [
      randomUUID(), cierreId, sim.reses, sim.velocidad_bruta, sim.parada_programada_hr,
      sim.vaciado_linea_hr, sim.hora_inicio, sim.duracion_deseada_hr, sim.duracion_efectiva_hr,
      sim.duracion_noqueo_hr, sim.velocidad_neta, sim.velocidad_neta_noqueo,
      sim.reses_por_min, sim.segundos_por_res,
    ],
  );
}

async function upsertCierreProceso(cierreId, oeeDia, observacion) {
  await query(
    `INSERT INTO cierre_proceso_detalle (id, cierre_id, oee_dia, observaciones_proceso)
     VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE
       oee_dia = VALUES(oee_dia),
       observaciones_proceso = VALUES(observaciones_proceso)`,
    [randomUUID(), cierreId, oeeDia, observacion || null],
  );
}

async function upsertPersonalDia(cierreId, areaId, data) {
  await query(
    `INSERT INTO personal_dia (
       id, cierre_id, area_id, personal_asignado, personal_contratado, compensatorio, permiso
     ) VALUES (?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       personal_asignado   = VALUES(personal_asignado),
       personal_contratado = VALUES(personal_contratado),
       compensatorio       = VALUES(compensatorio),
       permiso             = VALUES(permiso)`,
    [
      randomUUID(), cierreId, areaId,
      data.personal_asignado, data.personal_contratado,
      data.compensatorio, data.permiso,
    ],
  );
}

async function upsertNovedadResumen(cierreId, areaId, item, estadoId, personas, pct, colaboradores) {
  if (personas <= 0) return;
  await query(
    `INSERT INTO novedad_resumen_dia (
       id, cierre_id, area_id, item, estado_id, personas, pct, colaboradores
     ) VALUES (?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       personas = VALUES(personas),
       pct = VALUES(pct),
       colaboradores = VALUES(colaboradores)`,
    [randomUUID(), cierreId, areaId, item, estadoId, personas, pct, colaboradores ?? null],
  );
}

async function syncNovedadFromAsistencia(areaLineaId, estadosByCodigo, desde, hasta) {
  const rows = await query(
    `SELECT c.id AS cierre_id, c.fecha, v.estado_codigo, v.cantidad, v.colaboradores
       FROM cierre_diario c
       JOIN vw_resumen_novedades_dia v ON v.fecha = c.fecha
       JOIN cat_area a ON a.id = v.area_id AND a.codigo = 'LINEA'
      WHERE c.fecha >= ? AND c.fecha <= ?
      ORDER BY c.fecha, v.estado_codigo`,
    [desde, hasta],
  );

  let item = 0;
  let currentFecha = null;
  let count = 0;

  for (const row of rows) {
    if (row.fecha !== currentFecha) {
      currentFecha = row.fecha;
      item = 0;
      await query(
        'DELETE FROM novedad_resumen_dia WHERE cierre_id = ? AND area_id = ?',
        [row.cierre_id, areaLineaId],
      );
    }

    const estadoId = estadosByCodigo.get(row.estado_codigo);
    if (!estadoId) continue;

    item += 1;
    const personas = Number(row.cantidad);
    const totalRow = await queryOne(
      `SELECT SUM(cantidad) AS total FROM vw_resumen_novedades_dia v
        JOIN cat_area a ON a.id = v.area_id
       WHERE v.fecha = ? AND a.codigo = 'LINEA'`,
      [row.fecha],
    );
    const total = Number(totalRow?.total) || personas || 1;

    await upsertNovedadResumen(
      row.cierre_id,
      areaLineaId,
      item,
      estadoId,
      personas,
      personas / total,
      row.colaboradores,
    );
    count += 1;
  }

  return count;
}

async function importBaseDatos(wb, desde, hasta) {
  const rows = readSheetRows(wb, 'BASE DE DATOS CIERRE');
  if (!rows) throw new Error('Falta la hoja BASE DE DATOS CIERRE.');

  let cierres = 0;
  let simulaciones = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const parsed = parseBaseRow(rows[i]);
    if (!parsed || !inRange(parsed.fecha, desde, hasta)) continue;

    const { oeeDia, ...cierreData } = parsed;
    const cierreRow = await upsertCierre(cierreData);
    cierres += 1;

    await upsertSimulacion(cierreRow.id, simulacionFromCierre(parsed));
    simulaciones += 1;

    await upsertCierreProceso(cierreRow.id, oeeDia, parsed.observacion);
  }

  return { cierres, simulaciones };
}

async function importConsolidado(wb, desde, hasta, areaLineaId, estadosByCodigo) {
  const rows = readSheetRows(wb, 'CONSOLIDADO DE CIERRE');
  if (!rows) throw new Error('Falta la hoja CONSOLIDADO DE CIERRE.');

  let personal = 0;
  let resumenes = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const fecha = toIsoDate(row[0]);
    if (!fecha || !inRange(fecha, desde, hasta)) continue;

    const totalBeneficio = num(row[1]);
    if (totalBeneficio <= 0) continue;

    let cierreRow = await queryOne('SELECT id FROM cierre_diario WHERE fecha = ?', [fecha]);
    if (!cierreRow) continue;

    const personalData = {
      personal_asignado: Math.round(num(row[12])),
      personal_contratado: Math.round(num(row[13])),
      compensatorio: Math.round(num(row[14])),
      permiso: Math.round(num(row[15])),
    };

    if (personalData.personal_asignado > 0) {
      await upsertPersonalDia(cierreRow.id, areaLineaId, personalData);
      personal += 1;
    }

    const presente = Math.round(num(row[29]));
    const base = personalData.personal_contratado || personalData.personal_asignado || presente || 1;

    let item = 0;
    for (const [colIdx, codigo] of CONSOLIDADO_ESTADOS) {
      const cantidad = Math.round(num(row[colIdx]));
      if (cantidad <= 0) continue;
      const estadoId = estadosByCodigo.get(codigo);
      if (!estadoId) continue;
      item += 1;
      await upsertNovedadResumen(
        cierreRow.id,
        areaLineaId,
        item,
        estadoId,
        cantidad,
        cantidad / base,
        null,
      );
      resumenes += 1;
    }

    if (presente > 0) {
      const laborandoId = estadosByCodigo.get('LABORANDO');
      if (laborandoId) {
        item += 1;
        await upsertNovedadResumen(
          cierreRow.id,
          areaLineaId,
          item,
          laborandoId,
          presente,
          presente / base,
          null,
        );
        resumenes += 1;
      }
    }
  }

  return { personal, resumenes };
}

async function main() {
  const { archivo, hasta, desde } = parseArgs(process.argv.slice(2));

  if (!existsSync(archivo)) {
    throw new Error(`No se encontro el archivo: ${archivo}`);
  }

  const areaLinea = await queryOne("SELECT id FROM cat_area WHERE codigo = 'LINEA'");
  if (!areaLinea) {
    throw new Error('Falta el catalogo de areas. Ejecuta database/mysql/deploy_205.ps1 primero.');
  }

  const estados = await query('SELECT id, codigo FROM cat_estado_novedad');
  const estadosByCodigo = new Map(estados.map((e) => [e.codigo, e.id]));

  console.log(`Archivo : ${archivo}`);
  console.log(`Rango   : ${desde} -> ${hasta}`);
  console.log('');

  const wb = XLSX.readFile(archivo, { cellDates: true });

  console.log('Paso 1/3 - BASE DE DATOS CIERRE + simulacion + detalle');
  const base = await importBaseDatos(wb, desde, hasta);
  console.log(`  Cierres     : ${base.cierres}`);
  console.log(`  Simulacion  : ${base.simulaciones}`);

  console.log('');
  console.log('Paso 2/3 - CONSOLIDADO DE CIERRE (personal + resumen)');
  const cons = await importConsolidado(wb, desde, hasta, areaLinea.id, estadosByCodigo);
  console.log(`  Personal    : ${cons.personal} dias`);
  console.log(`  Resumenes   : ${cons.resumenes} filas`);

  console.log('');
  console.log('Paso 3/3 - Sincronizar novedades desde asistencia (si existe)');
  const sync = await syncNovedadFromAsistencia(areaLinea.id, estadosByCodigo, desde, hasta);
  console.log(`  Asistencia  : ${sync} filas (sobreescribe resumen del consolidado cuando hay matriz)`);

  console.log('');
  console.log('Importacion de cierre completada.');
}

main()
  .catch((err) => {
    console.error(`\nFallo la importacion: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
