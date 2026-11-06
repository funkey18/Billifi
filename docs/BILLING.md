# Subscriptions, trial & Razorpay

Payments use [Razorpay Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/). Hyperswitch remains available if you set `PAYMENT_MODE=hyperswitch` and Hyperswitch keys.

## Lifecycle

1. **Sign up** → tenant created → status `trialing` for **7 days** (no card).
2. **During trial** → full `/app` access + countdown banner → Billing to subscribe.
3. **Pay Monthly (₹199), Yearly (₹1,999), or 3-Year (₹3,999)** via Razorpay. Every plan includes the full feature set.
4. **Active** → access until `current_period_end`.
5. **Cancel** → access until period end, then `expired`.
6. **Missed renewal** → `past_due` with **3-day grace** (still usable) → then `expired`.
7. **Expired** → API returns **402 Payment Required**; UI shows paywall. Data is kept.

## Env (local + server)

Put these in `.env` (never commit the file):

```
PAYMENT_MODE=razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx
# RAZORPAY_WEBHOOK_SECRET=...   # optional, for webhooks
APP_PUBLIC_URL=https://your-domain.com
```

Priority: `PAYMENT_MODE=mock` → Razorpay keys (default) → Hyperswitch → mock.

Without both `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, checkout falls back to mock mode.

## GitHub Actions secrets (CI/CD)

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret name | Value |
|-------------|--------|
| `RAZORPAY_KEY_ID` | Key Id from Razorpay Dashboard (e.g. `rzp_test_…`) |
| `RAZORPAY_KEY_SECRET` | Key Secret from the same key pair |

The `Deploy to OCI` workflow writes these into the server `.env` on each deploy (without printing them in logs).

Also keep your existing deploy secrets: `OCI_SSH_KEY`, `OCI_HOST`, `OCI_USER`.

## Server `.env` (OCI / production)

On the VM (`/home/ubuntu/Billifi/.env`), ensure:

```
PAYMENT_MODE=razorpay
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
APP_PUBLIC_URL=https://billifi.duckdns.org
ALLOWED_ORIGINS=https://billifi.duckdns.org
```

Then restart:

```bash
cd /home/ubuntu/Billifi
pm2 restart billifi --update-env
```

Deploy preserves `.env` via `git clean -e .env`. Prefer letting GitHub Actions sync Razorpay keys so they stay in sync with repo secrets.

## Routes

| Path | Purpose |
|------|---------|
| `/pricing` | Public plans + feature comparison |
| `/billing` | Checkout, status, subscription tracking & payment history |
| `/app` | Product — blocked when entitlement.access is false |

Webhook URL (optional): `POST https://your-domain/api/billing/webhook`
