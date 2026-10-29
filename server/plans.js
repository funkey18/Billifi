/** Public plan catalogue — amounts in paise (Razorpay) and display INR.
 *  Aligned with market GST-billing pricing (Vyapar Desktop-class tiers).
 *  Ref: https://vyaparapp.in/pricing
 */

export const TRIAL_DAYS = 7;
export const GRACE_DAYS = 3;

export const PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    interval: 'month',
    intervalCount: 1,
    priceInr: 499,
    amountPaise: 49900,
    label: '₹499',
    periodLabel: '/ month',
    badge: null,
    description: 'Full workspace, billed every month. Cancel anytime.',
    features: [
      'Unlimited invoices & GST documents',
      'Clients, products, inventory & purchases',
      'GSTR-1 / GSTR-3B / GSTR-2B helpers',
      'Expenses, receipts & recurring billing',
      'Reports, PDF export & multi-business profiles',
      'Secure multi-tenant cloud database',
      'Email support (business hours)',
    ],
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    interval: 'year',
    intervalCount: 1,
    priceInr: 3799,
    amountPaise: 379900,
    label: '₹3,799',
    periodLabel: '/ year',
    perMonthInr: 317,
    badge: null,
    description: 'Perfect for getting started — billed yearly.',
    features: [
      'Everything in Monthly',
      'Up to 3 business profiles',
      'WhatsApp share for invoices',
      'Import parties & products',
      'Share with your CA',
      'Annual invoice for accounts',
      'Price locked for 12 months',
    ],
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    interval: 'year',
    intervalCount: 1,
    priceInr: 4099,
    amountPaise: 409900,
    label: '₹4,099',
    periodLabel: '/ year',
    perMonthInr: 342,
    badge: 'Most popular',
    description: 'Best for small stores & growing MSMEs.',
    features: [
      'Everything in Silver',
      'Up to 5 business profiles',
      'Journal entries & account statements',
      'Bill-wise profit / loss reports',
      'TCS / TDS on invoices',
      'Accountant access',
      'Priority support queue',
    ],
  },
  platinum: {
    id: 'platinum',
    name: 'Platinum',
    interval: 'year',
    intervalCount: 1,
    priceInr: 9999,
    amountPaise: 999900,
    label: '₹9,999',
    periodLabel: '/ year',
    perMonthInr: 833,
    badge: 'For larger teams',
    description: 'Unlimited scale with advanced tools & priority support.',
    features: [
      'Everything in Gold',
      'Unlimited business profiles',
      'Advanced party & stock reports',
      'Marketing / growth tools access',
      'Import / export (Tally-friendly)',
      'Priority customer support',
      'Best annual value for multi-outlet shops',
    ],
  },
};

/** @deprecated kept so older checkout links / DB rows still resolve */
PLANS.yearly = {
  ...PLANS.gold,
  id: 'yearly',
  name: 'Yearly (Gold)',
  badge: null,
  description: 'Legacy alias for Gold yearly — same price & features.',
};

export function getPlan(planId) {
  return PLANS[planId] || null;
}

export function listPlans() {
  // Public catalogue order (exclude legacy yearly alias)
  return [PLANS.monthly, PLANS.silver, PLANS.gold, PLANS.platinum];
}
