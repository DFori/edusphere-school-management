/**
 * Express Server for EduSphere Multi-Tenant School Management Platform
 */

import express from 'express';
import * as path from 'node:path';
import { tenantContextMiddleware } from './middleware/tenant-context';
import { apiRouter } from './routes/api.routes';
import { getDatabase } from './db/database';

export const app = express();
const PORT = process.env.PORT || 5500;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static dashboard UI
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Tenant Context & API Routes
app.use('/api', tenantContextMiddleware, apiRouter);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'edusphere-school-management' });
});

// Initialize database schema
getDatabase();

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[EduSphere School Management] Running on http://localhost:${PORT}`);
  });
}
