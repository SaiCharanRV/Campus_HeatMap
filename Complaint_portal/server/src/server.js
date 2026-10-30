import http from 'node:http';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { mailEnabled } from './config/mailer.js';
import { cloudinaryEnabled } from './config/cloudinary.js';
import { createApp } from './app.js';
import { initSockets } from './sockets/index.js';
import { startSlaJob, runSlaChecks } from './jobs/sla.job.js';
import { seedDatabase } from './seed/seed.js';
import { User } from './models/index.js';

async function main() {
  const local = await connectDB();
  // First run on the built-in database: create zones, locations and staff accounts (no fake complaints)
  if (local && !(await User.exists({}))) await seedDatabase();

  const app = createApp();
  const server = http.createServer(app);
  initSockets(server);

  startSlaJob();
  runSlaChecks();

  // Close the database cleanly on Ctrl+C / nodemon restart so local data files stay consistent
  const shutdown = async () => {
    server.close();
    await disconnectDB().catch(() => {});
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  process.once('SIGUSR2', shutdown);

  server.listen(env.port, () => {
    console.log(`[server] API on ${env.serverUrl}/api`);
    console.log(`[server] Email: ${mailEnabled ? 'SMTP' : 'console (set SMTP_HOST to send real emails)'}`);
    console.log(`[server] Uploads: ${cloudinaryEnabled ? 'Cloudinary' : 'local disk (server/uploads)'}`);
  });
}

main().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
