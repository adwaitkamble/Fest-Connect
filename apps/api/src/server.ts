import { createApp } from './app.js';
import { getCacheService } from './cache/index.js';

const app = createApp();
const PORT = Number(process.env.PORT) || 4000;

const server = app.listen(PORT, () => {
  console.log(`[FestConnect API] Server running at http://localhost:${PORT}`);
  console.log(`[FestConnect API] Health endpoint available at http://localhost:${PORT}/api/health`);
  console.log(`[FestConnect API] Environment: ${process.env.NODE_ENV || 'development'}`);
});

function handleShutdown(signal: string) {
  console.log(`[FestConnect API] Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('[FestConnect API] HTTP server closed.');
    try {
      await getCacheService().close();
    } catch {
      // Ignore
    }
    process.exit(0);
  });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
