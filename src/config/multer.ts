import multer from 'multer';
import { AppError } from '../middleware/errorHandler';

// Configure storage to memory
const storage = multer.memoryStorage();

// File filter to validate image types
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new AppError('Only image files are allowed', 400) as unknown as Error);
    }
};

// Configure multer with limits
export const uploadMiddleware = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    // Handle multer errors
    onError: function(err, next) {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                next(new AppError('File size limit exceeded. Maximum size is 5MB', 400));
            } else {
                next(new AppError(`Upload error: ${err.message}`, 400));
            }
        } else {
            next(err);
        }
    }
});