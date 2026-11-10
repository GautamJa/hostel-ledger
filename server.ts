import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/api.ts';
import { reminderScheduler } from './src/server/reminderScheduler.ts';
import { securityHeaders } from './src/middleware/security.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(express.json({ limit: '2mb' }));
app.use('/api', apiRouter);

// Serve static files in production
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Hostel management server listening on port ${PORT}`);
  // Start automated background scheduler for fee reminders (checks 1 day before month-end deadline)
  reminderScheduler.start(60);
});
