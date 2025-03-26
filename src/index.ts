import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { orgRouter } from './controllers/orgController';
import { authRouter } from './controllers/authController';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use(`/organizations`, authRouter, orgRouter);

// Default route
app.get('/', (req, res) => {
  res.send('PhotoComp API is running');
});

// Default 404 for non-existent pages and methods
app.all(/(.*)/, (req: any, res: any) => {
  res.status(404).json({ message: `Invalid Page!` });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is listening on http://localhost:${PORT}`);
});
