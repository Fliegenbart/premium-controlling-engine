/**
 * Simple Authentication System
 * Basic user management with JWT tokens
 */

import { createHash, randomBytes } from 'crypto';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'controller' | 'viewer';
  createdAt: string;
  lastLogin?: string;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: number;
  createdAt: number;
}

export interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  timestamp: string;
  ip?: string;
}

// In-memory stores (replace with DB in production)
const users: Map<string, User> = new Map();
const sessions: Map<string, Session> = new Map();
const auditLog: AuditEntry[] = [];

// Initialize with demo users
const DEMO_USERS: Omit<User, 'passwordHash'>[] = [
  { id: 'admin-1', email: 'admin@controlling.local', name: 'Administrator', role: 'admin', createdAt: new Date().toISOString() },
  { id: 'controller-1', email: 'controller@controlling.local', name: 'Max Mustermann', role: 'controller', createdAt: new Date().toISOString() },
  { id: 'viewer-1', email: 'viewer@controlling.local', name: 'Leser Zugang', role: 'viewer', createdAt: new Date().toISOString() },
];

// Initialize demo users with password "demo123"
DEMO_USERS.forEach(u => {
  users.set(u.id, {
    ...u,
    passwordHash: hashPassword('demo123')
  });
});

/**
 * Hash password with salt
 */
export function hashPassword(password: string): string {
  const salt = 'controlling-engine-salt-v1'; // In production: use random salt per user
  return createHash('sha256').update(password + salt).digest('hex');
}

/**
 * Generate session token
 */
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Authenticate user
 */
export async function authenticate(
  email: string,
  password: string
): Promise<{ success: boolean; user?: Omit<User, 'passwordHash'>; token?: string; error?: string }> {
  const user = Array.from(users.values()).find(u => u.email === email);

  if (!user) {
    return { success: false, error: 'Benutzer nicht gefunden' };
  }

  if (user.passwordHash !== hashPassword(password)) {
    return { success: false, error: 'Falsches Passwort' };
  }

  // Create session
  const token = generateToken();
  const session: Session = {
    userId: user.id,
    token,
    expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    createdAt: Date.now()
  };
  sessions.set(token, session);

  // Update last login
  user.lastLogin = new Date().toISOString();

  // Audit
  await logAudit(user.id, user.name, 'LOGIN', 'auth', { email });

  const { passwordHash, ...safeUser } = user;
  return { success: true, user: safeUser, token };
}

/**
 * Validate session token
 */
export async function validateSession(token: string): Promise<{ valid: boolean; user?: Omit<User, 'passwordHash'> }> {
  const session = sessions.get(token);

  if (!session) {
    return { valid: false };
  }

  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return { valid: false };
  }

  const user = users.get(session.userId);
  if (!user) {
    return { valid: false };
  }

  const { passwordHash, ...safeUser } = user;
  return { valid: true, user: safeUser };
}

/**
 * Logout / invalidate session
 */
export async function logout(token: string): Promise<void> {
  const session = sessions.get(token);
  if (session) {
    const user = users.get(session.userId);
    if (user) {
      await logAudit(user.id, user.name, 'LOGOUT', 'auth');
    }
    sessions.delete(token);
  }
}

/**
 * Get all users (admin only)
 */
export async function getUsers(): Promise<Omit<User, 'passwordHash'>[]> {
  return Array.from(users.values()).map(({ passwordHash, ...u }) => u);
}

/**
 * Create user
 */
export async function createUser(
  email: string,
  name: string,
  password: string,
  role: User['role']
): Promise<{ success: boolean; user?: Omit<User, 'passwordHash'>; error?: string }> {
  if (Array.from(users.values()).some(u => u.email === email)) {
    return { success: false, error: 'Email bereits vergeben' };
  }

  const user: User = {
    id: `user-${Date.now()}`,
    email,
    name,
    passwordHash: hashPassword(password),
    role,
    createdAt: new Date().toISOString()
  };

  users.set(user.id, user);

  const { passwordHash, ...safeUser } = user;
  return { success: true, user: safeUser };
}

/**
 * Log audit entry
 */
export async function logAudit(
  userId: string,
  userName: string,
  action: string,
  resource: string,
  details?: Record<string, unknown>,
  ip?: string
): Promise<void> {
  const entry: AuditEntry = {
    id: `audit-${Date.now()}-${randomBytes(4).toString('hex')}`,
    userId,
    userName,
    action,
    resource,
    details,
    timestamp: new Date().toISOString(),
    ip
  };

  auditLog.push(entry);

  // Keep only last 10000 entries
  if (auditLog.length > 10000) {
    auditLog.splice(0, auditLog.length - 10000);
  }
}

/**
 * Get audit log
 */
export async function getAuditLog(
  options: { userId?: string; action?: string; limit?: number; offset?: number } = {}
): Promise<{ entries: AuditEntry[]; total: number }> {
  let filtered = [...auditLog];

  if (options.userId) {
    filtered = filtered.filter(e => e.userId === options.userId);
  }
  if (options.action) {
    filtered = filtered.filter(e => e.action === options.action);
  }

  // Sort by timestamp descending
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = filtered.length;
  const offset = options.offset || 0;
  const limit = options.limit || 50;

  return {
    entries: filtered.slice(offset, offset + limit),
    total
  };
}

/**
 * Check permission
 */
export function hasPermission(user: Omit<User, 'passwordHash'>, action: string): boolean {
  const permissions: Record<User['role'], string[]> = {
    admin: ['*'], // All permissions
    controller: ['view', 'upload', 'analyze', 'export', 'comment'],
    viewer: ['view']
  };

  const userPerms = permissions[user.role];
  return userPerms.includes('*') || userPerms.includes(action);
}
