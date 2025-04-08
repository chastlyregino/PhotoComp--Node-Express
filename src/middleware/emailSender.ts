import { sendMail } from '../util/mailService';
import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';

dotenv.config();

export const emailSender = (req: Request, res: Response, next: NextFunction) => {
    const { to, subject, message, header } = res.locals.user.emailInfo;
    try {
        sendMail(to, subject, message, header);

        return res.status(200).json({
            status: 'Email sent',
            data: {
                to,
                header,
            },
        });
    } catch (error) {
        next(error);
    }

    //sendMail.info(`Incoming ${req.method} : ${req.url}`);
};
