# Subscriptions, trial & Razorpay

## Lifecycle

1. **Sign up** → tenant created → status `trialing` for **7 days** (no card).
2. **During trial** → full `/app` access + green countdown banner → Billing to subscribe.
3. **Pay Monthly (₹499), Silver (₹3,799/yr), Gold (₹4,099/yr), or Platinum (₹9,999/yr)** via Razorpay Checkout (or mock mode locally). Prices aligned with desktop GST billing market rates.
4. **Active** → access until `current_period_end`.
5. **Cancel** → access until period end, then `expired`.
6. **Missed renewal** → `past_due` with **3-day grace** (still usable) → then `expired`.
7. **Expired** → API returns **402 Payment Required**; UI shows paywall. Data is kept.

## Env

```
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...   # optional
PAYMENT_MODE=mock             # force simulated checkout
```

Webhook URL: `POST https://your-domain/api/billing/webhook` (event `payment.captured`).

## Routes

| Path | Purpose |
|------|---------|
| `/pricing` | Public plans + how trial/payment works |
| `/billing` | Checkout, status, history (logged in) |
| `/app` | Product — blocked when entitlement.access is false |
