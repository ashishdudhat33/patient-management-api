import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format — readable in dev, structured in prod
const devFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `[${ts}] ${level}: ${stack || message}`;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : combine(colorize(), devFormat)
  ),
  transports: [
    new winston.transports.Console(),
  ],
  // Don't kill the process on unhandled promise rejections
  exitOnError: false,
});

export default logger;
