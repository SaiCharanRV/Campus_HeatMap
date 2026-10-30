import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Where MONGO_URI=memory keeps its data, so complaints survive server restarts
export const LOCAL_DB_DIR = path.resolve(__dirname, '../../.mongo-data');

let memoryServer = null;

/** Connects to MongoDB. Returns true when running on the built-in local database. */
export async function connectDB() {
  let uri = env.mongoUri;
  const local = uri === 'memory';

  if (local) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
    memoryServer = await MongoMemoryServer.create({
      instance: { dbPath: LOCAL_DB_DIR, storageEngine: 'wiredTiger' },
    });
    uri = memoryServer.getUri('iitr_complaints');
    console.log(`[db] Using built-in local MongoDB (data saved in ${LOCAL_DB_DIR})`);
  }

  // On Windows the local mongod is killed instantly on stop, so make every write
  // wait for the on-disk journal (j: true) to avoid losing recent changes.
  await mongoose.connect(uri, local ? { writeConcern: { w: 1, j: true } } : {});
  console.log(`[db] Connected to ${local ? 'local MongoDB' : 'MongoDB'}`);
  return local;
}

export async function disconnectDB() {
  if (memoryServer) {
    // Flush everything to the data files before the process is stopped
    await mongoose.connection.db?.admin().command({ fsync: 1 }).catch(() => {});
  }
  await mongoose.disconnect();
  // doCleanup: false keeps the data files on disk
  if (memoryServer) await memoryServer.stop({ doCleanup: false });
}
