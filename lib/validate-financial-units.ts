/**
 * Validate and normalize financial units
 *
 * Ensures all financial metrics are in millions, regardless of how Claude extracted them.
 * This runs immediately after Claude analysis to catch unit errors.
 */

import { EarningsInsights } from '@/types';

// Reasonable ranges for financial metrics (in millions)
const RANGES = {
  revenue: { min: 0.001, max: 1000000 }, // $1K to $1T
  netIncome: { min: -500000, max: 500000 },
  operatingCashFlow: { min: -100000, max: 500000 },
  freeCashFlow: { min: -100000, max: 500000 },
  capexAmount: { min: 0, max: 500000 },
  deferredRevenue: { min: 0, max: 500000 },
};

/**
 * Normalize a value to millions if it's in thousands or dollars
 * Note: Claude is explicitly instructed to output in millions, so we should trust it.
 * Only convert if values are clearly in the wrong unit (billions of dollars range)
 */
function normalizeToMillions(value: number | null | undefined, fieldName: string): number | null {
  if (value == null) return null;

  const absValue = Math.abs(value);

  // Only convert if in billions of dollars range (extremely large numbers)
  // Example: 123456789000 (hundreds of billions in dollars) → 123456.789 millions
  if (absValue > 10000000) { // > 10 million "millions" = probably in dollars
    console.log(`  ⚠️  ${fieldName}: ${value.toLocaleString()} looks like dollars, converting to millions`);
    return value / 1000000;
  }

  // Trust Claude's output - it's instructed to always output in millions
  // Values between 0.001 and 10M millions are reasonable for companies
  return value;
}

/**
 * Check if a value is in a reasonable range after normalization
 */
function isReasonable(fieldName: string, value: number): boolean {
  const range = RANGES[fieldName as keyof typeof RANGES];
  if (!range) return true;

  const isOk = value >= range.min && value <= range.max;
  if (!isOk) {
    console.log(`  ⚠️  ${fieldName}: ${value.toLocaleString()} is outside reasonable range [${range.min}, ${range.max}]`);
  }
  return isOk;
}

/**
 * Validate and normalize all financial metrics in earnings insights
 * This should be called immediately after Claude extraction
 */
export function validateAndNormalizeFinancialUnits(
  insights: EarningsInsights,
  companyName: string,
  quarter: string
): EarningsInsights {
  console.log(`  🔍 Validating financial units for ${companyName} ${quarter}...`);

  // Normalize all financial fields
  const normalized = { ...insights };

  const normalizedRevenue = normalizeToMillions(insights.revenue, 'revenue');
  const normalizedNetIncome = normalizeToMillions(insights.netIncome, 'netIncome');
  const normalizedOCF = normalizeToMillions(insights.operatingCashFlow, 'operatingCashFlow');
  const normalizedFCF = normalizeToMillions(insights.freeCashFlow, 'freeCashFlow');
  const normalizedCapex = normalizeToMillions(insights.capexAmount, 'capexAmount');
  const normalizedDR = normalizeToMillions(insights.deferredRevenue, 'deferredRevenue');

  if (normalizedRevenue !== null) normalized.revenue = normalizedRevenue;
  if (normalizedNetIncome !== null) normalized.netIncome = normalizedNetIncome;
  if (normalizedOCF !== null) normalized.operatingCashFlow = normalizedOCF;
  if (normalizedFCF !== null) normalized.freeCashFlow = normalizedFCF;
  if (normalizedCapex !== null) normalized.capexAmount = normalizedCapex;
  if (normalizedDR !== null) normalized.deferredRevenue = normalizedDR;

  // Validate normalized values are reasonable
  if (normalized.revenue != null && !isReasonable('revenue', normalized.revenue)) {
    console.log(`  ❌ Revenue ${normalized.revenue} is still unreasonable after normalization`);
  }
  if (normalized.netIncome != null && !isReasonable('netIncome', normalized.netIncome)) {
    console.log(`  ❌ Net income ${normalized.netIncome} is still unreasonable after normalization`);
  }

  return normalized;
}
