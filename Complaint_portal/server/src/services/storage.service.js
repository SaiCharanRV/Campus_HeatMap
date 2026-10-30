import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { cloudinary, cloudinaryEnabled } from '../config/cloudinary.js';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

function uploadToCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `iitr-complaints/${folder}`, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(file.buffer);
  });
}

async function saveLocally(file) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${EXT[file.mimetype] || ''}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), file.buffer);
  return `${env.serverUrl}/uploads/${name}`;
}

/** Stores multer files (Cloudinary if configured, otherwise local disk) and returns their URLs. */
export async function storeImages(files = [], folder = 'complaints') {
  return Promise.all(
    files.map((f) => (cloudinaryEnabled ? uploadToCloudinary(f, folder) : saveLocally(f)))
  );
}
