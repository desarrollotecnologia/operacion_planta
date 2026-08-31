/** Mismas formulas que server/cierre-calc.mjs (hoja BASE DE DATOS CIERRE). */

import { diffTimes } from "./simulacionCalc";

export type CierreCalcInput = {
  totalBeneficio: number;
  horaInicio: string;
  horaFin: string;
  tiempoParadasMin: number;
  paradaProgramadaMin: number;
  totalPielesRotas: number;
};

export type CierreCalcDerived = {
  duracionMin: number;
  horasLaboradas: number;
  productividad: number;
  velocidadNeta: number;
  velocidadLinea: number;
  velocidadBruta: number;
  pieles: number;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function calcCierreDerived(input: CierreCalcInput): CierreCalcDerived {
  const duracionMin = diffTimes(input.horaFin, input.horaInicio) ?? 0;
  const horasLaboradas = duracionMin / 60;
  const total = input.totalBeneficio;
  const paradaProg = input.paradaProgramadaMin;
  const paradas = input.tiempoParadasMin;

  const horasSinParadaProg = (duracionMin - paradaProg) / 60;
  const horasEfectivas = (duracionMin - paradaProg - paradas) / 60;

  const productividad = horasSinParadaProg > 0 ? total / horasSinParadaProg : 0;
  const velocidadNeta = horasEfectivas > 0 ? total / horasEfectivas : 0;
  const velocidadBruta = horasLaboradas > 0 ? total / horasLaboradas : 0;
  const pieles = total > 0 ? input.totalPielesRotas / total : 0;

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

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

/** Revierte columna P → U del Excel: conteo desde ratio guardado. */
export function pielesRotasFromRatio(pieles: number, totalBeneficio: number) {
  if (!pieles || !totalBeneficio) return 0;
  return Math.round(pieles * totalBeneficio);
}
