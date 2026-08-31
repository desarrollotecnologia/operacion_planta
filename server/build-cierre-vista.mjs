/**
 * Arma las vistas de simulacion, cierre de proceso y novedades desde MySQL.
 */
import { query, queryOne } from './db.mjs';
import { cierreFromRow } from './mappers.mjs';
import { calcSimulacion } from './simulacion-calc.mjs';

const CIERRE_COLS = `
  id, fecha, total_beneficio, hora_inicio, hora_fin, duracion_min,
  tiempo_paradas_min, parada_programada_min, velocidad_linea, horas_laboradas,
  tardanza_inicio_min, productividad, velocidad_neta, velocidad_bruta,
  tolerancia_cero, pieles, observacion, mes, anio
`;

const toHHMM = (time) => (typeof time === 'string' ? time.slice(0, 5) : time);

/** Agrupa estados de asistencia en criterios de operatividad del Excel. */
const ESTADO_A_OPERATIVIDAD = {
  LABORANDO: 'OPERACION',
  DOMINGO_FESTIVO: 'OPERACION',
  ENTRENAMIENTO: 'ENTRENAMIENTO',
  INDUCCION: 'ENTRENAMIENTO',
  VACACIONES: 'VACACIONES',
  REUBICADO: 'REUBICADO',
  PDTE_CONTRATAR: 'POR CONTRATAR',
  INCAPACIDAD: 'INC, DF, SUS, PER, PAT',
  INCAPACIDAD_LARGA: 'INCAPACIDAD LARGAS',
  DIA_FAMILIA: 'INC, DF, SUS, PER, PAT',
  SUSPENSION: 'INC, DF, SUS, PER, PAT',
  PERMISO_REMUNERADO: 'INC, DF, SUS, PER, PAT',
  LICENCIA_PATERNIDAD: 'INC, DF, SUS, PER, PAT',
  LICENCIA_NR: 'INC, DF, SUS, PER, PAT',
  AUSENTISMO: 'INC, DF, SUS, PER, PAT',
  CALAMIDAD: 'INC, DF, SUS, PER, PAT',
  AMORTIZAR_EXTRAS: 'INC, DF, SUS, PER, PAT',
  COMPENSATORIO: 'INC, DF, SUS, PER, PAT',
  DIA_CERO_AT: 'INC, DF, SUS, PER, PAT',
  RENUNCIA: 'INC, DF, SUS, PER, PAT',
};

const ORDEN_OPERATIVIDAD = [
  'LIDER/APOYO',
  'OPERACION',
  'VACACIONES',
  'INC, DF, SUS, PER, PAT',
  'POR CONTRATAR',
  'REUBICADO',
  'ENTRENAMIENTO',
  'INCAPACIDAD LARGAS',
];

function simulacionInputFromRow(row) {
  return {
    reses: Number(row.reses),
    velocidadBruta: Number(row.velocidad_bruta),
    paradaProgramadaHr: Number(row.parada_programada_hr),
    vaciadoLineaHr: Number(row.vaciado_linea_hr),
    horaInicio: toHHMM(row.hora_inicio) ?? '',
    ultimaNoqueada: row.ultima_noqueada ? toHHMM(row.ultima_noqueada) : '',
    ultimaPesada: row.ultima_pesada ? toHHMM(row.ultima_pesada) : '',
  };
}

function simulacionFromRow(row, fecha) {
  if (!row) return null;
  return { fecha, ...calcSimulacion(simulacionInputFromRow(row)) };
}

function simulacionFromCierre(cierre) {
  return calcSimulacion({
    reses: cierre.total_beneficio,
    velocidadBruta: Number(cierre.velocidad_bruta) || 75,
    paradaProgramadaHr: Number(cierre.parada_programada_min) / 60,
    vaciadoLineaHr: 0,
    horaInicio: toHHMM(cierre.hora_inicio) ?? '14:00',
    ultimaNoqueada: '',
    ultimaPesada: toHHMM(cierre.hora_fin) ?? '',
  });
}

function buildOperatividad(resumenRows, base) {
  const byCriterio = new Map();
  for (const c of ORDEN_OPERATIVIDAD) {
    byCriterio.set(c, { criterio: c, real: 0, pct: 0, dia: 0, diaPct: 0, dif: 0 });
  }

  for (const r of resumenRows) {
    const criterio = ESTADO_A_OPERATIVIDAD[r.estado_codigo] ?? 'OPERACION';
    const bucket = byCriterio.get(criterio) ?? byCriterio.get('OPERACION');
    bucket.dia += Number(r.personas);
  }

  const lider = Math.max(1, Math.round(base * 0.017));
  byCriterio.get('LIDER/APOYO').real = lider;
  byCriterio.get('LIDER/APOYO').dia = lider;

  for (const bucket of byCriterio.values()) {
    if (bucket.criterio === 'LIDER/APOYO') continue;
    if (bucket.criterio === 'OPERACION') {
      bucket.real = Math.max(base - lider - 5, bucket.dia);
    } else {
      bucket.real = bucket.dia;
    }
    bucket.pct = base > 0 ? bucket.real / base : 0;
    bucket.diaPct = base > 0 ? bucket.dia / base : 0;
    bucket.dif = bucket.diaPct - bucket.pct;
  }

  byCriterio.get('LIDER/APOYO').pct = base > 0 ? lider / base : 0;
  byCriterio.get('LIDER/APOYO').diaPct = byCriterio.get('LIDER/APOYO').pct;
  byCriterio.get('LIDER/APOYO').dif = 0;

  return ORDEN_OPERATIVIDAD.map((c) => byCriterio.get(c)).filter((r) => r.real > 0 || r.dia > 0);
}

export async function getSimulacion(fecha) {
  const cierre = await queryOne(
    `SELECT id, fecha, total_beneficio, hora_inicio, hora_fin,
            parada_programada_min, velocidad_bruta
       FROM cierre_diario
      WHERE fecha = ?`,
    [fecha],
  );
  if (!cierre) return null;

  const sim = await queryOne('SELECT * FROM simulacion_dia WHERE cierre_id = ?', [cierre.id]);
  if (sim) return simulacionFromRow(sim, fecha);
  return { fecha, ...simulacionFromCierre(cierre) };
}

export async function getCierreProceso(fecha) {
  const cierreRow = await queryOne(
    `SELECT ${CIERRE_COLS} FROM cierre_diario WHERE fecha = ?`,
    [fecha],
  );
  if (!cierreRow) return null;

  const cierre = cierreFromRow(cierreRow);
  const detalle = await queryOne(
    `SELECT d.oee_mes, d.oee_dia, d.fallos_maquinaria, d.observaciones_proceso
       FROM cierre_proceso_detalle d
       JOIN cierre_diario c ON c.id = d.cierre_id
      WHERE c.fecha = ?`,
    [fecha],
  );

  const personal = await queryOne(
    `SELECT p.personal_asignado, p.personal_contratado
       FROM personal_dia p
       JOIN cierre_diario c ON c.id = p.cierre_id
       JOIN cat_area a ON a.id = p.area_id
      WHERE c.fecha = ? AND a.codigo = 'LINEA'`,
    [fecha],
  );

  const resumenRows = await query(
    `SELECT n.personas, n.pct, n.colaboradores, n.item, e.codigo AS estado_codigo, e.nombre AS estado_nombre
       FROM novedad_resumen_dia n
       JOIN cierre_diario c ON c.id = n.cierre_id
       JOIN cat_area a ON a.id = n.area_id
       JOIN cat_estado_novedad e ON e.id = n.estado_id
      WHERE c.fecha = ? AND a.codigo = 'LINEA'
      ORDER BY n.item`,
    [fecha],
  );

  const base = personal?.personal_contratado || personal?.personal_asignado || 60;
  const operatividadLinea = buildOperatividad(resumenRows, base);

  const laborandoLinea = resumenRows.map((r) => ({
    item: Number(r.item),
    criterio: r.estado_nombre.toUpperCase(),
    personas: Number(r.personas),
    pct: Number(r.pct),
    colaboradores: r.colaboradores ?? '',
  }));

  return {
    fecha: cierre.fecha,
    totalBeneficio: cierre.totalBeneficio,
    horaInicio: cierre.horaInicio,
    horaFin: cierre.horaFin,
    oeeMes: detalle?.oee_mes === null ? 0 : Number(detalle?.oee_mes ?? 0),
    oeeDia: detalle?.oee_dia === null ? 0 : Number(detalle?.oee_dia ?? 0),
    velocidadLinea: cierre.velocidadLinea,
    horasLaboradas: cierre.horasLaboradas,
    tardanzaInicio: cierre.tardanzaInicio,
    productividad: cierre.productividad,
    velocidadNeta: cierre.velocidadNeta,
    velocidadBruta: cierre.velocidadBruta,
    toleranciaCero: cierre.toleranciaCero,
    pieles: cierre.pieles,
    paradasProgramadasMin: cierre.paradaProgramadaMin,
    tiemposImproductivosMin: cierre.tiempoParadasMin,
    fallosMaquinaria: detalle?.fallos_maquinaria ?? '',
    observaciones: detalle?.observaciones_proceso ?? cierre.observacion,
    operatividadLinea,
    laborandoLinea,
    operatividadPccom: [],
  };
}

export async function getNovedades(fecha) {
  const cierreRow = await queryOne('SELECT id, mes, anio FROM cierre_diario WHERE fecha = ?', [fecha]);
  if (!cierreRow) return null;

  const personal = await queryOne(
    `SELECT p.personal_asignado, p.personal_contratado
       FROM personal_dia p
       JOIN cat_area a ON a.id = p.area_id
      WHERE p.cierre_id = ? AND a.codigo = 'LINEA'`,
    [cierreRow.id],
  );

  const resumenRows = await query(
    `SELECT e.codigo AS estado_codigo, e.nombre AS estado_nombre, n.personas, n.pct, n.colaboradores, n.item
       FROM novedad_resumen_dia n
       JOIN cat_estado_novedad e ON e.id = n.estado_id
       JOIN cat_area a ON a.id = n.area_id
      WHERE n.cierre_id = ? AND a.codigo = 'LINEA'
      ORDER BY n.item`,
    [cierreRow.id],
  );

  const presupuestados = personal?.personal_asignado ?? personal?.personal_contratado ?? 60;
  const laborandoRow = resumenRows.find((r) => r.estado_codigo === 'LABORANDO');
  const laborando = laborandoRow ? Number(laborandoRow.personas) : 0;
  const ausentismo = resumenRows
    .filter((r) => r.estado_codigo !== 'LABORANDO' && r.estado_codigo !== 'DOMINGO_FESTIVO')
    .reduce((acc, r) => acc + Number(r.personas), 0);

  const operatividad = buildOperatividad(resumenRows, presupuestados);

  return {
    fecha,
    mesHoja: `${cierreRow.mes} ${cierreRow.anio}`,
    presupuestados,
    laborando,
    ausentismo,
    resumen: resumenRows.map((r) => ({
      criterio: r.estado_nombre.toUpperCase(),
      cantidad: Number(r.personas),
      pct: Number(r.pct),
      operarios: r.colaboradores ?? '',
    })),
    operatividad,
  };
}

export async function getUltimaFecha() {
  const row = await queryOne('SELECT fecha FROM cierre_diario ORDER BY fecha DESC LIMIT 1');
  return row?.fecha ?? null;
}
