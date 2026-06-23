import { Request, Response, NextFunction } from 'express';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import logger from '../utils/logger';

// Centralised error handler — keeps controllers clean
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error(`Unhandled error on ${req.method} ${req.path}: ${err.message}`, { stack: err.stack });

  // DynamoDB condition check failed — usually means record doesn't exist
  if (err instanceof ConditionalCheckFailedException) {
    res.status(404).json({ success: false, error: 'Record not found or condition not met' });
    return;
  }

  // Catch-all
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}

// 404 handler for unknown routes
export function notFound(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
}
