import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

import { db, User } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'cinevora_super_secret_jwt_key_2026_futuristic_anime';

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please login.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = db.getUserById(decoded.id);

    if (!user || user.status === 'SUSPENDED') {
      res.status(403).json({ error: 'User account is suspended or invalid.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired session token.' });
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const user = db.getUserById(decoded.id);
      if (user && user.status === 'ACTIVE') {
        req.user = user;
      }
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  authenticateToken(req, res, () => {
    if (req.user && (req.user.role === 'EDITOR' || req.user.role === 'SUPER_ADMIN')) {
      next();
    } else {
      res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
  });
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  authenticateToken(req, res, () => {
    if (req.user && req.user.role === 'SUPER_ADMIN') {
      next();
    } else {
      res.status(403).json({ error: 'Access denied. Super Admin privileges required.' });
    }
  });
}
