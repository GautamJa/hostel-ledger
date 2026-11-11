import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

import { isPostgresHealthy } from '../db/index.ts';
import { dataStore, verifySessionToken } from '../server/dataStore.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken | { uid: string; email: string; name: string };
  dbUser?: typeof users.$inferSelect;
}

const SYSTEM_ROLES: Record<string, { email: string; fullName: string; uid: string }> = {
  admin: { email: 'admin@dormis.edu', fullName: 'System Administrator', uid: 'system_admin_uid' },
  warden: { email: 'warden@dormis.edu', fullName: 'Arthur Pendelton (Warden)', uid: 'system_warden_uid' },
  accountant: { email: 'accountant@dormis.edu', fullName: 'Accounts Officer', uid: 'system_accountant_uid' },
  student: { email: 'julian.vance@example.edu', fullName: 'Julian Vance', uid: 'system_student_uid' },
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const requestedRole = (req.headers['x-active-role'] as string) || 'admin';

  let token: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split('Bearer ')[1].trim();
  }

  // 1. Check for signed SomnathRecorders session token
  if (token && token.startsWith('sr_token_')) {
    const session = verifySessionToken(token);
    if (session) {
      const dsUser = dataStore.getUserById(session.userId) || dataStore.getUserByEmail(session.email);
      if (dsUser && dsUser.isActive) {
        req.user = {
          uid: dsUser.uid,
          email: dsUser.email,
          name: dsUser.fullName,
        };
        req.dbUser = {
          id: dsUser.id,
          uid: dsUser.uid,
          email: dsUser.email,
          fullName: dsUser.fullName,
          role: dsUser.role, // strictly their database role!
          phone: dsUser.phone || null,
          isActive: dsUser.isActive,
          createdAt: new Date(dsUser.createdAt),
          updatedAt: new Date(dsUser.updatedAt),
        };
        return next();
      }
    }
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }

  const roleKey = ['admin', 'warden', 'accountant', 'student'].includes(requestedRole) ? requestedRole : 'admin';
  const roleConfig = SYSTEM_ROLES[roleKey];

  // If a real Firebase token is provided (not 'demo-token' or empty)
  if (token && token !== 'demo-token' && token !== 'null' && token.length > 20) {
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;

      const pgOk = await isPostgresHealthy();
      if (pgOk) {
        let dbUser = await db.select().from(users).where(eq(users.uid, decodedToken.uid)).then(r => r[0]);
        if (!dbUser) {
          const totalUsers = await db.select().from(users);
          const role = totalUsers.length === 0 ? 'admin' : 'student';

          const inserted = await db.insert(users).values({
            uid: decodedToken.uid,
            email: decodedToken.email || 'user@example.com',
            fullName: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
            role,
            isActive: true,
          }).returning();
          dbUser = inserted[0];
        }

        // Protect against privilege escalation: only verified admins can switch active role view
        const effectiveRole =
          dbUser.role === 'admin'
            ? (['admin', 'warden', 'accountant', 'student'].includes(requestedRole) ? requestedRole : dbUser.role)
            : dbUser.role;

        req.dbUser = { ...dbUser, role: effectiveRole };
        return next();
      } else {
        // Use dataStore
        let dsUser = dataStore.getUserByUid(decodedToken.uid);
        if (!dsUser) {
          const totalUsers = dataStore.getUsers();
          const role = totalUsers.length === 0 ? 'admin' : 'student';
          dsUser = dataStore.createUser({
            uid: decodedToken.uid,
            email: decodedToken.email || 'user@example.com',
            fullName: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
            role,
            phone: null,
            isActive: true,
          });
        }

        const effectiveRole =
          dsUser.role === 'admin'
            ? (['admin', 'warden', 'accountant', 'student'].includes(requestedRole) ? requestedRole : dsUser.role)
            : dsUser.role;

        req.dbUser = {
          id: dsUser.id,
          uid: dsUser.uid,
          email: dsUser.email,
          fullName: dsUser.fullName,
          role: effectiveRole,
          phone: dsUser.phone || null,
          isActive: dsUser.isActive,
          createdAt: new Date(dsUser.createdAt),
          updatedAt: new Date(dsUser.updatedAt),
        };
        return next();
      }
    } catch (error) {
      // Fall through to system role resolution below
    }
  }

  // Fallback to system role profile (handles initial page load, preview mode, and role testing)
  try {
    const pgOk = await isPostgresHealthy();
    if (pgOk) {
      let dbUser = await db.select().from(users).where(eq(users.uid, roleConfig.uid)).then(r => r[0]);
      if (!dbUser) {
        const inserted = await db.insert(users).values({
          uid: roleConfig.uid,
          email: roleConfig.email,
          fullName: roleConfig.fullName,
          role: roleKey,
          isActive: true,
        }).onConflictDoUpdate({
          target: users.uid,
          set: { role: roleKey, email: roleConfig.email },
        }).returning();
        dbUser = inserted[0];
      } else if (dbUser.role !== roleKey) {
        const updated = await db.update(users).set({ role: roleKey }).where(eq(users.id, dbUser.id)).returning();
        dbUser = updated[0];
      }

      req.user = { uid: roleConfig.uid, email: roleConfig.email, name: roleConfig.fullName };
      req.dbUser = dbUser;
      return next();
    }
  } catch (dbErr) {
    // Ignore and proceed to dataStore fallback
  }

  // Resolving from dataStore
  let dsUser = dataStore.getUserByUid(roleConfig.uid) || dataStore.getUserByEmail(roleConfig.email);
  if (!dsUser) {
    dsUser = dataStore.createUser({
      uid: roleConfig.uid,
      email: roleConfig.email,
      fullName: roleConfig.fullName,
      role: roleKey as any,
      phone: null,
      isActive: true,
    });
  }

  req.user = { uid: roleConfig.uid, email: roleConfig.email, name: roleConfig.fullName };
  req.dbUser = {
    id: dsUser.id,
    uid: dsUser.uid,
    email: dsUser.email,
    fullName: dsUser.fullName,
    role: roleKey as any,
    phone: dsUser.phone || null,
    isActive: dsUser.isActive,
    createdAt: new Date(dsUser.createdAt),
    updatedAt: new Date(dsUser.updatedAt),
  };
  return next();
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.dbUser.role) && req.dbUser.role !== 'admin') {
      return res.status(403).json({ error: `Forbidden: requires one of [${allowedRoles.join(', ')}] permissions` });
    }
    next();
  };
};
