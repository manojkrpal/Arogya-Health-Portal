import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { query } from '../db/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'arogyanet_jwt_production_secret_key_demo_2025';

export type RoleType =
  | 'phc_nurse'
  | 'district_officer'
  | 'national_war_room'
  | 'brics_analyst'
  | 'state_admin'
  | 'procurement_officer'
  | 'compliance_auditor';

export interface TokenPayload {
  userId: string;
  email: string;
  role: RoleType;
  tenantId: string;
  facilityId: string | null;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  (req as any).requestId = requestId;

  if (!token) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header',
        request_id: requestId,
      },
    });
    return;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired session token',
        request_id: requestId,
      },
    });
    return;
  }

  // Server-side re-check from users table - NEVER trust client token alone
  try {
    const userRes = await query(
      'SELECT id, tenant_id, email, role, facility_id FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userRes.rows.length === 0) {
      res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not recognized',
          request_id: requestId,
        },
      });
      return;
    }

    const dbUser = userRes.rows[0];
    (req as any).user = {
      userId: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      tenantId: dbUser.tenant_id,
      facilityId: dbUser.facility_id,
    } as TokenPayload;

    next();
  } catch (err) {
    res.status(500).json({
      error: {
        code: 'AUTH_DATABASE_ERROR',
        message: 'Failed to verify user credentials against database',
        request_id: requestId,
      },
    });
  }
}

/**
 * BRICS Analyst Gate:
 * brics_analyst may ONLY call GET routes under /v1/federation/*
 * Any other route returns strict 403 Forbidden.
 */
export function bricsSecurityCheck(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as TokenPayload | undefined;
  const requestId = (req as any).requestId || 'req_unknown';

  if (user && user.role === 'brics_analyst') {
    const isFederationGet = req.method === 'GET' && req.path.startsWith('/federation');
    if (!isFederationGet) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN_BRICS_ANALYST',
          message: 'BRICS Analysts are restricted to /v1/federation endpoints only.',
          request_id: requestId,
        },
      });
      return;
    }
  }

  next();
}

export function requireRole(...allowedRoles: (string | string[])[]) {
  const flattenedRoles = allowedRoles.flat();
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as TokenPayload | undefined;
    const requestId = (req as any).requestId || 'req_unknown';

    if (!user || !flattenedRoles.includes(user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN_ROLE',
          message: `Action requires one of: ${flattenedRoles.join(', ')}. Current role: ${user?.role || 'none'}`,
          request_id: requestId,
        },
      });
      return;
    }

    next();
  };
}
