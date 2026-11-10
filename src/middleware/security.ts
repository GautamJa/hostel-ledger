import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Strips script tags, javascript: uris, and common event handlers from strings
 * to protect against Cross-Site Scripting (XSS).
 */
export function sanitizeString(val: string): string {
  if (typeof val !== 'string') return val;
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Deep sanitization of objects to prevent Prototype Pollution
 * and sanitize string inputs.
 */
export function sanitizeObject(obj: any, depth = 0): any {
  if (depth > 8 || obj === null || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    // Defend against Prototype Pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    clean[key] = sanitizeObject(obj[key], depth + 1);
  }
  return clean;
}

/**
 * Middleware: Apply defensive HTTP security headers
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction) => {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Content-Security-Policy that allows safe resources while keeping iframe embedding functional
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; frame-ancestors 'self' https: http:; img-src 'self' data: blob: https:;"
  );
  next();
};

/**
 * Middleware: Sanitize request bodies and query parameters
 */
export const sanitizeRequestBody = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  next();
};

/**
 * Rate Limiter for general API requests (400 req / 15 minutes)
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 400,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    trustProxy: false,
    default: false,
  },
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  message: {
    error: 'Too many requests from this client. Please slow down and try again later.',
  },
});

/**
 * Stricter Rate Limiter for sensitive data mutations (POST, PUT, DELETE: 120 req / 15 minutes)
 */
export const mutationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: false,
    forwardedHeader: false,
    trustProxy: false,
    default: false,
  },
  keyGenerator: (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  message: {
    error: 'Mutation rate limit reached. Please wait a moment before saving further changes.',
  },
});

/**
 * Middleware: Validate that numeric ID route params are positive integers
 */
export const validateNumericId = (paramName = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const val = req.params[paramName];
    if (val !== undefined) {
      const num = parseInt(val, 10);
      if (isNaN(num) || num < 0 || String(num) !== val) {
        return res.status(400).json({ error: `Invalid ${paramName} parameter. Expected a positive integer.` });
      }
    }
    next();
  };
};
