import { sendMail } from '../util/mailService';
import { Status } from '../models/Response';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

export const emailSender = (status: Status, req: Request, res: Response, next: NextFunction) => {
    const { to, subject, message, header } = res.locals.user.emailInfo;
    try {
        sendMail(to, subject, message, header);

        return res.status(status.statusCode).json({
            status: `${status.status} and email has been sent!`,
            data: status.data,
        });
    } catch (error) {
        next(error);
    }
};
