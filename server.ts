import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { initDb, getDbEngine } from './src/db/db.js';
import { apiRouter } from './src/routes/api.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint (serves immediately for Cloud Run container probes)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'ArogyaNet PHC Visibility Engine',
      dbEngine: getDbEngine(),
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API v1 router FIRST
  app.use('/v1', apiRouter);

  // Vite middleware for development vs static build for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind server to port 3000 immediately so container health probes pass instantly
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ArogyaNet] Server running on http://0.0.0.0:${PORT}`);
  });

  // Initialize Database in background without blocking port listening
  initDb()
    .then(() => {
      console.log(`[ArogyaNet] Database online (${getDbEngine()}).`);
    })
    .catch((err) => {
      console.error('[ArogyaNet] Database initialization failure:', err);
    });
}

startServer();
