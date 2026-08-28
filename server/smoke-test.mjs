/**
 * Prueba de humo de la API contra una instancia en marcha.
 *
 *   node server/smoke-test.mjs [http://localhost:5180]
 *
 * Escribe y borra un dia de prueba, asi que apuntala a una instancia
 * conectada a la base real solo si aceptas ese registro temporal.
 */
const BASE = (process.argv[2] ?? 'http://localhost:5180').replace(/\/$/, '');
const FECHA_PRUEBA = '2019-01-02';

let ok = 0;
let fallos = 0;

async function check(nombre, fn) {
  try {
    const detalle = await fn();
    console.log(`  OK    ${nombre}${detalle ? ` -> ${detalle}` : ''}`);
    ok += 1;
  } catch (err) {
    console.error(`  FALLA ${nombre} -> ${err.message}`);
    fallos += 1;
  }
}

async function req(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const texto = await res.text();
  let body;
  try { body = texto ? JSON.parse(texto) : null; } catch { body = texto; }
  return { status: res.status, body };
}

const esperar = (cond, msg) => { if (!cond) throw new Error(msg); };

console.log(`Probando ${BASE}\n`);

await check('GET  /api/health', async () => {
  const { status, body } = await req('/api/health');
  esperar(status === 200, `status ${status}`);
  esperar(body.ok === true, 'la base no responde');
  return `${body.db} MySQL ${body.mysql}`;
});

await check('GET  /api/catalogos', async () => {
  const { status, body } = await req('/api/catalogos');
  esperar(status === 200, `status ${status}`);
  esperar(body.areas.length >= 2, 'faltan areas');
  esperar(body.estados.length >= 10, 'faltan estados');
  return `${body.areas.length} areas, ${body.estados.length} estados`;
});

await check('GET  /api/cierres', async () => {
  const { status, body } = await req('/api/cierres');
  esperar(status === 200, `status ${status}`);
  esperar(Array.isArray(body), 'no es arreglo');
  const r = body[0];
  if (r) {
    esperar(typeof r.totalBeneficio === 'number', 'totalBeneficio no es numero');
    esperar(/^\d{4}-\d{2}-\d{2}$/.test(r.fecha), `fecha mal formada: ${r.fecha}`);
    esperar(/^\d{2}:\d{2}$/.test(r.horaInicio), `hora mal formada: ${r.horaInicio}`);
  }
  return `${body.length} registros, mas reciente ${r?.fecha ?? '-'}`;
});

await check('GET  /api/cierres?anio=2026', async () => {
  const { status, body } = await req('/api/cierres?anio=2026');
  esperar(status === 200, `status ${status}`);
  esperar(body.every((r) => r.anio === 2026), 'filtro de anio no aplicado');
  return `${body.length} registros`;
});

await check('POST /api/cierres (alta)', async () => {
  const { status, body } = await req('/api/cierres', {
    method: 'POST',
    body: JSON.stringify({
      fecha: FECHA_PRUEBA, totalBeneficio: 100, horaInicio: '08:00', horaFin: '12:30',
      tiempoParadasMin: 10, paradaProgramadaMin: 5, velocidadLinea: 50, horasLaboradas: 4.5,
      tardanzaInicio: 0, productividad: 60, velocidadNeta: 55, velocidadBruta: 50,
      toleranciaCero: 0.01, pieles: 0.9, observacion: 'Registro de prueba automatica',
    }),
  });
  esperar(status === 201, `status ${status}`);
  esperar(body.duracionMin === 270, `duracion calculada mal: ${body.duracionMin}`);
  esperar(body.mes === 'ENERO', `mes calculado mal: ${body.mes}`);
  return `duracion ${body.duracionMin} min, mes ${body.mes} (columnas generadas)`;
});

await check('POST /api/cierres (upsert, no duplica)', async () => {
  const antes = (await req('/api/cierres')).body.length;
  const { status, body } = await req('/api/cierres', {
    method: 'POST',
    body: JSON.stringify({
      fecha: FECHA_PRUEBA, totalBeneficio: 222, horaInicio: '08:00', horaFin: '12:30',
      tiempoParadasMin: 10, paradaProgramadaMin: 5, velocidadLinea: 50, horasLaboradas: 4.5,
      tardanzaInicio: 0, productividad: 60, velocidadNeta: 55, velocidadBruta: 50,
      toleranciaCero: 0.01, pieles: 0.9, observacion: 'Actualizado',
    }),
  });
  const despues = (await req('/api/cierres')).body.length;
  esperar(status === 201, `status ${status}`);
  esperar(body.totalBeneficio === 222, 'no actualizo el valor');
  esperar(antes === despues, `duplico el registro (${antes} -> ${despues})`);
  return `sigue habiendo ${despues} registros, beneficio actualizado a 222`;
});

await check('POST /api/cierres (rechaza fecha invalida)', async () => {
  const { status, body } = await req('/api/cierres', {
    method: 'POST',
    body: JSON.stringify({ fecha: 'no-es-fecha', totalBeneficio: 1, horaInicio: '08:00', horaFin: '09:00' }),
  });
  esperar(status === 400, `status ${status}, se esperaba 400`);
  return `400 "${body.error}"`;
});

await check('POST /api/cierres (rechaza negativo)', async () => {
  const { status } = await req('/api/cierres', {
    method: 'POST',
    body: JSON.stringify({ fecha: '2019-01-03', totalBeneficio: -5, horaInicio: '08:00', horaFin: '09:00' }),
  });
  esperar(status === 400, `status ${status}, se esperaba 400`);
  return 'validacion activa';
});

await check('DEL  /api/cierres/:fecha', async () => {
  const { status } = await req(`/api/cierres/${FECHA_PRUEBA}`, { method: 'DELETE' });
  esperar(status === 204, `status ${status}`);
  const { status: s2 } = await req(`/api/cierres/${FECHA_PRUEBA}`);
  esperar(s2 === 404, `tras borrar deberia dar 404, dio ${s2}`);
  return 'borrado y confirmado';
});

await check('GET  /api/cierres/consolidado', async () => {
  const { status, body } = await req('/api/cierres/consolidado?anio=2026');
  esperar(status === 200, `status ${status}`);
  return `${body.length} filas de vw_consolidado_cierre`;
});

let operarioId = null;

await check('GET  /api/operarios', async () => {
  const { status, body } = await req('/api/operarios?area=LINEA');
  esperar(status === 200, `status ${status}`);
  esperar(body.length > 0, 'no hay operarios');
  esperar(body[0].area === 'LINEA', 'area mal mapeada');
  operarioId = body[0].id;
  return `${body.length} en LINEA, primero: ${body[0].nombreCorto}`;
});

await check('POST /api/operarios (item automatico)', async () => {
  const { status, body } = await req('/api/operarios', {
    method: 'POST',
    body: JSON.stringify({ area: 'LINEA', puesto: 'PRUEBA', nombreCompleto: 'TEMPORAL AUTOMATICO', activo: true }),
  });
  esperar(status === 201, `status ${status}`);
  esperar(body.itemOrden > 0, 'no asigno item');
  esperar(body.nombreCorto === 'PRUEBA TEMPORAL', `nombre corto: ${body.nombreCorto}`);
  await req(`/api/operarios/${body.id}`, { method: 'DELETE' });
  return `item ${body.itemOrden} asignado, nombre corto derivado`;
});

await check('PUT  /api/asistencia', async () => {
  const { status, body } = await req('/api/asistencia', {
    method: 'PUT',
    body: JSON.stringify({ operarioId, fecha: '2026-08-19', estadoCodigo: 'VACACIONES' }),
  });
  esperar(status === 200, `status ${status}`);
  esperar(body.estadoCodigo === 'VACACIONES', 'no guardo el estado');
  return 'estado guardado';
});

await check('PUT  /api/asistencia (rechaza estado inexistente)', async () => {
  const { status } = await req('/api/asistencia', {
    method: 'PUT',
    body: JSON.stringify({ operarioId, fecha: '2026-08-19', estadoCodigo: 'INVENTADO' }),
  });
  esperar(status === 400, `status ${status}, se esperaba 400`);
  return 'catalogo validado';
});

await check('PUT  /api/asistencia (revierte a LABORANDO)', async () => {
  const { status } = await req('/api/asistencia', {
    method: 'PUT',
    body: JSON.stringify({ operarioId, fecha: '2026-08-19', estadoCodigo: 'LABORANDO' }),
  });
  esperar(status === 200, `status ${status}`);
  return 'dato de prueba revertido';
});

await check('GET  /api/asistencia/resumen', async () => {
  const { status, body } = await req('/api/asistencia/resumen?fecha=2026-08-19&area=LINEA');
  esperar(status === 200, `status ${status}`);
  return body.map((r) => `${r.estadoCodigo}:${r.cantidad}`).join(' ') || 'sin novedades';
});

await check('GET  /api/noexiste devuelve 404 JSON', async () => {
  const { status, body } = await req('/api/noexiste');
  esperar(status === 404, `status ${status}`);
  esperar(typeof body?.error === 'string', 'no devolvio JSON');
  return 'no cae en el fallback de la SPA';
});

await check('GET  /consolidado sirve la SPA', async () => {
  const res = await fetch(`${BASE}/consolidado`);
  const html = await res.text();
  esperar(res.status === 200, `status ${res.status}`);
  esperar(html.includes('<div id="root"'), 'no devolvio el index.html');
  return 'fallback de react-router correcto';
});

console.log(`\n${ok} pruebas OK, ${fallos} fallidas`);
process.exit(fallos ? 1 : 0);
