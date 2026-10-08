import mongoose from 'mongoose';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

async function start() {
  if (env.SHOW_RESET_LINK && env.NODE_ENV === 'production') {
    console.warn('WARNING: SHOW_RESET_LINK=true in production lets anyone reset any account. Use only for private demos.');
  }
  try {
    await connectDB();
    const server = app.listen(env.PORT, () => {
      console.log(`API running on http://localhost:${env.PORT}/api`);
      console.log(`Swagger docs at http://localhost:${env.PORT}/api/docs`);
    });

    // finish in-flight requests and close the database cleanly on docker stop / Ctrl+C
    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down...`);
      server.close(async () => {
        await mongoose.disconnect();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
