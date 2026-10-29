import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  createTenant,
  createUser,
  findTenantById,
  findTenantBySlug,
  findUserByEmail,
  findUserById,
} from './db.js';
import { runWithContext } from './context.js';
import { getEntitlement, startTrialForTenant } from './billing.js';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const JWT_DAYS = Number(process.env.JWT_DAYS || 14);
const COOKIE_NAME = 'gst_token';

if (!process.env.JWT_SECRET) {
  console.warn('[auth] JWT_SECRET not set — using ephemeral secret (tokens reset on restart). Set JWT_SECRET in .env for production.');
}

function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || `org-${Date.now().toString(36)}`;
}

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      tid: user.tenant_id,
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: `${JWT_DAYS}d` },
  );
}

function publicUser(user, tenant) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenant: tenant
      ? { id: tenant.id, slug: tenant.slug, name: tenant.name }
      : { id: user.tenant_id },
  };
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: JWT_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  return null;
}

export async function registerTenant({ businessName, slug, ownerName, email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(businessName || '').trim();
  const cleanOwner = String(ownerName || '').trim() || cleanName;
  const pass = String(password || '');

  if (!cleanName) {
    const err = new Error('Business name is required');
    err.status = 400;
    throw err;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    const err = new Error('Valid email is required');
    err.status = 400;
    throw err;
  }
  if (pass.length < 8) {
    const err = new Error('Password must be at least 8 characters');
    err.status = 400;
    throw err;
  }
  if (findUserByEmail(cleanEmail)) {
    const err = new Error('An account with this email already exists');
    err.status = 409;
    throw err;
  }

  let finalSlug = slugify(slug || cleanName);
  let n = 0;
  while (findTenantBySlug(finalSlug)) {
    n += 1;
    finalSlug = `${slugify(cleanName)}-${n}`;
  }

  const tenantId = `ten_${crypto.randomBytes(8).toString('hex')}`;
  const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
  const passwordHash = await bcrypt.hash(pass, 12);

  const tenant = createTenant({ id: tenantId, slug: finalSlug, name: cleanName });
  const user = createUser({
    id: userId,
    tenantId,
    email: cleanEmail,
    passwordHash,
    name: cleanOwner,
    role: 'owner',
  });

  // Seed empty profile for this tenant
  const { putDoc } = await import('./db.js');
  putDoc('_root', 'profile', {
    businessName: cleanName,
    email: cleanEmail,
    address: '',
    state: '',
    gstin: '',
    pan: '',
    phone: '',
  }, tenantId);
  putDoc('_root', 'meta', {}, tenantId);

  // Industry SaaS: every new org starts a 7-day free trial (no card required).
  startTrialForTenant(tenantId);

  const token = signToken(user);
  const entitlement = getEntitlement(tenantId);
  return { token, user: publicUser(user, tenant), entitlement };
}

export async function loginUser({ email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const user = findUserByEmail(cleanEmail);
  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }
  const ok = await bcrypt.compare(String(password || ''), user.password_hash);
  if (!ok) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }
  const tenant = findTenantById(user.tenant_id);
  if (!tenant || tenant.status !== 'active') {
    const err = new Error('Tenant is disabled');
    err.status = 403;
    throw err;
  }
  const token = signToken(user);
  const entitlement = getEntitlement(tenant.id);
  return { token, user: publicUser(user, tenant), entitlement };
}

export function verifyRequest(req) {
  const token = readToken(req);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = findUserById(payload.sub);
    if (!user) return null;
    const tenant = findTenantById(user.tenant_id);
    if (!tenant || tenant.status !== 'active') return null;
    return { user, tenant, token };
  } catch {
    return null;
  }
}

const PUBLIC_API = new Set([
  '/api/health',
  '/api/version',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/config',
  '/api/public/info',
  '/api/public/plans',
  '/api/billing/webhook',
]);

export function authMiddleware(req, res, next) {
  if (!req.path.startsWith('/api')) return next();
  if (PUBLIC_API.has(req.path)) return next();
  // Allow CORS preflight
  if (req.method === 'OPTIONS') return next();

  const session = verifyRequest(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required', code: 'auth_required' });
  }

  req.user = session.user;
  req.tenant = session.tenant;
  runWithContext(
    {
      tenantId: session.tenant.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
        name: session.user.name,
      },
    },
    () => next(),
  );
}

export function registerAuthRoutes(app) {
  app.get('/api/auth/config', (_req, res) => {
    res.json({
      multiTenant: true,
      authRequired: true,
      cookieName: COOKIE_NAME,
    });
  });

  app.get('/api/public/info', (_req, res) => {
    res.json({
      name: 'BilliFi',
      tagline: 'GST-ready invoicing for every business — secure, multi-tenant, and ready for the cloud.',
      features: [
        'Tax Invoice, Credit Note, Bill of Supply',
        'GSTR-1 / GSTR-3B / GSTR-2B helpers',
        'Inventory, purchases, expenses, receipts',
        'Tenant-isolated database storage',
        'Role-ready secure login',
      ],
    });
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const result = await registerTenant(req.body || {});
      setAuthCookie(res, result.token);
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const result = await loginUser(req.body || {});
      setAuthCookie(res, result.token);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || 'Login failed' });
    }
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearAuthCookie(res);
    res.json({ success: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const session = verifyRequest(req);
    if (!session) return res.status(401).json({ error: 'Not authenticated' });
    const entitlement = getEntitlement(session.tenant.id);
    res.json({ user: publicUser(session.user, session.tenant), entitlement });
  });
}

export { COOKIE_NAME, JWT_SECRET };
