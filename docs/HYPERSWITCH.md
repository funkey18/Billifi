# Hyperswitch payment gateway

BilliFi SaaS billing uses [juspay/hyperswitch](https://github.com/juspay/hyperswitch) instead of a direct Razorpay/Stripe SDK.

Hyperswitch is an orchestrator: you still attach a **connector** (Razorpay, Stripe, PayU, etc.) in the Control Center. BilliFi talks only to Hyperswitch.

## Option A — Hosted sandbox (fastest)

1. Sign up at [app.hyperswitch.io](https://app.hyperswitch.io) (or the hosted sandbox linked from the Hyperswitch docs).
2. Create API key + publishable key; configure a connector (e.g. Razorpay test).
3. Set in `.env`:

```env
HYPERSWITCH_BASE_URL=https://sandbox.hyperswitch.io
HYPERSWITCH_API_KEY=your_secret_api_key
HYPERSWITCH_PUBLISHABLE_KEY=your_publishable_key
APP_PUBLIC_URL=http://localhost:5173
```

4. Restart the Node server. `/billing` will open Unified Checkout via HyperLoader.

## Option B — Self-host from the GitHub repo

Requires Docker (or Podman).

A shallow clone lives next to this app at `Marketplace/hyperswitch` (or clone fresh):

```bash
cd Marketplace
git clone --depth 1 --branch latest https://github.com/juspay/hyperswitch.git
cd hyperswitch
# Linux/macOS/WSL (Docker required):
scripts/setup.sh
```

On Windows, run `scripts/setup.sh` from **WSL** or Git Bash with Docker Desktop running. Profiles:

- **Standard** — App server + Control Center  
- **Full** — monitoring + schedulers  
- **Minimal** — app server only  

Default local API is typically `http://localhost:8080`. Point BilliFi at it:

```env
HYPERSWITCH_BASE_URL=http://localhost:8080
HYPERSWITCH_API_KEY=...          # from local Control Center
HYPERSWITCH_PUBLISHABLE_KEY=...
APP_PUBLIC_URL=http://localhost:5173
```

After setup, open the Control Center, configure a connector, then test a payment from `/billing`.

## Webhooks

In Control Center → business profile:

1. Webhook URL: `https://<your-host>/api/billing/webhook`
2. Copy `payment_response_hash_key` → `HYPERSWITCH_WEBHOOK_SECRET`

BilliFi verifies `X-Webhook-Signature-512` (HMAC-SHA512) and activates the plan on `payment_succeeded` / `payment_captured`.

## Checkout flow

1. `POST /api/billing/checkout` → BilliFi creates `POST {HYPERSWITCH_BASE_URL}/payments`
2. Frontend loads HyperLoader and mounts Unified Checkout with `client_secret`
3. Customer pays → `confirmPayment` (or redirect return to `/billing?payment=return&local_payment_id=...`)
4. `POST /api/billing/verify` retrieves the payment from Hyperswitch and activates the subscription

Without keys, `PAYMENT_MODE` stays `mock` and checkout simulates success locally.
