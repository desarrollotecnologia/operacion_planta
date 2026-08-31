/**
 * Traduccion entre las filas de MySQL (snake_case) y los tipos que consume
 * el frontend (camelCase, definidos en src/data/mock).
 *
 * Ojo con dos desajustes historicos de nombre:
 *   tardanza_inicio_min  ->  tardanzaInicio
 *   real_val             ->  real   (REAL es palabra reservada en MySQL)
 */

/** TIME llega como "14:00:00" pero <input type="time"> trabaja con "14:00". */
const toHHMM = (time) => (typeof time === 'string' ? time.slice(0, 5) : time);

/** Completa "14:00" a "14:00:00" para que MySQL lo acepte como TIME. */
export const toSqlTime = (time) => {
  if (typeof time !== 'string' || !time) return null;
  const parts = time.split(':');
  while (parts.length < 3) parts.push('00');
  return parts.slice(0, 3).map((p) => p.padStart(2, '0')).join(':');
};

export function cierreFromRow(row) {
  return {
    id: row.id,
    fecha: row.fecha,
    totalBeneficio: Number(row.total_beneficio),
    horaInicio: toHHMM(row.hora_inicio),
    horaFin: toHHMM(row.hora_fin),
    duracionMin: Number(row.duracion_min),
    tiempoParadasMin: Number(row.tiempo_paradas_min),
    paradaProgramadaMin: Number(row.parada_programada_min),
    velocidadLinea: Number(row.velocidad_linea),
    horasLaboradas: Number(row.horas_laboradas),
    tardanzaInicio: Number(row.tardanza_inicio_min),
    productividad: Number(row.productividad),
    velocidadNeta: Number(row.velocidad_neta),
    velocidadBruta: Number(row.velocidad_bruta),
    toleranciaCero: Number(row.tolerancia_cero),
    pieles: Number(row.pieles),
    cortePierna: Number(row.corte_pierna ?? 0),
    sobrebarrigaRota: Number(row.sobrebarriga_rota ?? 0),
    coberturaGrasa: Number(row.cobertura_grasa ?? 0),
    observacion: row.observacion ?? '',
    mes: row.mes,
    anio: Number(row.anio),
  };
}

export function operarioFromRow(row) {
  return {
    id: row.id,
    area: row.area_codigo,
    itemOrden: Number(row.item_orden),
    puesto: row.puesto_texto ?? row.puesto_nombre ?? '',
    nombreCompleto: row.nombre_completo,
    nombreCorto: row.nombre_corto ?? '',
    documento: row.documento ?? undefined,
    activo: Boolean(row.activo),
    fechaIngreso: row.fecha_ingreso ?? undefined,
  };
}

export function asistenciaFromRow(row) {
  return {
    operarioId: row.operario_id,
    fecha: row.fecha,
    estadoCodigo: row.estado_codigo,
  };
}

export function consolidadoFromRow(row) {
  return {
    fecha: row.fecha,
    totalBeneficio: Number(row.total_beneficio),
    horaInicio: toHHMM(row.hora_inicio),
    horaFin: toHHMM(row.hora_fin),
    totalParosHr: Number(row.total_paros_hr),
    duracionHr: Number(row.duracion_hr),
    rendimientoBruto: row.rendimiento_bruto === null ? null : Number(row.rendimiento_bruto),
    rendimientoNeto: row.rendimiento_neto === null ? null : Number(row.rendimiento_neto),
    personalAsignado: row.personal_asignado === null ? null : Number(row.personal_asignado),
    personalContratado: row.personal_contratado === null ? null : Number(row.personal_contratado),
    novedades: row.novedades_texto ?? '',
    anio: Number(row.anio),
    mes: row.mes,
  };
}

export function estadoFromRow(row) {
  return {
    codigo: row.codigo,
    nombre: row.nombre,
    esAusentismo: Boolean(row.es_ausentismo),
  };
}
