// SmartDukaan Backend Express Server
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import productRoutes from './routes/products.js';
import { loadModel, isModelReady } from './services/embeddings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(cors()); // Allow mobile app requests
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies
app.use('/uploads', express.static( // Serve uploaded images
  path.join(__dirname, '..', 'uploads')
));

// Routes
app.use('/api/products', productRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    model: isModelReady() ? 'loaded' : 'not loaded',
    timestamp: new Date().toISOString(),
  });
});

// Start server
async function start() {
  // Load the ML model
  await loadModel();

  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
  });
}

start();
