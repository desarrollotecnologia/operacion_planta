import { Router } from 'express';
import { query } from '../db.mjs';
import { estadoFromRow } from '../mappers.mjs';

export const catalogosRouter = Router();

/**
 * Areas y estados de novedad. El frontend los usaba como constantes en
 * src/data/mock/operarios.ts; ahora salen del catalogo real de la base.
 */
catalogosRouter.get('/', async (_req, res) => {
  const [areas, estados] = await Promise.all([
    query('SELECT codigo, nombre FROM cat_area ORDER BY id'),
    query('SELECT codigo, nombre, es_ausentismo FROM cat_estado_novedad WHERE activo = 1 ORDER BY id'),
  ]);

  res.json({
    areas: areas.map((a) => ({ codigo: a.codigo, nombre: a.nombre })),
    estados: estados.map(estadoFromRow),
  });
});
