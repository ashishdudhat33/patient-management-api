import dotenv from 'dotenv';
dotenv.config();
import app from './app';
import logger from './utils/logger';
import { searchService } from './services/search.service';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // Make sure the OpenSearch index exists with correct mappings before we start serving
    await searchService.ensureIndex();
    logger.info('OpenSearch index ready');
  } catch (err) {
    // Don't crash on startup if OpenSearch is down — it's not critical for CRUD
    logger.warn('Could not connect to OpenSearch at startup — search may be unavailable');
  }

  app.listen(PORT, () => {
    logger.info(`Patient Management API running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

bootstrap();
