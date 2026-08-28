/**
 * Servidor de Cierre de Operaciones.
 *
 * Un solo proceso sirve la API en /api y el frontend compilado en dist/.
 * Al compartir origen no hace falta CORS ni fijar la IP del servidor en el
 * build: el navegador llama a rutas relativas.
 *
 *   npm start
 *   PORT=8090 npm start
 */
import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import express from 'express';

import { checkConnection, describeTarget, pool } from './db.mjs';
import { HttpError } from './validate.mjs';
import { asistenciaRouter } from './routes/asistencia.mjs';
import { catalogosRouter } from './routes/catalogos.mjs';
import { cierresRouter } from './routes/cierres.mjs';
import { operariosRouter } from './routes/operarios.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = resolve(ROOT, 'dist');
const PORT = Number(process.env.PORT ?? 5174);
const HOST = process.env.HOST ?? '0.0.0.0';

const app = express();
app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    const info = await checkConnection();
    res.json({ ok: true, db: info.db, mysql: info.version, destino: describeTarget() });
  } catch (err) {
    res.status(503).json({ ok: false, destino: describeTarget(), error: err.message });
  }
});

app.use('/api/cierres', cierresRouter);
app.use('/api/operarios', operariosRouter);
app.use('/api/asistencia', asistenciaRouter);
app.use('/api/catalogos', catalogosRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado.' });
});

// Express 5 reenvia aqui los rechazos de los handlers async.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, detalles: err.details });
  }

  // Errores de conexion: la API sigue en pie pero MySQL no responde.
  if (['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ER_ACCESS_DENIED_ERROR', 'ENOTFOUND'].includes(err.code)) {
    console.error(`[db] ${err.code}: ${err.message}`);
    return res.status(503).json({
      error: 'No hay conexion con la base de datos.',
      detalles: err.code,
    });
  }

  if (err.code === 'ER_NO_SUCH_TABLE') {
    return res.status(503).json({
      error: 'Faltan tablas en la base de datos. Ejecuta database/mysql/deploy_205.ps1.',
    });
  }

  console.error(`[api] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

if (existsSync(DIST)) {
  app.use(
    express.static(DIST, {
      index: false,
      // Vite pone hash en el nombre de cada asset, asi que son inmutables.
      setHeaders: (res, filePath) => {
        const esAsset = filePath.includes(`${sep}assets${sep}`);
        res.setHeader(
          'Cache-Control',
          esAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    }),
  );

  // Fallback de la SPA: react-router resuelve la ruta en el navegador.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(resolve(DIST, 'index.html'));
  });
} else {
  console.warn(`[web] No existe ${DIST}. Ejecuta 'npm run build' para servir el tablero.`);
}

const server = app.listen(PORT, HOST, async () => {
  console.log(`Cierre de Operaciones`);
  console.log(`  Local  : http://localhost:${PORT}`);
  console.log(`  Red    : http://192.168.20.205:${PORT}`);
  console.log(`  Base   : ${describeTarget()}`);

  try {
    const info = await checkConnection();
    console.log(`  MySQL  : conectado (${info.db}, v${info.version})`);
  } catch (err) {
    console.error(`  MySQL  : SIN CONEXION -> ${err.code ?? ''} ${err.message}`);
    console.error('           Revisa .env. El tablero cargara pero sin datos.');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} ya esta en uso.`);
    process.exit(1);
  }
  throw err;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
  });
}
