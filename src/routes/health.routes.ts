import { Router, Request, Response } from 'express';

const router = Router();

// Simple liveness probe — API Gateway and ALB use this to decide if the container is healthy.
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'patient-management-api',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

export default router;
