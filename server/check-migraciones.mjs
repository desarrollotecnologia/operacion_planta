/**
 * Avisa si hay migraciones de base de datos sin aplicar.
 *
 * Compara los archivos NNN_*.sql de database/mysql contra la tabla
 * migracion_aplicada, asi que una migracion nueva se detecta por el solo hecho
 * de existir el archivo, sin listas que mantener a mano.
 *
 * Codigos de salida:
 *   0  todo aplicado
 *   1  hay migraciones pendientes
 *   2  no se pudo comprobar (sin conexion, o falta el registro)
 *
 *   node server/check-migraciones.mjs
 */
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pool, query } from './db.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIR_MIGRACIONES = resolve(ROOT, 'database/mysql');

const salir = async (codigo) => {
  await pool.end().catch(() => {});
  process.exit(codigo);
};

let archivos;
try {
  archivos = readdirSync(DIR_MIGRACIONES)
    .filter((f) => /^\d{3}_.*\.sql$/i.test(f))
    .sort();
} catch (err) {
  console.error(`  [AVISO] No se pudo leer ${DIR_MIGRACIONES}: ${err.message}`);
  await salir(2);
}

if (!archivos.length) {
  console.log('  No hay archivos de migracion.');
  await salir(0);
}

let aplicadas;
try {
  const filas = await query('SELECT archivo FROM migracion_aplicada');
  aplicadas = new Set(filas.map((f) => f.archivo));
} catch (err) {
  if (err.code === 'ER_NO_SUCH_TABLE') {
    console.error('  [AVISO] Falta la tabla de registro de migraciones.');
    console.error('  Aplica primero:');
    console.error('    cd database\\mysql');
    console.error('    .\\aplicar_migracion.ps1 005_registro_migraciones.sql');
    await salir(2);
  }
  console.error(`  [AVISO] No se pudo comprobar el estado de la base: ${err.message}`);
  await salir(2);
}

const pendientes = archivos.filter((f) => !aplicadas.has(f));

if (!pendientes.length) {
  console.log(`  [OK] Base de datos al dia (${archivos.length} migraciones aplicadas).`);
  await salir(0);
}

console.error('');
console.error(`  [ATENCION] Hay ${pendientes.length} migracion(es) sin aplicar:`);
for (const f of pendientes) console.error(`    - ${f}`);
console.error('');
console.error('  El codigo quedo desplegado, pero la base no tiene los cambios que');
console.error('  ese codigo espera. Aplicalas con (pide la contrasena de root):');
console.error('');
console.error('    cd database\\mysql');
for (const f of pendientes) console.error(`    .\\aplicar_migracion.ps1 ${f}`);
console.error('');

await salir(1);
