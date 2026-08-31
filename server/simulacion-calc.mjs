/**
 * Formulas de la hoja SIMULACION (CIERRE DIARIO DE BENEFICIO).
 * Entradas verdes: reses, vel. bruta, parada, vaciado, hora inicio, ultima noqueada/pesada.
 */

function pad2(n) {
  return String(Math.floor(n)).padStart(2, '0');
}

/** "16:00" o "16:00:00" → minutos desde medianoche. */
export function timeToMinutes(value) {
  if (!value || typeof value !== 'string') return null;
  const parts = value.trim().split(':').map(Number);
  if (parts.some((p) => !Number.isFinite(p))) return null;
  const [h = 0, m = 0, s = 0] = parts;
  return h * 60 + m + s / 60;
}

/** Minutos → "HH:MM:SS". */
export function minutesToTime(totalMin) {
  if (!Number.isFinite(totalMin) || totalMin < 0) return '00:00:00';
  let mins = totalMin;
  const h = Math.floor(mins / 60) % 24;
  mins -= Math.floor(mins / 60) * 60;
  const m = Math.floor(mins);
  const s = Math.round((mins - m) * 60);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

/** fin − inicio; si cruza medianoche suma 24 h. */
export function diffTimes(fin, inicio) {
  const a = timeToMinutes(fin);
  const b = timeToMinutes(inicio);
  if (a === null || b === null) return null;
  let d = a - b;
  if (d < 0) d += 24 * 60;
  return d;
}

export function calcSimulacion(input) {
  const reses = Number(input.reses) || 0;
  const velocidadBruta = Number(input.velocidadBruta) || 0;
  const paradaProgramadaHr = Number(input.paradaProgramadaHr) || 0;
  const vaciadoLineaHr = Number(input.vaciadoLineaHr) || 0;
  const horaInicio = input.horaInicio ?? '';
  const ultimaNoqueada = input.ultimaNoqueada ?? '';
  const ultimaPesada = input.ultimaPesada ?? '';

  const duracionDeseadaHr = velocidadBruta > 0 ? reses / velocidadBruta : 0;
  const duracionEfectivaHr = duracionDeseadaHr - paradaProgramadaHr;
  const duracionNoqueoHr = duracionEfectivaHr - vaciadoLineaHr;
  const velocidadNeta = duracionEfectivaHr > 0 ? reses / duracionEfectivaHr : 0;
  const velocidadNetaNoqueo = duracionNoqueoHr > 0 ? reses / duracionNoqueoHr : 0;
  const resesPorMin = velocidadNetaNoqueo / 60;
  const minutosPorRes = resesPorMin > 0 ? 1 / resesPorMin : 0;
  const segundosPorRes =
    velocidadNetaNoqueo > 0 ? Math.round(3600 / velocidadNetaNoqueo) : 0;

  const tiempoLaboradoMin = diffTimes(ultimaPesada, horaInicio);
  const desfaseMin = diffTimes(ultimaPesada, ultimaNoqueada);

  return {
    reses,
    velocidadBruta,
    paradaProgramadaHr,
    vaciadoLineaHr,
    horaInicio,
    ultimaNoqueada,
    ultimaPesada,
    duracionDeseadaHr: round4(duracionDeseadaHr),
    duracionEfectivaHr: round4(duracionEfectivaHr),
    duracionNoqueoHr: round4(duracionNoqueoHr),
    velocidadNeta: round2(velocidadNeta),
    velocidadNetaNoqueo: round2(velocidadNetaNoqueo),
    resesPorMin: round4(resesPorMin),
    minutosPorRes: round4(minutosPorRes),
    minPorResTexto: minutesToTime(minutosPorRes),
    segundosPorRes,
    tiempoLaborado:
      tiempoLaboradoMin === null ? '' : minutesToTime(tiempoLaboradoMin),
    desfasePesadaNoqueo:
      desfaseMin === null ? '' : minutesToTime(desfaseMin),
    horasLaboradas:
      tiempoLaboradoMin === null ? 0 : round4(tiempoLaboradoMin / 60),
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}
