/** Public plan catalogue — amounts in paise (INR minor units).
 *  Three duration tiers; every plan includes the full feature set.
 */

export const TRIAL_DAYS = 7;
export const GRACE_DAYS = 3;

/** Shared feature set for every paid plan */
export const ALL_FEATURES = [
  'Unlimited invoices & GST documents',
  'Clients, products, inventory & purchases',
  'GSTR-1 / GSTR-3B / GSTR-2B helpers',
  'Expenses, receipts & recurring billing',
  'Reports, PDF export & multi-business profiles',
  'WhatsApp share for invoices',
  'Import parties & products',
  'Journal entries & account statements',
  'Bill-wise profit / loss reports',
  'TCS / TDS on invoices',
  'Accountant access & CA sharing',
  'Advanced party & stock reports',
  'Import / export (Tally-friendly)',
  'Secure multi-tenant cloud database',
  'Priority email support',
];

export const PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    interval: 'month',
    intervalCount: 1,
    priceInr: 199,
    amountPaise: 19900,
    label: '₹199',
    periodLabel: '/ month',
    perMonthInr: 199,
    badge: null,
    savingsInr: null,
    description: 'Full BilliFi access, billed every month. Cancel anytime.',
    features: ALL_FEATURES,
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly',
    interval: 'year',
    intervalCount: 1,
    priceInr: 1999,
    amountPaise: 199900,
    label: '₹1,999',
    periodLabel: '/ year',
    perMonthInr: 167,
    badge: 'Most popular',
    savingsInr: 389,
    description: 'Same full features — pay once a year and save vs monthly.',
    features: ALL_FEATURES,
  },
  three_year: {
    id: 'three_year',
    name: '3-Year',
    interval: 'year',
    intervalCount: 3,
    priceInr: 3999,
    amountPaise: 399900,
    label: '₹3,999',
    periodLabel: '/ 3 years',
    perMonthInr: 111,
    badge: 'Best value',
    savingsInr: 3165,
    description: 'Lock the lowest rate for three years with every feature included.',
    features: ALL_FEATURES,
  },
};

/** Legacy IDs from older checkouts / DB rows still resolve via getPlan */
PLANS.silver = { ...PLANS.yearly, id: 'silver', name: 'Silver (legacy)', badge: null };
PLANS.gold = { ...PLANS.yearly, id: 'gold', name: 'Gold (legacy)', badge: null };
PLANS.platinum = { ...PLANS.three_year, id: 'platinum', name: 'Platinum (legacy)', badge: null };

export function getPlan(planId) {
  return PLANS[planId] || null;
}

export function listPlans() {
  return [PLANS.monthly, PLANS.yearly, PLANS.three_year];
}
