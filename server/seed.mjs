/**
 * Carga inicial con los datos que traia el prototipo (src/data/mock).
 *
 * Sirve para tener contenido visible al conectar la base por primera vez.
 * Es idempotente: reejecutarlo actualiza en vez de duplicar.
 *
 *   npm run seed
 */
import { randomUUID } from 'node:crypto';
import { pool, query, queryOne } from './db.mjs';

const CIERRES = [
  {
    fecha: '2026-08-19', totalBeneficio: 306, horaInicio: '14:00:00', horaFin: '20:18:00',
    paradas: 61, programada: 30, velLinea: 75, horas: 6.3, tardanza: 0,
    productividad: 72.4, velNeta: 75, velBruta: 68.2, tolerancia: 0.0096, pieles: 0.98,
    observacion: 'Cierre estable. Seguimiento lustres clientes prioritarios.',
  },
  {
    fecha: '2026-08-18', totalBeneficio: 298, horaInicio: '14:05:00', horaFin: '20:40:00',
    paradas: 48, programada: 30, velLinea: 74, horas: 6.58, tardanza: 5,
    productividad: 70.1, velNeta: 73.2, velBruta: 66.8, tolerancia: 0.0102, pieles: 0.97,
    observacion: 'Tardanza leve por alistamiento de box.',
  },
  {
    fecha: '2026-08-15', totalBeneficio: 312, horaInicio: '13:50:00', horaFin: '20:10:00',
    paradas: 35, programada: 30, velLinea: 76, horas: 6.33, tardanza: 0,
    productividad: 74.8, velNeta: 76.1, velBruta: 70.4, tolerancia: 0.0088, pieles: 0.99,
    observacion: 'Buen ritmo. Paradas dentro de lo programado.',
  },
];

const OPERARIOS = [
  [1, 'AFANADOR', 'PINEDA NELSON', 'AFANADOR NELSON'],
  [2, 'AGUILAR', 'SAAVEDRA LUIS DAVID', 'AGUILAR LUIS'],
  [3, 'ALVAREZ', 'MARCHAN ELIBER', 'ALVAREZ ELIBER'],
  [4, 'ANDRADES', 'JOSE FRANCISCO', 'ANDRADES FRANCISCO'],
  [5, 'ANGEL', 'DAVID CRUZ RUIZ', 'ANGEL CRUZ'],
  [6, 'AYALA', 'ORELLAN JOSE GABRIEL', 'AYALA JOSE'],
  [7, 'AYALA', 'PEÑARANDA CRISTIAN DAVID', 'AYALA CRISTIAN'],
  [8, 'BALLESTEROS', 'NUÑEZ DERSO', 'BALLESTEROS DERSO'],
  [9, 'BARAJAS', 'APARICIO FIDEL', 'BARAJAS FIDEL'],
  [10, 'BARAJAS', 'GUEVARA EULISIS', 'BARAJAS EULISIS'],
  [11, 'BECERRA', 'JAIMES DIEGO ARMANDO', 'BECERRA DIEGO'],
  [12, 'BENITEZ', 'VIDES YOSNEIDER', 'BENITEZ YOSNEIDER'],
];

const ASISTENCIA = [
  [1, '2026-08-19', 'LABORANDO'],
  [2, '2026-08-19', 'LABORANDO'],
  [3, '2026-08-19', 'LABORANDO'],
  [10, '2026-08-19', 'VACACIONES'],
  [12, '2026-08-19', 'INCAPACIDAD'],
];

async function main() {
  const area = await queryOne("SELECT id FROM cat_area WHERE codigo = 'LINEA'");
  if (!area) throw new Error("Falta el catalogo de areas. Ejecuta database/mysql/deploy_205.ps1 primero.");

  for (const c of CIERRES) {
    await query(
      `INSERT INTO cierre_diario (
         fecha, total_beneficio, hora_inicio, hora_fin, tiempo_paradas_min,
         parada_programada_min, velocidad_linea, horas_laboradas, tardanza_inicio_min,
         productividad, velocidad_neta, velocidad_bruta, tolerancia_cero, pieles, observacion
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE total_beneficio = VALUES(total_beneficio)`,
      [
        c.fecha, c.totalBeneficio, c.horaInicio, c.horaFin, c.paradas, c.programada,
        c.velLinea, c.horas, c.tardanza, c.productividad, c.velNeta, c.velBruta,
        c.tolerancia, c.pieles, c.observacion,
      ],
    );
  }
  console.log(`Cierres     : ${CIERRES.length} registros`);

  for (const [item, puesto, nombre, corto] of OPERARIOS) {
    await query(
      `INSERT INTO operario (id, area_id, item_orden, puesto_texto, nombre_completo, nombre_corto, activo)
       VALUES (?,?,?,?,?,?,1)
       ON DUPLICATE KEY UPDATE
         puesto_texto = VALUES(puesto_texto),
         nombre_completo = VALUES(nombre_completo),
         nombre_corto = VALUES(nombre_corto)`,
      [randomUUID(), area.id, item, puesto, nombre, corto],
    );
  }
  console.log(`Operarios   : ${OPERARIOS.length} registros`);

  let asistencias = 0;
  for (const [item, fecha, estado] of ASISTENCIA) {
    const op = await queryOne(
      'SELECT id FROM operario WHERE area_id = ? AND item_orden = ?',
      [area.id, item],
    );
    const est = await queryOne('SELECT id FROM cat_estado_novedad WHERE codigo = ?', [estado]);
    if (!op || !est) continue;

    await query(
      `INSERT INTO asistencia_operario (id, operario_id, fecha, estado_id)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE estado_id = VALUES(estado_id)`,
      [randomUUID(), op.id, fecha, est.id],
    );
    asistencias += 1;
  }
  console.log(`Asistencia  : ${asistencias} registros`);
  console.log('\nCarga inicial completada.');
}

main()
  .catch((err) => {
    console.error(`\nFallo la carga inicial: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
