import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});
