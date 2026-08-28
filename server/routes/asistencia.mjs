import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { query, queryOne, transaction } from '../db.mjs';
import { asistenciaFromRow } from '../mappers.mjs';
import { asArea, asCode, asDate, asInt, badRequest } from '../validate.mjs';

export const asistenciaRouter = Router();

const SELECT_ASISTENCIA = `
  SELECT asi.operario_id, asi.fecha, e.codigo AS estado_codigo
    FROM asistencia_operario asi
    JOIN operario o ON o.id = asi.operario_id
    JOIN cat_area a ON a.id = o.area_id
    JOIN cat_estado_novedad e ON e.id = asi.estado_id
`;

async function estadoIdDe(codigo) {
  const row = await queryOne('SELECT id FROM cat_estado_novedad WHERE codigo = ?', [codigo]);
  if (!row) throw badRequest(`El estado '${codigo}' no existe en el catalogo.`);
  return row.id;
}

asistenciaRouter.get('/', async (req, res) => {
  const filters = [];
  const params = [];

  if (req.query.fecha) {
    filters.push('asi.fecha = ?');
    params.push(asDate(req.query.fecha, 'fecha'));
  }
  if (req.query.desde) {
    filters.push('asi.fecha >= ?');
    params.push(asDate(req.query.desde, 'desde'));
  }
  if (req.query.hasta) {
    filters.push('asi.fecha <= ?');
    params.push(asDate(req.query.hasta, 'hasta'));
  }
  if (req.query.area) {
    filters.push('a.codigo = ?');
    params.push(asArea(req.query.area));
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = await query(`${SELECT_ASISTENCIA} ${where} ORDER BY asi.fecha, o.item_orden`, params);
  res.json(rows.map(asistenciaFromRow));
});

/** Conteo por estado del dia, equivalente a la hoja RESUMEN del Excel. */
asistenciaRouter.get('/resumen', async (req, res) => {
  const fecha = asDate(req.query.fecha, 'fecha');
  const area = asArea(req.query.area);

  const rows = await query(
    `SELECT v.estado_codigo, v.estado_nombre, v.cantidad, v.colaboradores
       FROM vw_resumen_novedades_dia v
       JOIN cat_area a ON a.id = v.area_id
      WHERE v.fecha = ? AND a.codigo = ?
      ORDER BY v.cantidad DESC`,
    [fecha, area],
  );

  const total = rows.reduce((acc, r) => acc + Number(r.cantidad), 0) || 1;
  res.json(
    rows.map((r) => ({
      criterio: r.estado_nombre.toUpperCase(),
      estadoCodigo: r.estado_codigo,
      cantidad: Number(r.cantidad),
      pct: Number(r.cantidad) / total,
      operarios: r.colaboradores ?? '',
    })),
  );
});

async function upsertAsistencia(conn, { operarioId, fecha, estadoId }) {
  await conn.execute(
    `INSERT INTO asistencia_operario (id, operario_id, fecha, estado_id)
     VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE estado_id = VALUES(estado_id)`,
    [randomUUID(), operarioId, fecha, estadoId],
  );
}

asistenciaRouter.put('/', async (req, res) => {
  const operarioId = String(req.body.operarioId ?? '');
  if (!operarioId) throw badRequest("Falta 'operarioId'.");
  const fecha = asDate(req.body.fecha, 'fecha');
  const estadoCodigo = asCode(req.body.estadoCodigo, 'estadoCodigo');
  const estadoId = await estadoIdDe(estadoCodigo);

  try {
    await transaction((conn) => upsertAsistencia(conn, { operarioId, fecha, estadoId }));
  } catch (err) {
    if (err.code === 'ER_NO_REFERENCED_ROW_2') throw badRequest('El operario indicado no existe.');
    throw err;
  }

  res.json({ operarioId, fecha, estadoCodigo });
});

/** Guarda la matriz completa de un dia en una sola transaccion. */
asistenciaRouter.put('/bulk', async (req, res) => {
  const registros = Array.isArray(req.body.registros) ? req.body.registros : null;
  if (!registros) throw badRequest("Se espera un arreglo 'registros'.");
  if (registros.length > 1000) throw badRequest('Maximo 1000 registros por lote.');

  const preparados = [];
  for (const r of registros) {
    const operarioId = String(r.operarioId ?? '');
    if (!operarioId) throw badRequest("Cada registro requiere 'operarioId'.");
    preparados.push({
      operarioId,
      fecha: asDate(r.fecha, 'fecha'),
      estadoId: await estadoIdDe(asCode(r.estadoCodigo, 'estadoCodigo')),
    });
  }

  await transaction(async (conn) => {
    for (const r of preparados) await upsertAsistencia(conn, r);
  });

  res.json({ guardados: preparados.length });
});

/** Matriz mensual para la pantalla de asistencia. */
asistenciaRouter.get('/mes', async (req, res) => {
  const anio = asInt(req.query.anio, 'anio', { min: 2000, max: 2100 });
  const mes = asInt(req.query.mes, 'mes', { min: 1, max: 12 });
  const area = asArea(req.query.area);

  const rows = await query(
    `${SELECT_ASISTENCIA}
      WHERE YEAR(asi.fecha) = ? AND MONTH(asi.fecha) = ? AND a.codigo = ?
      ORDER BY asi.fecha, o.item_orden`,
    [anio, mes, area],
  );
  res.json(rows.map(asistenciaFromRow));
});
