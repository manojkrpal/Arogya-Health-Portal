import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { initDb, getDbEngine } from './src/db/db.js';
import { apiRouter } from './src/routes/api.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Configure high payload limits for multimodal camera and shelf OCR uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check endpoint (serves immediately for Cloud Run container probes)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'ArogyaNet PHC Visibility Engine',
      dbEngine: getDbEngine(),
      timestamp: new Date().toISOString(),
    });
  });

  // User Manual PDF route (supports inline viewing in iframes/objects, direct download, and CORS)
  app.get(['/ArogyaNet_User_Manual.pdf', '/api/manual/pdf', '/api/manual/download', '/api/manual/view'], (req, res) => {
    const pdfPath = path.resolve(process.cwd(), 'public', 'ArogyaNet_User_Manual.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // Set attachment if explicitly requested, otherwise inline so browser/iframes can open and render directly
    if (req.query.download === 'true' || req.path.includes('download')) {
      res.setHeader('Content-Disposition', 'attachment; filename="ArogyaNet_User_Manual.pdf"');
    } else {
      res.setHeader('Content-Disposition', 'inline; filename="ArogyaNet_User_Manual.pdf"');
    }
    res.sendFile(pdfPath);
  });

  // Mount API routers
  app.use('/v1', apiRouter);
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

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
