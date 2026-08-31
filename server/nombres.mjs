/** Formato de nombres como en el Excel: primer nombre + primer apellido. */

function titleWord(w) {
  if (!w) return '';
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
}

export function nombreCorto(nombreCompleto) {
  if (!nombreCompleto?.trim()) return '';
  const parts = nombreCompleto.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return titleWord(parts[0]);
  if (parts.length === 2) {
    // Apellido Nombre -> Nombre Apellido
    return `${titleWord(parts[1])} ${titleWord(parts[0])}`;
  }
  // Apellido1 Apellido2 Nombre1 [Nombre2...]
  const apellido = parts[0];
  const nombre = parts[parts.length - 2] ?? parts[parts.length - 1];
  return `${titleWord(nombre)} ${titleWord(apellido)}`;
}

export function colaboradoresCortos(texto) {
  if (!texto?.trim()) return '';
  return texto
    .split(/\s*\/\s*/)
    .map((n) => nombreCorto(n))
    .filter(Boolean)
    .join(' / ');
}
