/**
 * Test harness: starts the real Express app + Socket.IO on a random port against a
 * throwaway in-memory MongoDB (never the saved local database), seeded with the
 * normal zones, locations and demo accounts.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.SMTP_HOST = '';
process.env.CLOUDINARY_CLOUD_NAME = '';
process.env.STUDENT_EMAIL_DOMAIN = '';
process.env.RECURRING_THRESHOLD = '3';
process.env.RECURRING_WINDOW_DAYS = '30';

const { MongoMemoryServer } = await import('mongodb-memory-server');
const mongoose = (await import('mongoose')).default;
const { createApp } = await import('../src/app.js');
const { initSockets } = await import('../src/sockets/index.js');
const { seedDatabase } = await import('../src/seed/seed.js');
const { UPLOAD_DIR } = await import('../src/services/storage.service.js');
export const models = await import('../src/models/index.js');

let mongo;
let server;
let io;
export let BASE = '';
const uploadedFiles = new Set();

export async function startServer() {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri('iitr_test'));
  await seedDatabase({ demo: false });
  const app = createApp();
  server = http.createServer(app);
  io = initSockets(server);
  await new Promise((resolve) => server.listen(0, resolve));
  BASE = `http://localhost:${server.address().port}`;
}

export async function stopServer() {
  io?.close();
  await new Promise((resolve) => server?.close(resolve));
  await mongoose.disconnect();
  await mongo?.stop();
  // Remove images the tests uploaded
  for (const name of uploadedFiles) fs.rmSync(path.join(UPLOAD_DIR, name), { force: true });
}

/** Calls the API. Returns { status, data }. `form` sends multipart (FormData). */
export async function api(method, url, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}/api${url}`, { method, headers, body: payload });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  // Remember uploaded files so they can be deleted afterwards
  JSON.stringify(data ?? '').replace(/\/uploads\/([\w.-]+)/g, (_, f) => uploadedFiles.add(f));
  return { status: res.status, data };
}

export const STAFF_PW = 'Staff@123';
export const STUDENT_PW = 'Student@123';

export async function login(email, password = STAFF_PW, role = 'staff') {
  const { status, data } = await api('POST', '/auth/login', { body: { email, password, role } });
  if (status !== 200) throw new Error(`login ${email} failed: ${status} ${JSON.stringify(data)}`);
  return data.token;
}

export const loginStudent = (email = 'student@iitr.ac.in') => login(email, STUDENT_PW, 'student');

/** Registers a new student through the real OTP flow (devOtp is returned in test mode). */
export async function registerStudent(email, name = 'Test Student') {
  const otp = await api('POST', '/auth/register/send-otp', { body: { email } });
  if (otp.status !== 200) throw new Error(`send-otp failed: ${JSON.stringify(otp.data)}`);
  const res = await api('POST', '/auth/register/verify', {
    body: { email, otp: otp.data.devOtp, name, password: 'Password@1' },
  });
  if (res.status !== 201) throw new Error(`verify failed: ${JSON.stringify(res.data)}`);
  return res.data.token;
}

let locationCache;
export async function locationId(name) {
  if (!locationCache) {
    const token = await loginStudent();
    locationCache = (await api('GET', '/locations', { token })).data.items;
  }
  const loc = locationCache.find((l) => l.name === name);
  if (!loc) throw new Error(`No location named ${name}`);
  return loc._id;
}

/** A tiny valid PNG (1×1 px). */
export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

export function imageForm(fields, images = [], type = 'image/png') {
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => v !== undefined && form.append(k, String(v)));
  images.forEach((buf, i) => form.append('images', new Blob([buf], { type }), `photo${i}.png`));
  return form;
}

export async function fileComplaint(token, overrides = {}) {
  const body = {
    category: 'water',
    locationId: await locationId('Govind Bhawan'),
    title: 'No water on the 2nd floor',
    description: 'Taps on the 2nd floor have been dry since morning.',
    ...overrides,
  };
  const res = await api('POST', '/complaints', { token, body });
  if (res.status !== 201) throw new Error(`file complaint failed: ${res.status} ${JSON.stringify(res.data)}`);
  return res.data.complaint;
}
