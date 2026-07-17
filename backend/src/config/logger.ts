import winston from 'winston';

const { combine, timestamp, colorize, printf, errors } = winston.format;

const fmt = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}] ${stack || message}`;
});

const transports: winston.transport[] = [
  new winston.transports.Console()
];

if (!process.env.VERCEL) {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  );
}

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'HH:mm:ss' }),
    colorize(),
    fmt
  ),
  transports
});
