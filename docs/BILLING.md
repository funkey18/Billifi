# Subscriptions, trial & Hyperswitch

Payments use [Juspay Hyperswitch](https://github.com/juspay/hyperswitch) — open-source payment orchestration. Self-host setup: [HYPERSWITCH.md](./HYPERSWITCH.md).

## Lifecycle

1. **Sign up** → tenant created → status `trialing` for **7 days** (no card).
2. **During trial** → full `/app` access + green countdown banner → Billing to subscribe.
3. **Pay Monthly (₹499), Silver (₹3,799/yr), Gold (₹4,099/yr), or Platinum (₹9,999/yr)** via Hyperswitch Unified Checkout (or mock mode locally).
4. **Active** → access until `current_period_end`.
5. **Cancel** → access until period end, then `expired`.
6. **Missed renewal** → `past_due` with **3-day grace** (still usable) → then `expired`.
7. **Expired** → API returns **402 Payment Required**; UI shows paywall. Data is kept.

## Env

```
HYPERSWITCH_BASE_URL=https://sandbox.hyperswitch.io
HYPERSWITCH_API_KEY=...
HYPERSWITCH_PUBLISHABLE_KEY=...
HYPERSWITCH_PROFILE_ID=...          # optional
HYPERSWITCH_WEBHOOK_SECRET=...      # business profile payment_response_hash_key
APP_PUBLIC_URL=https://your-domain.com
PAYMENT_MODE=mock                   # force simulated checkout
```

Webhook URL: `POST https://your-domain/api/billing/webhook`  
Events: `payment_succeeded`, `payment_captured` (header `X-Webhook-Signature-512`).

## Routes

| Path | Purpose |
|------|---------|
| `/pricing` | Public plans + how trial/payment works |
| `/billing` | Checkout, status, history (logged in) |
| `/app` | Product — blocked when entitlement.access is false |
