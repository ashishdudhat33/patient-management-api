import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import patientRoutes from './routes/patient.routes';
import healthRoutes from './routes/health.routes';
import { errorHandler, notFound } from './middleware/error.middleware';
import logger from './utils/logger';

const app = express();

// ─── Security & parsing middleware ─────────────────────────────────────────

app.use(helmet()); // sets sensible HTTP security headers
app.use(cors({
  // In prod, lock this down to your frontend domain
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Request logging ───────────────────────────────────────────────────────

app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// ─── Routes ────────────────────────────────────────────────────────────────

app.use('/health', healthRoutes);
app.use('/patients', patientRoutes);

// ─── Error handling ────────────────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

export default app;
