/**
 * Persistencia de simulacion_dia y sincronizacion con cierre_diario.
 */
import { query, queryOne } from './db.mjs';
import { calcSimulacion, VACIADO_LINEA_HR } from './simulacion-calc.mjs';
import { toSqlTime } from './mappers.mjs';
import { asDate, asInt, asNumber, asTime, badRequest, notFound } from './validate.mjs';
import { getSimulacion } from './build-cierre-vista.mjs';

function parseSimulacionBody(body, fechaParam) {
  return {
    fecha: asDate(body.fecha ?? fechaParam, 'fecha'),
    reses: asInt(body.reses, 'reses', { min: 0, max: 100000 }),
    velocidadBruta: asNumber(body.velocidadBruta, 'velocidadBruta', { min: 0, max: 10000 }),
    paradaProgramadaHr: asNumber(body.paradaProgramadaHr, 'paradaProgramadaHr', {
      min: 0,
      max: 24,
      fallback: 0,
    }),
    vaciadoLineaHr: VACIADO_LINEA_HR,
    horaInicio: asTime(body.horaInicio, 'horaInicio'),
    ultimaNoqueada: '',
    ultimaPesada: '',
    resesSacrificadas: asInt(body.resesSacrificadas, 'resesSacrificadas', {
      min: 0,
      max: 100000,
      fallback: 0,
    }),
  };
}

function toHHMM(timeStr) {
  if (!timeStr?.trim()) return '';
  return timeStr.trim().slice(0, 5);
}

export async function saveSimulacion(fechaParam, body) {
  const input = parseSimulacionBody(body, fechaParam);
  if (input.fecha !== fechaParam) {
    throw badRequest('La fecha del cuerpo debe coincidir con la URL.');
  }

  const cierreRow = await queryOne(
    'SELECT id, hora_fin FROM cierre_diario WHERE fecha = ?',
    [input.fecha],
  );
  if (!cierreRow) {
    throw notFound(`No hay cierre registrado para ${input.fecha}. Cree el dia en Base de datos cierre.`);
  }

  const calc = calcSimulacion(input);
  const paradaMin = Math.round(input.paradaProgramadaHr * 60);
  const horaFin = calc.ultimaPesada ? toSqlTime(toHHMM(calc.ultimaPesada)) : cierreRow.hora_fin;
  const ultimaNoqueada = calc.ultimaNoqueada ? toSqlTime(toHHMM(calc.ultimaNoqueada)) : null;
  const ultimaPesada = calc.ultimaPesada ? toSqlTime(toHHMM(calc.ultimaPesada)) : null;

  await query(
    `UPDATE cierre_diario SET
       total_beneficio       = ?,
       hora_inicio           = ?,
       hora_fin              = ?,
       parada_programada_min = ?,
       velocidad_bruta       = ?,
       velocidad_neta        = ?,
       horas_laboradas       = ?
     WHERE id = ?`,
    [
      input.reses,
      toSqlTime(input.horaInicio),
      horaFin,
      paradaMin,
      input.velocidadBruta,
      calc.velocidadNeta,
      calc.horasLaboradas,
      cierreRow.id,
    ],
  );

  await query(
    `INSERT INTO simulacion_dia (
       cierre_id, reses, reses_sacrificadas, velocidad_bruta, parada_programada_hr, vaciado_linea_hr,
       hora_inicio, ultima_noqueada, ultima_pesada,
       duracion_deseada_hr, duracion_efectiva_hr, duracion_noqueo_hr,
       velocidad_neta, velocidad_neta_noqueo, reses_por_min, segundos_por_res
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       reses                 = VALUES(reses),
       reses_sacrificadas    = VALUES(reses_sacrificadas),
       velocidad_bruta       = VALUES(velocidad_bruta),
       parada_programada_hr  = VALUES(parada_programada_hr),
       vaciado_linea_hr      = VALUES(vaciado_linea_hr),
       hora_inicio           = VALUES(hora_inicio),
       ultima_noqueada       = VALUES(ultima_noqueada),
       ultima_pesada         = VALUES(ultima_pesada),
       duracion_deseada_hr   = VALUES(duracion_deseada_hr),
       duracion_efectiva_hr  = VALUES(duracion_efectiva_hr),
       duracion_noqueo_hr    = VALUES(duracion_noqueo_hr),
       velocidad_neta        = VALUES(velocidad_neta),
       velocidad_neta_noqueo = VALUES(velocidad_neta_noqueo),
       reses_por_min         = VALUES(reses_por_min),
       segundos_por_res      = VALUES(segundos_por_res)`,
    [
      cierreRow.id,
      input.reses,
      input.resesSacrificadas,
      input.velocidadBruta,
      input.paradaProgramadaHr,
      input.vaciadoLineaHr,
      toSqlTime(input.horaInicio),
      ultimaNoqueada,
      ultimaPesada,
      calc.duracionDeseadaHr,
      calc.duracionEfectivaHr,
      calc.duracionNoqueoHr,
      calc.velocidadNeta,
      calc.velocidadNetaNoqueo,
      calc.resesPorMin,
      calc.segundosPorRes,
    ],
  );

  return getSimulacion(input.fecha);
}
