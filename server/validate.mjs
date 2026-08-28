/** Validacion de entrada. Todo lo que llega del cliente pasa por aqui. */

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details);
export const notFound = (msg) => new HttpError(404, msg);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const CODE_RE = /^[A-Z0-9_]{2,40}$/;

export function asDate(value, field) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) {
    throw badRequest(`'${field}' debe tener formato YYYY-MM-DD.`);
  }
  const d = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(d.getTime()) || !value.startsWith(String(d.getUTCFullYear()))) {
    throw badRequest(`'${field}' no es una fecha valida.`);
  }
  return value;
}

export function asTime(value, field) {
  if (typeof value !== 'string' || !TIME_RE.test(value)) {
    throw badRequest(`'${field}' debe tener formato HH:MM.`);
  }
  return value;
}

export function asNumber(value, field, { min = -1e12, max = 1e12, fallback } = {}) {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw badRequest(`Falta '${field}'.`);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw badRequest(`'${field}' debe ser numerico.`);
  if (n < min || n > max) throw badRequest(`'${field}' debe estar entre ${min} y ${max}.`);
  return n;
}

export function asInt(value, field, opts = {}) {
  const n = asNumber(value, field, opts);
  if (!Number.isInteger(n)) throw badRequest(`'${field}' debe ser un entero.`);
  return n;
}

export function asText(value, field, { maxLength = 5000, fallback } = {}) {
  if (value === undefined || value === null) {
    if (fallback !== undefined) return fallback;
    throw badRequest(`Falta '${field}'.`);
  }
  const s = String(value).trim();
  if (s.length > maxLength) {
    throw badRequest(`'${field}' supera los ${maxLength} caracteres.`);
  }
  return s;
}

export function asCode(value, field, allowed) {
  const s = asText(value, field, { maxLength: 40 }).toUpperCase();
  if (!CODE_RE.test(s)) throw badRequest(`'${field}' no es un codigo valido.`);
  if (allowed && !allowed.includes(s)) {
    throw badRequest(`'${field}' debe ser uno de: ${allowed.join(', ')}.`);
  }
  return s;
}

export function asBool(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'si', 'yes'].includes(String(value).toLowerCase());
}

export const asArea = (value, field = 'area') => asCode(value ?? 'LINEA', field, ['LINEA', 'PCCOM']);
