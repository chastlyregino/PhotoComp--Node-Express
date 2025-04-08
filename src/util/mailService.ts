import nodemailer from 'nodemailer';
//import html from './emailTemplate.html'
//const hbs = require('nodemailer-express-handlebars')
import { logger } from './logger';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// const handlebarOptions = {
//     viewEngine: {
//         partialsDir: path.resolve('../views/'),
//         defaultLayout: false,
//     },
//     viewPath: path.resolve('../views/'),
// };

const handlebarOptions = {
    viewEngine: {
        extName: '.hbs',
        partialsDir: '../views/',
        layoutsDir: '../views/',
        defaultLayout: 'email.body.hbs',
    },
    viewPath: '../views/',
    extName: '.hbs',
};

const sendMail = async (to: string, subject: string, message: string, header: string) => {
    const transporter = nodemailer.createTransport({
        service: process.env.MAIL_HOST,
        auth: {
            user: process.env.MAIL_USERNAME,
            pass: process.env.MAIL_PASSWORD,
        },
    });

    //transporter.use('compile', hbs(handlebarOptions));

    const mailOptions = {
        from: `PhotoComp Admin: ${process.env.MAIL_USERNAME}`,
        template: 'email',
        to: to,
        subject: subject,
        text: `${header}
        ${message}`,
    };

    logger.info(`Sending mail to - ${to}`);
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            logger.error(error);
        } else {
            logger.info('Email sent: ' + info.response);
        }
    });

    // const mailOptions = {
    //     from: '"My Company" <my@company.com>', // sender address
    //     template: "email", // the name of the template file, i.e., email.handlebars
    //     to: user.email,
    //     subject: `Welcome to My Company, ${user.name}`,
    //     context: {
    //       name: user.name,
    //       company: 'my company'
    //     },
};

export { sendMail };
