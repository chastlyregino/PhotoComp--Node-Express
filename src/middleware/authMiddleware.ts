import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../models/User';

// Define interface to extend Express Response.locals
declare global {
  namespace Express {
    interface Locals {
      user: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required',
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication token missing',
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            id: string;
            email: string;
            role: UserRole;
        };

        res.locals.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid authentication token',
        });
    }
};

export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!res.locals.user || res.locals.user.role !== UserRole.ADMIN) {
        return res.status(403).json({
            status: 'error',
            message: 'Access denied. Admin privileges required.',
        });
    }

    next();
};