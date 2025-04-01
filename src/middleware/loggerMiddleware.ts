import { Request, Response, NextFunction } from 'express';
import { logger } from '../util/logger';
import { AppError } from './errorHandler';

const loggerMethodMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    logger.info(`Incoming ${req.method} : ${req.url}`);
    next();
};

// const loggerErrorMiddleware = (err: Error | AppError, next: NextFunction): void => {
//     let error = `Error: message: ${err.message}`

//     if(err instanceof AppError) {
//         error = error + ` status code: ${err.statusCode}`
//     }

//     logger.error(error);
//     next();
// };

export { loggerMethodMiddleware };
