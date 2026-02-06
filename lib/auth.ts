/**
 * Secure Authentication System
 * Uses bcryptjs for password hashing and better-sqlite3 for persistence
 */

import * as bcryptjs from 'bcryptjs';
import Database from 'better-sqlite3';
import { randomBytes } from 'crypto';
import * as path from 'path';

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

// Database initialization
let db: Database.Database;

function initializeDatabase(): Database.Database {
  const dbPath = process.env.DB_PATH || './data/controlling.db';
  const dbDir = path.dirname(dbPath);

  // Create data directory if it doesn't exist
  if (dbDir !== '.' && dbDir !== '') {
    try {
      const fs = require('fs');
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    } catch (error) {
      console.warn('Could not create data directory:', error);
    }
  }

  const database = new Database(dbPath);
  database.pragma('journal_mode = WAL');

  // Create tables if they don't exist
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      createdAt TEXT NOT NULL,
      lastLogin TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      userId TEXT NOT NULL,
      token TEXT PRIMARY KEY,
      expiresAt INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auditLog (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      userName TEXT NOT NULL,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      details TEXT,
      timestamp TEXT NOT NULL,
      ip TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expiresAt);
    CREATE INDEX IF NOT EXISTS idx_auditlog_timestamp ON auditLog(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_auditlog_userId ON auditLog(userId);
  `);

  return database;
}

// Get or initialize database
function getDb(): Database.Database {
  if (!db) {
    db = initializeDatabase();
    initializeDemoUsers();
  }
  return db;
}

// Initialize demo users on first run
function initializeDemoUsers(): void {
  const database = getDb();
  const demoUsers = [
    { id: 'admin-1', email: 'admin@controlling.local', name: 'Administrator', role: 'admin' },
    { id: 'controller-1', email: 'controller@controlling.local', name: 'Max Mustermann', role: 'controller' },
    { id: 'viewer-1', email: 'viewer@controlling.local', name: 'Leser Zugang', role: 'viewer' },
  ];

  const stmt = database.prepare('SELECT COUNT(*) as count FROM users');
  const result = stmt.get() as { count: number };

  if (result.count === 0) {
    const insertStmt = database.prepare(
      'INSERT INTO users (id, email, name, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const now = new Date().toISOString();
    for (const user of demoUsers) {
      const passwordHash = bcryptjs.hashSync('demo123', 12);
      insertStmt.run(user.id, user.email, user.name, passwordHash, user.role, now);
    }
  }
}

/**
 * Hash password with bcryptjs
 */
export function hashPassword(password: string): string {
  return bcryptjs.hashSync(password, 12);
}

/**
 * Verify password against hash
 */
function verifyPassword(password: string, hash: string): boolean {
  return bcryptjs.compareSync(password, hash);
}

/**
 * Generate session token
 */
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions(): void {
  const database = getDb();
  const now = Date.now();
  database.prepare('DELETE FROM sessions WHERE expiresAt < ?').run(now);
}

/**
 * Authenticate user
 */
export async function authenticate(
  email: string,
  password: string
): Promise<{ success: boolean; user?: Omit<User, 'passwordHash'>; token?: string; error?: string }> {
  try {
    const database = getDb();
    const stmt = database.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email) as User | undefined;

    if (!user) {
      return { success: false, error: 'Benutzer nicht gefunden' };
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return { success: false, error: 'Falsches Passwort' };
    }

    // Create session
    const token = generateToken();
    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

    const insertSession = database.prepare(
      'INSERT INTO sessions (userId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?)'
    );
    insertSession.run(user.id, token, expiresAt, now);

    // Update last login
    const updateStmt = database.prepare('UPDATE users SET lastLogin = ? WHERE id = ?');
    updateStmt.run(new Date().toISOString(), user.id);

    // Audit
    await logAudit(user.id, user.name, 'LOGIN', 'auth', { email });

    const { passwordHash, ...safeUser } = user;
    return { success: true, user: safeUser, token };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Ein Fehler ist aufgetreten' };
  }
}

/**
 * Validate session token
 */
export async function validateSession(token: string): Promise<{ valid: boolean; user?: Omit<User, 'passwordHash'> }> {
  try {
    const database = getDb();

    // Clean up expired sessions
    cleanupExpiredSessions();

    const sessionStmt = database.prepare('SELECT * FROM sessions WHERE token = ?');
    const session = sessionStmt.get(token) as Session | undefined;

    if (!session) {
      return { valid: false };
    }

    if (session.expiresAt < Date.now()) {
      database.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      return { valid: false };
    }

    const userStmt = database.prepare('SELECT * FROM users WHERE id = ?');
    const user = userStmt.get(session.userId) as User | undefined;

    if (!user) {
      return { valid: false };
    }

    const { passwordHash, ...safeUser } = user;
    return { valid: true, user: safeUser };
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false };
  }
}

/**
 * Logout / invalidate session
 */
export async function logout(token: string): Promise<void> {
  try {
    const database = getDb();
    const sessionStmt = database.prepare('SELECT * FROM sessions WHERE token = ?');
    const session = sessionStmt.get(token) as Session | undefined;

    if (session) {
      const userStmt = database.prepare('SELECT * FROM users WHERE id = ?');
      const user = userStmt.get(session.userId) as User | undefined;

      if (user) {
        await logAudit(user.id, user.name, 'LOGOUT', 'auth');
      }

      database.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    }
  } catch (error) {
    console.error('Logout error:', error);
  }
}

/**
 * Get all users (admin only)
 */
export async function getUsers(): Promise<Omit<User, 'passwordHash'>[]> {
  try {
    const database = getDb();
    const stmt = database.prepare('SELECT * FROM users ORDER BY createdAt DESC');
    const users = stmt.all() as User[];
    return users.map(({ passwordHash, ...u }) => u);
  } catch (error) {
    console.error('Get users error:', error);
    return [];
  }
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
  try {
    const database = getDb();

    // Check if email already exists
    const checkStmt = database.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?');
    const result = checkStmt.get(email) as { count: number };

    if (result.count > 0) {
      return { success: false, error: 'Email bereits vergeben' };
    }

    const userId = `user-${Date.now()}`;
    const now = new Date().toISOString();
    const passwordHash = hashPassword(password);

    const insertStmt = database.prepare(
      'INSERT INTO users (id, email, name, passwordHash, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insertStmt.run(userId, email, name, passwordHash, role, now);

    const user: Omit<User, 'passwordHash'> = {
      id: userId,
      email,
      name,
      role,
      createdAt: now,
    };

    return { success: true, user };
  } catch (error) {
    console.error('Create user error:', error);
    return { success: false, error: 'Ein Fehler ist aufgetreten' };
  }
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
  try {
    const database = getDb();
    const id = `audit-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const detailsJson = details ? JSON.stringify(details) : null;

    const stmt = database.prepare(
      'INSERT INTO auditLog (id, userId, userName, action, resource, details, timestamp, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    stmt.run(id, userId, userName, action, resource, detailsJson, timestamp, ip || null);

    // Cleanup old audit logs (keep only last 10000 entries)
    const countStmt = database.prepare('SELECT COUNT(*) as count FROM auditLog');
    const result = countStmt.get() as { count: number };

    if (result.count > 10000) {
      const deleteStmt = database.prepare(`
        DELETE FROM auditLog WHERE id NOT IN (
          SELECT id FROM auditLog ORDER BY timestamp DESC LIMIT 10000
        )
      `);
      deleteStmt.run();
    }
  } catch (error) {
    console.error('Audit logging error:', error);
  }
}

/**
 * Get audit log
 */
export async function getAuditLog(
  options: { userId?: string; action?: string; limit?: number; offset?: number } = {}
): Promise<{ entries: AuditEntry[]; total: number }> {
  try {
    const database = getDb();
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    let query = 'SELECT * FROM auditLog WHERE 1=1';
    const params: unknown[] = [];

    if (options.userId) {
      query += ' AND userId = ?';
      params.push(options.userId);
    }

    if (options.action) {
      query += ' AND action = ?';
      params.push(options.action);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countStmt = database.prepare(countQuery);
    const countResult = countStmt.get(...params) as { count: number };
    const total = countResult.count;

    // Get paginated results
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = database.prepare(query);
    const results = stmt.all(...params) as Array<Omit<AuditEntry, 'details'> & { details: string | null }>;

    const entries: AuditEntry[] = results.map(entry => ({
      ...entry,
      details: entry.details ? JSON.parse(entry.details) : undefined,
    }));

    return { entries, total };
  } catch (error) {
    console.error('Get audit log error:', error);
    return { entries: [], total: 0 };
  }
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

// Initialize database on module load
getDb();
