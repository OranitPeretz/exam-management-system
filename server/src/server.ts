import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';

const server = app.listen(
  env.PORT,
  () => {
    console.log(
      `API is running at http://localhost:${env.PORT}`,
    );
  },
);

let isShuttingDown = false;

function shutdown(signal: string): void {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(
    `${signal} received. Starting graceful shutdown.`,
  );

  server.close(() => {
    void prisma
      .$disconnect()
      .then(() => {
        console.log(
          'Database disconnected. Server stopped.',
        );

        process.exit(0);
      })
      .catch((error: unknown) => {
        console.error(
          'Database disconnection failed.',
          error,
        );

        process.exit(1);
      });
  });
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});