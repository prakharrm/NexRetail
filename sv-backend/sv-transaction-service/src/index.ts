import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import catalogRoutes from './routes/catalog.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import telemetryRoutes from './routes/telemetry.routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/catalog', catalogRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/telemetry', telemetryRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Transaction Service running on port ${PORT}`);
});
