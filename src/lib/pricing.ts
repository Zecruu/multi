// Puerto Rico sales tax rate (11.5% - combined state + municipal)
export const PR_TAX_RATE = 0.115;

// Stripe fee calculation (2.9% + $0.30 per transaction)
export const STRIPE_PERCENTAGE_FEE = 0.029;
export const STRIPE_FIXED_FEE = 0.30;

export interface PriceBreakdown {
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  stripeFee: number;
  netRevenue: number;
}

export interface ProfitAnalysis {
  grossRevenue: number;
  stripeFee: number;
  netRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
}

/**
 * Calculate the Stripe processing fee for a given amount
 */
export function calculateStripeFee(amount: number): number {
  return amount * STRIPE_PERCENTAGE_FEE + STRIPE_FIXED_FEE;
}

/**
 * Calculate tax amount based on subtotal
 */
export function calculateTax(subtotal: number, taxRate: number = PR_TAX_RATE): number {
  return subtotal * taxRate;
}

/**
 * Calculate complete price breakdown for checkout
 */
export function calculatePriceBreakdown(subtotal: number, taxRate: number = PR_TAX_RATE): PriceBreakdown {
  const tax = calculateTax(subtotal, taxRate);
  const total = subtotal + tax;
  const stripeFee = calculateStripeFee(total);
  const netRevenue = total - stripeFee;

  return {
    subtotal,
    tax,
    taxRate,
    total,
    stripeFee,
    netRevenue,
  };
}

/**
 * Calculate profit analysis for admin dashboard
 */
export function calculateProfitAnalysis(
  grossRevenue: number,
  totalCost: number
): ProfitAnalysis {
  const stripeFee = calculateStripeFee(grossRevenue);
  const netRevenue = grossRevenue - stripeFee;
  const grossProfit = netRevenue - totalCost;
  const profitMargin = netRevenue > 0 ? ((netRevenue - totalCost) / netRevenue) * 100 : 0;

  return {
    grossRevenue,
    stripeFee,
    netRevenue,
    totalCost,
    grossProfit,
    profitMargin,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}
