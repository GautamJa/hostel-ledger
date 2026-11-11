import express from 'express';
import { apiRouter } from '../src/server/api.ts';
import { securityHeaders } from '../src/middleware/security.ts';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(express.json({ limit: '2mb' }));
app.use('/api', apiRouter);

// Export for Vercel / serverless runtime
export default app;
