import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { orgRouter } from './controllers/orgController';
import { authRouter } from './controllers/authController';
import { authenticate } from './middleware/authMiddleware';
import { errorHandler } from './middleware/errorHandler';
import { loggerMethodMiddleware } from './middleware/loggerMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Super middleware
app.use(errorHandler);
app.use(loggerMethodMiddleware);

// Routes
app.use('/api/auth', authRouter);
app.use(`/organizations`, authenticate, orgRouter); // add authenticate middleware

// Default route
app.get('/', (req, res) => {
    res.send('PhotoComp API is running');
});

// Default 404 for non-existent pages and methods
app.all(/(.*)/, (req: any, res: any) => {
    res.status(404).json({ message: `Invalid Page!` });
});

app.listen(PORT, () => {
    console.log(`Server is listening on http://localhost:${PORT}`);
});
