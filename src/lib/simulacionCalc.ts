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

export function calcSimulacion(input: SimulacionInput): SimulacionCalculada {
  const reses = Number(input.reses) || 0;
  const velocidadBruta = Number(input.velocidadBruta) || 0;
  const paradaProgramadaHr = Number(input.paradaProgramadaHr) || 0;
  const vaciadoLineaHr = Number(input.vaciadoLineaHr) || 0;

  const duracionDeseadaHr = velocidadBruta > 0 ? reses / velocidadBruta : 0;
  const duracionEfectivaHr = duracionDeseadaHr - paradaProgramadaHr;
  const duracionNoqueoHr = duracionEfectivaHr - vaciadoLineaHr;
  const velocidadNeta = duracionEfectivaHr > 0 ? reses / duracionEfectivaHr : 0;
  const velocidadNetaNoqueo = duracionNoqueoHr > 0 ? reses / duracionNoqueoHr : 0;
  const resesPorMin = velocidadNetaNoqueo / 60;
  const minutosPorRes = resesPorMin > 0 ? 1 / resesPorMin : 0;
  const segundosPorRes = velocidadNetaNoqueo > 0 ? Math.round(3600 / velocidadNetaNoqueo) : 0;

  const tiempoLaboradoMin = diffTimes(input.ultimaPesada, input.horaInicio);
  const desfaseMin = diffTimes(input.ultimaPesada, input.ultimaNoqueada);

  return {
    ...input,
    duracionDeseadaHr: r4(duracionDeseadaHr),
    duracionEfectivaHr: r4(duracionEfectivaHr),
    duracionNoqueoHr: r4(duracionNoqueoHr),
    velocidadNeta: r2(velocidadNeta),
    velocidadNetaNoqueo: r2(velocidadNetaNoqueo),
    resesPorMin: r4(resesPorMin),
    minutosPorRes: r4(minutosPorRes),
    minPorResTexto: minutesToTime(minutosPorRes),
    segundosPorRes,
    tiempoLaborado: tiempoLaboradoMin === null ? '' : minutesToTime(tiempoLaboradoMin),
    desfasePesadaNoqueo: desfaseMin === null ? '' : minutesToTime(desfaseMin),
    horasLaboradas: tiempoLaboradoMin === null ? 0 : r4(tiempoLaboradoMin / 60),
  };
}

export const SIMULACION_VACIA: SimulacionInput = {
  reses: 0,
  velocidadBruta: 75,
  paradaProgramadaHr: 0.5,
  vaciadoLineaHr: 0,
  horaInicio: '14:00',
  ultimaNoqueada: '',
  ultimaPesada: '',
};
