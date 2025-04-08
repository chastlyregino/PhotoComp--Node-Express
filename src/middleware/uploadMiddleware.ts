import multer from 'multer';
import { multerConfig } from '../config/multer';
import { AppError } from './errorHandler';
import { NextFunction, Request, Response } from 'express';

// File filter to validate image types
const fileFilter = (
    req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new AppError('Only image files are allowed', 400) as unknown as Error);
    }
};

// Create multer middleware with config and file filter
export const uploadMiddleware = multer({
    ...multerConfig,
    fileFilter: fileFilter,
});

// Create a wrapper middleware to handle multer errors
export const handleUpload = (fieldName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const upload = uploadMiddleware.single(fieldName);

        upload(req, res, err => {
            if (err) {
                if (err instanceof multer.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return next(
                            new AppError('File size limit exceeded. Maximum size is 5MB', 400)
                        );
                    }
                    return next(new AppError(`Upload error: ${err.message}`, 400));
                }
                return next(err);
            }
            next();
        });
    };
};
