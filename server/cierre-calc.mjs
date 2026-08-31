/**
 * Formulas de la hoja BASE DE DATOS CIERRE (CIERRE DIARIO DE BENEFICIO).
 * Columnas calculadas: F, J, L, M, N, I (= M).
 */
import { diffTimes } from './simulacion-calc.mjs';

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * @param {{
 *   totalBeneficio: number;
 *   horaInicio: string;
 *   horaFin: string;
 *   tiempoParadasMin: number;
 *   paradaProgramadaMin: number;
 *   totalPielesRotas: number;
 * }} input
 */
export function calcCierreDerived(input) {
  const duracionMin = diffTimes(input.horaFin, input.horaInicio) ?? 0;
  const horasLaboradas = duracionMin / 60;
  const total = Number(input.totalBeneficio) || 0;
  const paradaProg = Number(input.paradaProgramadaMin) || 0;
  const paradas = Number(input.tiempoParadasMin) || 0;
  const totalPielesRotas = Number(input.totalPielesRotas) || 0;

  const horasSinParadaProg = (duracionMin - paradaProg) / 60;
  const horasEfectivas = (duracionMin - paradaProg - paradas) / 60;

  const productividad = horasSinParadaProg > 0 ? total / horasSinParadaProg : 0;
  const velocidadNeta = horasEfectivas > 0 ? total / horasEfectivas : 0;
  const velocidadBruta = horasLaboradas > 0 ? total / horasLaboradas : 0;
  const pieles = total > 0 ? totalPielesRotas / total : 0;

  return {
    duracionMin: Math.round(duracionMin),
    horasLaboradas: round2(horasLaboradas),
    productividad: round2(productividad),
    velocidadNeta: round2(velocidadNeta),
    velocidadLinea: round2(velocidadNeta),
    velocidadBruta: round2(velocidadBruta),
    pieles: round4(pieles),
  };
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

/**
 * Aplica formulas sobre el payload del formulario antes de persistir.
 * @param {Record<string, unknown>} body
 */
export function applyCierreFormulas(body) {
  const totalBeneficio = Number(body.totalBeneficio) || 0;
  let totalPielesRotas = Number(body.totalPielesRotas);
  if (!Number.isFinite(totalPielesRotas) && Number.isFinite(Number(body.pieles))) {
    totalPielesRotas = Math.round(Number(body.pieles) * totalBeneficio);
  }

  const derived = calcCierreDerived({
    totalBeneficio,
    horaInicio: String(body.horaInicio ?? ''),
    horaFin: String(body.horaFin ?? ''),
    tiempoParadasMin: Number(body.tiempoParadasMin) || 0,
    paradaProgramadaMin: Number(body.paradaProgramadaMin) || 0,
    totalPielesRotas: Number.isFinite(totalPielesRotas) ? totalPielesRotas : 0,
  });

  return {
    ...body,
    horasLaboradas: derived.horasLaboradas,
    productividad: derived.productividad,
    velocidadNeta: derived.velocidadNeta,
    velocidadLinea: derived.velocidadLinea,
    velocidadBruta: derived.velocidadBruta,
    pieles: derived.pieles,
  };
}
