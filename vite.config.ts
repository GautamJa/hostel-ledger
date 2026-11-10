import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import express from 'express';
import { apiRouter } from './src/server/api.ts';
import { reminderScheduler } from './src/server/reminderScheduler.ts';
import { securityHeaders } from './src/middleware/security.ts';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-server-middleware',
        configureServer(server) {
          const app = express();
          app.set('trust proxy', 1);
          app.disable('x-powered-by');
          app.use(securityHeaders);
          app.use(express.json({ limit: '2mb' }));
          app.use('/api', apiRouter);
          server.middlewares.use(app);
          // Start automated background fee reminder scheduler
          reminderScheduler.start(60);
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
