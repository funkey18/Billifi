import { getDb } from '../server/db.js';
import { getEntitlement } from '../server/billing.js';

const db = getDb();
const row = db.prepare("SELECT tenant_id FROM subscriptions ORDER BY updated_at DESC LIMIT 1").get();
if (!row) {
  console.log('no subscription');
  process.exit(0);
}
const past = new Date(Date.now() - 86400000).toISOString();
db.prepare(`
  UPDATE subscriptions
  SET status = 'expired', current_period_end = ?, trial_ends_at = ?, grace_ends_at = NULL, updated_at = ?
  WHERE tenant_id = ?
`).run(past, past, new Date().toISOString(), row.tenant_id);
console.log(JSON.stringify(getEntitlement(row.tenant_id), null, 2));
console.log('TENANT', row.tenant_id);
