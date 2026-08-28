/**
 * Pool de conexiones MySQL.
 *
 * Lee la configuracion de .env (DATABASE_URL o las variables DB_*).
 * Nunca importes credenciales desde otro sitio: este es el unico punto.
 */
import mysql from 'mysql2/promise';

try {
  process.loadEnvFile();
} catch {
  // Sin .env se usan las variables de entorno del sistema o los valores por defecto.
}

const {
  DATABASE_URL,
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_USER = 'cierre_app',
  DB_PASSWORD = '',
  DB_NAME = 'cierre_operaciones',
} = process.env;

const baseOptions = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // DECIMAL llega como string por defecto; el frontend espera numeros.
  decimalNumbers: true,
  // Evita que DATE/TIME se conviertan a Date y se desplacen por zona horaria.
  dateStrings: true,
  timezone: 'local',
  charset: 'utf8mb4',
};

export const pool = DATABASE_URL
  ? mysql.createPool({ uri: DATABASE_URL, ...baseOptions })
  : mysql.createPool({
      host: DB_HOST,
      port: Number(DB_PORT),
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      ...baseOptions,
    });

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

/** Ejecuta varias sentencias en una transaccion y hace rollback ante cualquier error. */
export async function transaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function checkConnection() {
  const row = await queryOne('SELECT DATABASE() AS db, VERSION() AS version');
  return row;
}

/** Descripcion legible del destino, sin exponer la contrasena. */
export function describeTarget() {
  if (DATABASE_URL) {
    try {
      const u = new URL(DATABASE_URL);
      return `${u.username}@${u.hostname}:${u.port || 3306}${u.pathname}`;
    } catch {
      return 'DATABASE_URL (no parseable)';
    }
  }
  return `${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}
