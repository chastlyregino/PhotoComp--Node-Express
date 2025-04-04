import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './controllers/authController';
import { orgRouter } from './controllers/orgController';
import { errorHandler } from './middleware/errorHandler';
import { loggerMethodMiddleware } from './middleware/loggerMiddleware';
import { eventRouter } from './controllers/eventController';
import { guestRouter } from './controllers/guestController';
import { authenticate } from './middleware/authMiddleware';
import { orgMembershipRouter } from './controllers/orgMemberShipController';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Super middleware
app.use(loggerMethodMiddleware);

// Routes
app.use('/api/auth', authRouter);
app.use(`/guests`, guestRouter);
app.use(`/organizations`, authenticate, orgRouter, eventRouter, orgMembershipRouter); // add authenticate middleware

// Default route
app.get('/', (req, res) => {
    res.send('PhotoComp API is running');
});

app.all(/(.*)/, (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
});

// Error handling middleware must be used after all routes
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// powershell
// $env:NODE_ENV="production"; npm run dev

// terminal
// NODE_ENV=production npm run dev
