import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { getTenantId } from './context.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DB_DIR = path.join(ROOT, 'data');
const DB_PATH = process.env.DATABASE_PATH || path.join(DB_DIR, 'gst_multitenant.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    collection TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (tenant_id, collection, id)
  );

  CREATE TABLE IF NOT EXISTS blobs (
    tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    filename TEXT,
    mime TEXT,
    data BLOB NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (tenant_id, id)
  );

  CREATE INDEX IF NOT EXISTS idx_docs_tenant_col ON documents(tenant_id, collection);
  CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
`);

const stmts = {
  listDocs: db.prepare(
    'SELECT id, data FROM documents WHERE tenant_id = ? AND collection = ?',
  ),
  getDoc: db.prepare(
    'SELECT data FROM documents WHERE tenant_id = ? AND collection = ? AND id = ?',
  ),
  upsertDoc: db.prepare(`
    INSERT INTO documents (tenant_id, collection, id, data, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(tenant_id, collection, id) DO UPDATE SET
      data = excluded.data,
      updated_at = excluded.updated_at
  `),
  deleteDoc: db.prepare(
    'DELETE FROM documents WHERE tenant_id = ? AND collection = ? AND id = ?',
  ),
  existsDoc: db.prepare(
    'SELECT 1 AS ok FROM documents WHERE tenant_id = ? AND collection = ? AND id = ? LIMIT 1',
  ),
  listCollections: db.prepare(
    'SELECT DISTINCT collection FROM documents WHERE tenant_id = ?',
  ),
  insertTenant: db.prepare(
    'INSERT INTO tenants (id, slug, name, created_at, status) VALUES (?, ?, ?, ?, ?)',
  ),
  getTenantBySlug: db.prepare('SELECT * FROM tenants WHERE slug = ?'),
  getTenantById: db.prepare('SELECT * FROM tenants WHERE id = ?'),
  insertUser: db.prepare(
    'INSERT INTO users (id, tenant_id, email, password_hash, name, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ),
  getUserByEmail: db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)'),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  upsertBlob: db.prepare(`
    INSERT INTO blobs (tenant_id, id, filename, mime, data, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(tenant_id, id) DO UPDATE SET
      filename = excluded.filename,
      mime = excluded.mime,
      data = excluded.data,
      updated_at = excluded.updated_at
  `),
  getBlob: db.prepare('SELECT * FROM blobs WHERE tenant_id = ? AND id = ?'),
  deleteBlob: db.prepare('DELETE FROM blobs WHERE tenant_id = ? AND id = ?'),
};

export function getDb() {
  return db;
}

export function listDocs(collection, tenantId = getTenantId()) {
  return stmts.listDocs.all(tenantId, collection).map((row) => {
    try {
      return JSON.parse(row.data);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

export function getDoc(collection, id, tenantId = getTenantId()) {
  const row = stmts.getDoc.get(tenantId, collection, id);
  if (!row) return null;
  try {
    return JSON.parse(row.data);
  } catch {
    return null;
  }
}

export function putDoc(collection, id, data, tenantId = getTenantId()) {
  stmts.upsertDoc.run(
    tenantId,
    collection,
    String(id),
    JSON.stringify(data),
    new Date().toISOString(),
  );
}

export function deleteDoc(collection, id, tenantId = getTenantId()) {
  stmts.deleteDoc.run(tenantId, collection, String(id));
}

export function docExists(collection, id, tenantId = getTenantId()) {
  return !!stmts.existsDoc.get(tenantId, collection, String(id));
}

export function moveDoc(fromCollection, toCollection, id, tenantId = getTenantId()) {
  const data = getDoc(fromCollection, id, tenantId);
  if (!data) return false;
  putDoc(toCollection, id, data, tenantId);
  deleteDoc(fromCollection, id, tenantId);
  return true;
}

export function exportTenantData(tenantId = getTenantId()) {
  const collections = [
    'bills', 'clients', 'templates', 'products', 'expenses',
    'recurring', 'receipts', 'profiles', 'purchases', 'trash',
  ];
  const out = { exportedAt: new Date().toISOString() };
  for (const col of collections) {
    out[col === 'templates' ? 'termsTemplates' : col] = listDocs(col, tenantId);
  }
  out.profile = getDoc('_root', 'profile', tenantId) || {};
  out.meta = getDoc('_root', 'meta', tenantId) || {};
  out.localPrefs = getDoc('_root', 'local-prefs', tenantId) || {};
  return out;
}

export function createTenant({ id, slug, name }) {
  stmts.insertTenant.run(id, slug, name, new Date().toISOString(), 'active');
  return stmts.getTenantById.get(id);
}

export function findTenantBySlug(slug) {
  return stmts.getTenantBySlug.get(slug) || null;
}

export function findTenantById(id) {
  return stmts.getTenantById.get(id) || null;
}

export function createUser({ id, tenantId, email, passwordHash, name, role = 'owner' }) {
  stmts.insertUser.run(
    id,
    tenantId,
    email.toLowerCase(),
    passwordHash,
    name,
    role,
    new Date().toISOString(),
  );
  return stmts.getUserById.get(id);
}

export function findUserByEmail(email) {
  return stmts.getUserByEmail.get(email) || null;
}

export function findUserById(id) {
  return stmts.getUserById.get(id) || null;
}

export function saveBlob(id, buffer, { filename = '', mime = 'application/octet-stream' } = {}, tenantId = getTenantId()) {
  stmts.upsertBlob.run(
    tenantId,
    String(id),
    filename,
    mime,
    buffer,
    new Date().toISOString(),
  );
}

export function loadBlob(id, tenantId = getTenantId()) {
  return stmts.getBlob.get(tenantId, String(id)) || null;
}

export function removeBlob(id, tenantId = getTenantId()) {
  stmts.deleteBlob.run(tenantId, String(id));
}

/** Map a legacy data/ file path to { collection, id }. */
export function pathToDoc(filePath, dataDir) {
  const rel = path.relative(dataDir, path.normalize(filePath)).replace(/\\/g, '/');
  if (!rel || rel.startsWith('..')) return null;
  if (!rel.includes('/')) {
    return { collection: '_root', id: rel.replace(/\.json$/i, '') };
  }
  const parts = rel.split('/');
  const collection = parts[0];
  const file = parts[parts.length - 1];
  return { collection, id: file.replace(/\.json$/i, '') };
}

export const DB_FILE = DB_PATH;
