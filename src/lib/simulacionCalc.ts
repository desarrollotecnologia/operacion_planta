/** Mismas formulas que server/simulacion-calc.mjs (hoja SIMULACION). */

import type { SimulacionInput } from "../data/types";

export type { SimulacionInput };

export type SimulacionCalculada = SimulacionInput & {
  duracionDeseadaHr: number;
  duracionEfectivaHr: number;
  duracionNoqueoHr: number;
  velocidadNeta: number;
  velocidadNetaNoqueo: number;
  resesPorMin: number;
  minutosPorRes: number;
  minPorResTexto: string;
  segundosPorRes: number;
  tiempoLaborado: string;
  desfasePesadaNoqueo: string;
  horasLaboradas: number;
};

function pad2(n: number) {
  return String(Math.floor(n)).padStart(2, '0');
}

export function timeToMinutes(value: string): number | null {
  if (!value?.trim()) return null;
  const parts = value.trim().split(':').map(Number);
  if (parts.some((p) => !Number.isFinite(p))) return null;
  const [h = 0, m = 0, s = 0] = parts;
  return h * 60 + m + s / 60;
}

export function minutesToTime(totalMin: number): string {
  if (!Number.isFinite(totalMin) || totalMin < 0) return '00:00:00';
  let mins = totalMin;
  const h = Math.floor(mins / 60) % 24;
  mins -= Math.floor(mins / 60) * 60;
  const m = Math.floor(mins);
  const s = Math.round((mins - m) * 60);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export function addHoursToTime(horaInicio: string, hours: number): string {
  const startMin = timeToMinutes(horaInicio);
  if (startMin === null || !Number.isFinite(hours) || hours <= 0) return '';
  return minutesToTime(startMin + hours * 60);
}

export function subtractMinutesFromTime(time: string, minutes: number): string {
  const startMin = timeToMinutes(time);
  if (startMin === null || !Number.isFinite(minutes) || minutes <= 0) return '';
  let total = startMin - minutes;
  if (total < 0) total += 24 * 60;
  return minutesToTime(total);
}

export function toHHMM(timeStr: string): string {
  if (!timeStr?.trim()) return '';
  return timeStr.trim().slice(0, 5);
}

/** "HH:MM:SS" completo para horas de reloj o duraciones. */
export function toHMS(timeStr: string): string {
  if (!timeStr?.trim()) return '';
  const parts = timeStr.trim().split(':').map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p))) return timeStr.trim();
  const [h = 0, m = 0, s = 0] = parts;
  return `${pad2(h)}:${pad2(m)}:${pad2(Math.floor(s))}`;
}

/** Hora de reloj en formato Excel: "8:31:52 p. m." */
export function formatClockTimeAmPm(timeStr: string): string {
  const mins = timeToMinutes(timeStr);
  if (mins === null) return '';
  const totalSec = Math.round(mins * 60);
  let h = Math.floor(totalSec / 3600) % 24;
  const rem = totalSec % 3600;
  const m = Math.floor(rem / 60);
  const s = rem % 60;
  const period = h >= 12 ? 'p. m.' : 'a. m.';
  const h12 = h % 12 || 12;
  return `${h12}:${pad2(m)}:${pad2(s)} ${period}`;
}

/** fin − inicio; si cruza medianoche suma 24 h. */
export function diffTimes(fin: string, inicio: string): number | null {
  const a = timeToMinutes(fin);
  const b = timeToMinutes(inicio);
  if (a === null || b === null) return null;
  let d = a - b;
  if (d < 0) d += 24 * 60;
  return d;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

/** Valor fijo columna F — VACIADO LÍNEA (Hr) en hoja SIMULACION. */
export const VACIADO_LINEA_HR = 0.49;

/** Entero hacia arriba para mostrar sin decimales. */
export function fmtCeil(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  return String(Math.ceil(n));
}

/** Meta operativa — velocidad neta (Reses/Hr). */
export const VELOCIDAD_NETA_META = 75;

export type VelocidadNetaEstado = 'baja' | 'meta' | 'alta';

export function estadoVelocidadNeta(velocidadNeta: number): VelocidadNetaEstado {
  const v = Math.ceil(Number(velocidadNeta) || 0);
  if (v < VELOCIDAD_NETA_META) return 'baja';
  if (v === VELOCIDAD_NETA_META) return 'meta';
  return 'alta';
}

/** Minutos que se descuentan de la última pesada para obtener la última noqueada. */
export const DESFASE_NOQUEO_PESADA_MIN = 30;

export function calcSimulacion(input: SimulacionInput): SimulacionCalculada {
  const reses = Number(input.reses) || 0;
  const velocidadBruta = Number(input.velocidadBruta) || 0;
  const paradaProgramadaHr = Number(input.paradaProgramadaHr) || 0;
  const vaciadoLineaHr = VACIADO_LINEA_HR;

  const duracionDeseadaHr = velocidadBruta > 0 ? reses / velocidadBruta : 0;
  const duracionEfectivaHr = duracionDeseadaHr - paradaProgramadaHr;
  const duracionNoqueoHr = duracionEfectivaHr - vaciadoLineaHr;
  const velocidadNeta = duracionEfectivaHr > 0 ? reses / duracionEfectivaHr : 0;
  const velocidadNetaNoqueo = duracionNoqueoHr > 0 ? reses / duracionNoqueoHr : 0;
  const resesPorMin = velocidadNetaNoqueo / 60;
  const minutosPorRes = resesPorMin > 0 ? 1 / resesPorMin : 0;
  const segundosPorRes = velocidadNetaNoqueo > 0 ? Math.round(3600 / velocidadNetaNoqueo) : 0;

  // Control de tiempos (Excel SIMULACION filas 7–9): solo D7 es entrada manual.
  const ultimaPesada = addHoursToTime(input.horaInicio, duracionDeseadaHr);
  const ultimaNoqueada = ultimaPesada
    ? subtractMinutesFromTime(ultimaPesada, DESFASE_NOQUEO_PESADA_MIN)
    : '';
  const tiempoLaborado = duracionDeseadaHr > 0 ? minutesToTime(duracionDeseadaHr * 60) : '';
  const desfaseMin =
    ultimaPesada && ultimaNoqueada ? diffTimes(ultimaPesada, ultimaNoqueada) : null;

  return {
    ...input,
    ultimaNoqueada,
    ultimaPesada,
    vaciadoLineaHr: VACIADO_LINEA_HR,
    duracionDeseadaHr: r4(duracionDeseadaHr),
    duracionEfectivaHr: r4(duracionEfectivaHr),
    duracionNoqueoHr: r4(duracionNoqueoHr),
    velocidadNeta: r2(velocidadNeta),
    velocidadNetaNoqueo: r2(velocidadNetaNoqueo),
    resesPorMin: r4(resesPorMin),
    minutosPorRes: r4(minutosPorRes),
    minPorResTexto: minutesToTime(minutosPorRes),
    segundosPorRes,
    tiempoLaborado,
    desfasePesadaNoqueo: desfaseMin === null ? '' : minutesToTime(desfaseMin),
    horasLaboradas: r4(duracionDeseadaHr),
  };
}

/** Filas 8–9 y 11–13 del Excel (proyección # reses y topes de tolerancia). */
export type SimulacionBloques = {
  referenciaReses: number;
  resesX4: number;
  resesX2: number;
  toleranciaPct: [number, number, number];
  toleranciaTope: [number, number, number];
};

const TOLERANCIA_FACTORES: [number, number, number] = [0.007, 0.015, 0.01];
const TOLERANCIA_PCT: [number, number, number] = [0.7, 1.5, 1.0];

export function calcBloquesSimulacion(reses: number): SimulacionBloques {
  const resesX4 = reses * 4;
  const resesX2 = reses * 2;
  return {
    referenciaReses: reses,
    resesX4,
    resesX2,
    toleranciaPct: TOLERANCIA_PCT,
    toleranciaTope: [
      Math.round(resesX4 * TOLERANCIA_FACTORES[0]),
      Math.round(resesX2 * TOLERANCIA_FACTORES[1]),
      Math.round(resesX2 * TOLERANCIA_FACTORES[2]),
    ],
  };
}

/** Ajuste Excel O23 = Q23 − 0,01875 días (27 min) sobre última pesada. */
export const HORA_FIN_AJUSTE_MIN = 27;

export type ResumenSacrificio = {
  horaInicio: string;
  totalSacrificio: number;
  resesSacrificadas: number;
  resesFaltantes: number;
  velocidadLinea: number;
  horaEstimadaFin: string;
};

export function calcResumenSacrificio(
  calc: SimulacionCalculada,
  resesSacrificadas: number,
): ResumenSacrificio {
  const total = Number(calc.reses) || 0;
  const sacrificadas = Math.max(0, Math.min(Number(resesSacrificadas) || 0, total));
  const horaEstimada = calc.ultimaPesada
    ? subtractMinutesFromTime(calc.ultimaPesada, HORA_FIN_AJUSTE_MIN)
    : '';

  return {
    horaInicio: toHHMM(calc.horaInicio),
    totalSacrificio: total,
    resesSacrificadas: sacrificadas,
    resesFaltantes: Math.max(0, total - sacrificadas),
    velocidadLinea: Math.ceil(Number(calc.velocidadNeta) || 0),
    horaEstimadaFin: toHMS(horaEstimada),
  };
}

export function fmtResumenTimestamp(date = new Date()): string {
  return date
    .toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}

export function fmtPctExcel(n: number) {
  return n.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export const SIMULACION_VACIA: SimulacionInput = {
  reses: 0,
  velocidadBruta: 75,
  paradaProgramadaHr: 0.5,
  vaciadoLineaHr: VACIADO_LINEA_HR,
  horaInicio: '14:00',
  ultimaNoqueada: '',
  ultimaPesada: '',
  resesSacrificadas: 0,
};
