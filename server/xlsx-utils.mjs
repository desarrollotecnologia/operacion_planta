/**
 * Utilidades compartidas para leer fechas/horas desde Excel (.xlsx).
 */
import XLSX from 'xlsx';

export function toIsoDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  return null;
}

export function toSqlTime(value) {
  if (value == null || value === '') return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // Excel almacena las horas sueltas como fracciones sobre su epoca (1899-12-30),
    // y las que pasan de medianoche caen en el dia siguiente de esa epoca.
    if (value.getFullYear() <= 1900) {
      return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}:00`;
    }
    return null;
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return `${String(parsed.H).padStart(2, '0')}:${String(parsed.M).padStart(2, '0')}:00`;
  }

  if (typeof value === 'string') {
    const parts = value.trim().split(':').map((p) => p.padStart(2, '0'));
    while (parts.length < 3) parts.push('00');
    return parts.slice(0, 3).join(':');
  }

  return null;
}

export function readSheetRows(wb, sheetName) {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return null;
  return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
}

export function num(value, fallback = 0) {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function addMinutesToTime(timeSql, minutes) {
  if (!timeSql || !Number.isFinite(minutes)) return null;
  const [h, m, s = '00'] = timeSql.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function text(value) {
  if (value == null) return '';
  return String(value).trim();
}
