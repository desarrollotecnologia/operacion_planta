import { Router } from 'express';
import { query, queryOne } from '../db.mjs';
import {
  getCierreProceso,
  getNovedades,
  getSimulacion,
  getUltimaFecha,
} from '../build-cierre-vista.mjs';
import { cierreFromRow, consolidadoFromRow, toSqlTime } from '../mappers.mjs';
import { applyCierreFormulas } from '../cierre-calc.mjs';
import { saveSimulacion } from '../simulacion-service.mjs';
import { asDate, asInt, asNumber, asText, asTime, notFound } from '../validate.mjs';

export const cierresRouter = Router();

const COLUMNS = `
  id, fecha, total_beneficio, hora_inicio, hora_fin, duracion_min,
  tiempo_paradas_min, parada_programada_min, velocidad_linea, horas_laboradas,
  tardanza_inicio_min, productividad, velocidad_neta, velocidad_bruta,
  tolerancia_cero, pieles, corte_pierna, sobrebarriga_rota, cobertura_grasa,
  observacion, mes, anio
`;

/** Normaliza el cuerpo del formulario "Base de datos cierre". */
function parseCierre(body) {
  const horaInicio = asTime(body.horaInicio, 'horaInicio');
  const horaFin = asTime(body.horaFin, 'horaFin');

  return {
    fecha: asDate(body.fecha, 'fecha'),
    total_beneficio: asInt(body.totalBeneficio, 'totalBeneficio', { min: 0, max: 100000 }),
    hora_inicio: toSqlTime(horaInicio),
    hora_fin: toSqlTime(horaFin),
    tiempo_paradas_min: asInt(body.tiempoParadasMin, 'tiempoParadasMin', { min: 0, max: 1440, fallback: 0 }),
    parada_programada_min: asInt(body.paradaProgramadaMin, 'paradaProgramadaMin', { min: 0, max: 1440, fallback: 0 }),
    velocidad_linea: asNumber(body.velocidadLinea, 'velocidadLinea', { min: 0, max: 10000, fallback: 0 }),
    horas_laboradas: asNumber(body.horasLaboradas, 'horasLaboradas', { min: 0, max: 24, fallback: 0 }),
    tardanza_inicio_min: asInt(body.tardanzaInicio, 'tardanzaInicio', { min: 0, max: 1440, fallback: 0 }),
    productividad: asNumber(body.productividad, 'productividad', { min: 0, max: 10000, fallback: 0 }),
    velocidad_neta: asNumber(body.velocidadNeta, 'velocidadNeta', { min: 0, max: 10000, fallback: 0 }),
    velocidad_bruta: asNumber(body.velocidadBruta, 'velocidadBruta', { min: 0, max: 10000, fallback: 0 }),
    tolerancia_cero: asNumber(body.toleranciaCero, 'toleranciaCero', { min: 0, max: 1000, fallback: 0 }),
    pieles: asNumber(body.pieles, 'pieles', { min: 0, max: 1000, fallback: 0 }),
    corte_pierna: asNumber(body.cortePierna, 'cortePierna', { min: 0, max: 1000, fallback: 0 }),
    sobrebarriga_rota: asNumber(body.sobrebarrigaRota, 'sobrebarrigaRota', { min: 0, max: 1000, fallback: 0 }),
    cobertura_grasa: asNumber(body.coberturaGrasa, 'coberturaGrasa', { min: 0, max: 1000, fallback: 0 }),
    observacion: asText(body.observacion, 'observacion', { maxLength: 5000, fallback: '' }),
  };
}

/**
 * Inserta o actualiza el dia. La unicidad la impone uk_cierre_fecha, asi que
 * guardar dos veces la misma fecha corrige el registro en vez de duplicarlo.
 */
async function upsertCierre(data) {
  await query(
    `INSERT INTO cierre_diario (
       fecha, total_beneficio, hora_inicio, hora_fin, tiempo_paradas_min,
       parada_programada_min, velocidad_linea, horas_laboradas, tardanza_inicio_min,
       productividad, velocidad_neta, velocidad_bruta, tolerancia_cero, pieles,
       corte_pierna, sobrebarriga_rota, cobertura_grasa, observacion
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       total_beneficio       = VALUES(total_beneficio),
       hora_inicio           = VALUES(hora_inicio),
       hora_fin              = VALUES(hora_fin),
       tiempo_paradas_min    = VALUES(tiempo_paradas_min),
       parada_programada_min = VALUES(parada_programada_min),
       velocidad_linea       = VALUES(velocidad_linea),
       horas_laboradas       = VALUES(horas_laboradas),
       tardanza_inicio_min   = VALUES(tardanza_inicio_min),
       productividad         = VALUES(productividad),
       velocidad_neta        = VALUES(velocidad_neta),
       velocidad_bruta       = VALUES(velocidad_bruta),
       tolerancia_cero       = VALUES(tolerancia_cero),
       pieles                = VALUES(pieles),
       corte_pierna          = VALUES(corte_pierna),
       sobrebarriga_rota     = VALUES(sobrebarriga_rota),
       cobertura_grasa       = VALUES(cobertura_grasa),
       observacion           = VALUES(observacion)`,
    [
      data.fecha, data.total_beneficio, data.hora_inicio, data.hora_fin,
      data.tiempo_paradas_min, data.parada_programada_min, data.velocidad_linea,
      data.horas_laboradas, data.tardanza_inicio_min, data.productividad,
      data.velocidad_neta, data.velocidad_bruta, data.tolerancia_cero,
      data.pieles, data.corte_pierna, data.sobrebarriga_rota, data.cobertura_grasa,
      data.observacion,
    ],
  );

  const row = await queryOne(`SELECT ${COLUMNS} FROM cierre_diario WHERE fecha = ?`, [data.fecha]);
  return cierreFromRow(row);
}

cierresRouter.get('/', async (req, res) => {
  const filters = [];
  const params = [];

  if (req.query.anio) {
    filters.push('anio = ?');
    params.push(asInt(req.query.anio, 'anio', { min: 2000, max: 2100 }));
  }
  if (req.query.mes) {
    filters.push('mes = ?');
    params.push(asText(req.query.mes, 'mes', { maxLength: 15 }).toUpperCase());
  }
  if (req.query.desde) {
    filters.push('fecha >= ?');
    params.push(asDate(req.query.desde, 'desde'));
  }
  if (req.query.hasta) {
    filters.push('fecha <= ?');
    params.push(asDate(req.query.hasta, 'hasta'));
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const limit = asInt(req.query.limite ?? 500, 'limite', { min: 1, max: 5000 });

  const rows = await query(
    `SELECT ${COLUMNS} FROM cierre_diario ${where} ORDER BY fecha DESC LIMIT ${limit}`,
    params,
  );
  res.json(rows.map(cierreFromRow));
});

cierresRouter.get('/consolidado', async (req, res) => {
  const params = [];
  let where = '';
  if (req.query.anio) {
    where = 'WHERE anio = ?';
    params.push(asInt(req.query.anio, 'anio', { min: 2000, max: 2100 }));
  }
  const rows = await query(
    `SELECT * FROM vw_consolidado_cierre ${where} ORDER BY fecha DESC`,
    params,
  );
  res.json(rows.map(consolidadoFromRow));
});

cierresRouter.get('/ultimo', async (_req, res) => {
  const fecha = await getUltimaFecha();
  if (!fecha) throw notFound('No hay cierres registrados.');
  res.json({ fecha });
});

cierresRouter.get('/:fecha/simulacion', async (req, res) => {
  const fecha = asDate(req.params.fecha, 'fecha');
  const data = await getSimulacion(fecha);
  if (!data) throw notFound(`No hay cierre registrado para ${fecha}.`);
  res.json(data);
});

cierresRouter.put('/:fecha/simulacion', async (req, res) => {
  const fecha = asDate(req.params.fecha, 'fecha');
  const data = await saveSimulacion(fecha, req.body);
  res.json(data);
});

cierresRouter.get('/:fecha/cierre-proceso', async (req, res) => {
  const fecha = asDate(req.params.fecha, 'fecha');
  const data = await getCierreProceso(fecha);
  if (!data) throw notFound(`No hay cierre de proceso para ${fecha}.`);
  res.json(data);
});

cierresRouter.get('/:fecha/novedades', async (req, res) => {
  const fecha = asDate(req.params.fecha, 'fecha');
  const data = await getNovedades(fecha);
  if (!data) throw notFound(`No hay novedades para ${fecha}.`);
  res.json(data);
});

cierresRouter.get('/:fecha', async (req, res) => {
  const fecha = asDate(req.params.fecha, 'fecha');
  const row = await queryOne(`SELECT ${COLUMNS} FROM cierre_diario WHERE fecha = ?`, [fecha]);
  if (!row) throw notFound(`No hay cierre registrado para ${fecha}.`);
  res.json(cierreFromRow(row));
});

cierresRouter.post('/', async (req, res) => {
  const registro = await upsertCierre(parseCierre(applyCierreFormulas(req.body)));
  res.status(201).json(registro);
});

cierresRouter.put('/:fecha', async (req, res) => {
  const fecha = asDate(req.params.fecha, 'fecha');
  const registro = await upsertCierre(parseCierre(applyCierreFormulas({ ...req.body, fecha })));
  res.json(registro);
});

cierresRouter.delete('/:fecha', async (req, res) => {
  const fecha = asDate(req.params.fecha, 'fecha');
  const result = await query('DELETE FROM cierre_diario WHERE fecha = ?', [fecha]);
  if (!result.affectedRows) throw notFound(`No hay cierre registrado para ${fecha}.`);
  res.status(204).end();
});
