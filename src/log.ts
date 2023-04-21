import * as winston from 'winston';

const Log = winston.createLogger({
    exitOnError: false,
    format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.timestamp({ format: 'mm:ss' }),
        winston.format.simple(),
    ),
    level: process.env.LOG_LEVEL || 'info',
    transports: [new winston.transports.Console()],
});

export default Log;
