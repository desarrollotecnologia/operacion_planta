import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { query, queryOne } from '../db.mjs';
import { operarioFromRow } from '../mappers.mjs';
import { asArea, asBool, asDate, asInt, asText, badRequest, notFound } from '../validate.mjs';

export const operariosRouter = Router();

const SELECT_OPERARIO = `
  SELECT o.id, o.item_orden, o.puesto_texto, o.nombre_completo, o.nombre_corto,
         o.documento, o.activo, o.fecha_ingreso,
         a.codigo AS area_codigo, p.nombre AS puesto_nombre
    FROM operario o
    JOIN cat_area a ON a.id = o.area_id
    LEFT JOIN cat_puesto p ON p.id = o.puesto_id
`;

/** Replica la convencion del prototipo: "PUESTO PrimerNombre". */
function nombreCortoPorDefecto(puesto, nombreCompleto) {
  const primero = nombreCompleto.split(' ')[0] ?? nombreCompleto;
  return `${puesto} ${primero}`.trim();
}

async function areaIdDe(codigo) {
  const row = await queryOne('SELECT id FROM cat_area WHERE codigo = ?', [codigo]);
  if (!row) throw badRequest(`El area '${codigo}' no existe.`);
  return row.id;
}

operariosRouter.get('/', async (req, res) => {
  const filters = [];
  const params = [];

  if (req.query.area) {
    filters.push('a.codigo = ?');
    params.push(asArea(req.query.area));
  }
  if (req.query.activo !== undefined) {
    filters.push('o.activo = ?');
    params.push(asBool(req.query.activo) ? 1 : 0);
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = await query(`${SELECT_OPERARIO} ${where} ORDER BY o.item_orden`, params);
  res.json(rows.map(operarioFromRow));
});

operariosRouter.post('/', async (req, res) => {
  const area = asArea(req.body.area);
  const areaId = await areaIdDe(area);

  const puesto = asText(req.body.puesto, 'puesto', { maxLength: 120 });
  const nombreCompleto = asText(req.body.nombreCompleto, 'nombreCompleto', { maxLength: 200 });

  let itemOrden;
  if (req.body.itemOrden === undefined || req.body.itemOrden === null || req.body.itemOrden === '') {
    const row = await queryOne(
      'SELECT COALESCE(MAX(item_orden), 0) + 1 AS siguiente FROM operario WHERE area_id = ?',
      [areaId],
    );
    itemOrden = Number(row.siguiente);
  } else {
    itemOrden = asInt(req.body.itemOrden, 'itemOrden', { min: 1, max: 100000 });
  }

  const id = randomUUID();
  const nombreCorto = req.body.nombreCorto
    ? asText(req.body.nombreCorto, 'nombreCorto', { maxLength: 120 })
    : nombreCortoPorDefecto(puesto, nombreCompleto);

  try {
    await query(
      `INSERT INTO operario
         (id, area_id, item_orden, puesto_texto, nombre_completo, nombre_corto,
          documento, activo, fecha_ingreso)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        id, areaId, itemOrden, puesto, nombreCompleto, nombreCorto,
        req.body.documento ? asText(req.body.documento, 'documento', { maxLength: 30 }) : null,
        asBool(req.body.activo, true) ? 1 : 0,
        req.body.fechaIngreso ? asDate(req.body.fechaIngreso, 'fechaIngreso') : null,
      ],
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw badRequest(`Ya existe un operario con el item ${itemOrden} en el area ${area}.`);
    }
    throw err;
  }

  const row = await queryOne(`${SELECT_OPERARIO} WHERE o.id = ?`, [id]);
  res.status(201).json(operarioFromRow(row));
});

operariosRouter.put('/:id', async (req, res) => {
  const id = asText(req.params.id, 'id', { maxLength: 36 });
  const actual = await queryOne(`${SELECT_OPERARIO} WHERE o.id = ?`, [id]);
  if (!actual) throw notFound('Operario no encontrado.');

  const area = req.body.area ? asArea(req.body.area) : actual.area_codigo;
  const areaId = await areaIdDe(area);
  const puesto = req.body.puesto !== undefined
    ? asText(req.body.puesto, 'puesto', { maxLength: 120 })
    : actual.puesto_texto;
  const nombreCompleto = req.body.nombreCompleto !== undefined
    ? asText(req.body.nombreCompleto, 'nombreCompleto', { maxLength: 200 })
    : actual.nombre_completo;

  try {
    await query(
      `UPDATE operario
          SET area_id = ?, item_orden = ?, puesto_texto = ?, nombre_completo = ?,
              nombre_corto = ?, documento = ?, activo = ?, fecha_ingreso = ?
        WHERE id = ?`,
      [
        areaId,
        req.body.itemOrden !== undefined
          ? asInt(req.body.itemOrden, 'itemOrden', { min: 1, max: 100000 })
          : actual.item_orden,
        puesto,
        nombreCompleto,
        req.body.nombreCorto !== undefined
          ? asText(req.body.nombreCorto, 'nombreCorto', { maxLength: 120 })
          : (actual.nombre_corto ?? nombreCortoPorDefecto(puesto, nombreCompleto)),
        req.body.documento !== undefined
          ? (req.body.documento ? asText(req.body.documento, 'documento', { maxLength: 30 }) : null)
          : actual.documento,
        (req.body.activo !== undefined ? asBool(req.body.activo) : Boolean(actual.activo)) ? 1 : 0,
        req.body.fechaIngreso !== undefined
          ? (req.body.fechaIngreso ? asDate(req.body.fechaIngreso, 'fechaIngreso') : null)
          : actual.fecha_ingreso,
        id,
      ],
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw badRequest('Ya existe otro operario con ese item en el area.');
    throw err;
  }

  const row = await queryOne(`${SELECT_OPERARIO} WHERE o.id = ?`, [id]);
  res.json(operarioFromRow(row));
});

/** Baja logica: conserva el historial de asistencia asociado. */
operariosRouter.delete('/:id', async (req, res) => {
  const id = asText(req.params.id, 'id', { maxLength: 36 });
  const result = await query('UPDATE operario SET activo = 0 WHERE id = ?', [id]);
  if (!result.affectedRows) throw notFound('Operario no encontrado.');
  res.status(204).end();
});
