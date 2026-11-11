import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

let projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '';
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    projectId = parsed.projectId || projectId;
  }
} catch (e) {
  // Ignore fallback
}

if (!getApps().length) {
  initializeApp({
    projectId: projectId || undefined,
  });
}

export const adminAuth = getAuth();
