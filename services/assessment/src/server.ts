import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './db.js';
import assessmentRoutes from './routes/assessmentRoutes.js';
import learningRoutes from './routes/learningRoutes.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5001', 10);

// Restrict CORS to trusted origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5001'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server) or trusted origins
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production' && req.path !== '/health') {
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health Probe
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      service: 'careeros-assessment-service',
      port: PORT,
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      service: 'careeros-assessment-service',
      port: PORT,
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    });
  }
});

// Mount Routes
app.use('/api/assessments', assessmentRoutes);
app.use('/api/learning', learningRoutes);

// Fallback error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled service error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  CareerOS Assessment & Learning Service Running     `);
  console.log(`  Port: http://localhost:${PORT}                     `);
  console.log(`  Health: http://localhost:${PORT}/health            `);
  console.log(`====================================================`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received. Shutting down gracefully.');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});
