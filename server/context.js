import { AsyncLocalStorage } from 'async_hooks';

/** Per-request tenant/user context for storage helpers. */
export const requestContext = new AsyncLocalStorage();

export function getTenantId() {
  const store = requestContext.getStore();
  if (!store?.tenantId) {
    const err = new Error('Tenant context missing — authentication required');
    err.status = 401;
    throw err;
  }
  return store.tenantId;
}

export function getUser() {
  return requestContext.getStore()?.user || null;
}

export function runWithContext(ctx, fn) {
  return requestContext.run(ctx, fn);
}
