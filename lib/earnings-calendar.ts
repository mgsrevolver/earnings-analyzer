import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { Company, CompanyCategory } from '@/types';
import { COMPANIES, getCompanyByTicker } from './companies';
import { AnalysisResponse } from '@/types';

const DATA_DIR = join(process.cwd(), 'data', 'earnings');

export interface EarningsDate {
  ticker: string;
  companyName: string;
  category: CompanyCategory[];
  sector: string;
  subCategory: string;
  date: string; // YYYY-MM-DD format
  estimatedDate?: string; // For upcoming earnings (YYYY-MM-DD)
  isEstimated: boolean;
  fiscalQuarter?: number;
  fiscalYear?: number;
  reportType?: '10-Q' | '10-K';
}

export interface CalendarMonth {
  month: string; // YYYY-MM format
  earnings: EarningsDate[];
}

/**
 * Parse fiscal year end string (MM-DD) to month number
 */
function parseFiscalYearEnd(fiscalYearEnd?: string): number {
  if (!fiscalYearEnd) return 12; // Default to December
  const [month] = fiscalYearEnd.split('-').map(Number);
  return month;
}

/**
 * Calculate quarter end months based on fiscal year end
 */
function getQuarterEndMonths(fiscalYearEnd?: string): number[] {
  const fyeMonth = parseFiscalYearEnd(fiscalYearEnd);
  const months = [];
  for (let i = 0; i < 4; i++) {
    const month = ((fyeMonth - (3 * i) - 1 + 12) % 12) + 1;
    months.unshift(month);
  }
  return months;
}

/**
 * Get historical earnings dates from cached data
 */
export function getHistoricalEarningsDates(ticker: string): EarningsDate[] {
  const filePath = join(DATA_DIR, `${ticker.toUpperCase()}.json`);

  if (!existsSync(filePath)) {
    return [];
  }

  try {
    const data: AnalysisResponse = JSON.parse(readFileSync(filePath, 'utf-8'));
    const company = data.company;

    return data.reports.map(report => ({
      ticker: company.ticker,
      companyName: company.name,
      category: company.category,
      sector: company.sector || 'Technology',
      subCategory: company.subCategory || 'Other',
      date: report.filing.filingDate,
      isEstimated: false,
      fiscalQuarter: report.quarterInfo?.fiscalQuarter,
      fiscalYear: report.quarterInfo?.fiscalYear,
      reportType: report.filing.form as '10-Q' | '10-K',
    }));
  } catch (error) {
    console.error(`Error reading earnings data for ${ticker}:`, error);
    return [];
  }
}

/**
 * Estimate next earnings date based on historical pattern
 * Companies typically report quarterly (every ~90 days)
 */
export function estimateNextEarningsDate(ticker: string): EarningsDate | null {
  const historical = getHistoricalEarningsDates(ticker);
  const company = getCompanyByTicker(ticker);

  if (!company || historical.length === 0) {
    return null;
  }

  // Sort by date descending
  const sorted = historical.sort((a, b) => b.date.localeCompare(a.date));
  const mostRecent = sorted[0];

  // Calculate average days between filings
  let totalDays = 0;
  let count = 0;
  for (let i = 0; i < Math.min(4, sorted.length - 1); i++) {
    const date1 = new Date(sorted[i].date);
    const date2 = new Date(sorted[i + 1].date);
    const days = Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
    totalDays += days;
    count++;
  }

  const avgDays = count > 0 ? Math.round(totalDays / count) : 90;

  // Estimate next date
  const lastDate = new Date(mostRecent.date);
  const nextDate = new Date(lastDate.getTime() + avgDays * 24 * 60 * 60 * 1000);

  // Determine if it should be 10-Q or 10-K based on fiscal quarter
  const nextFiscalQuarter = mostRecent.fiscalQuarter
    ? (mostRecent.fiscalQuarter % 4) + 1
    : 1;
  const reportType = nextFiscalQuarter === 4 ? '10-K' : '10-Q';

  return {
    ticker: company.ticker,
    companyName: company.name,
    category: company.category,
    sector: company.sector,
    subCategory: company.subCategory,
    date: nextDate.toISOString().split('T')[0],
    estimatedDate: nextDate.toISOString().split('T')[0],
    isEstimated: true,
    fiscalQuarter: nextFiscalQuarter,
    fiscalYear: mostRecent.fiscalYear ? mostRecent.fiscalYear + (nextFiscalQuarter === 1 ? 1 : 0) : undefined,
    reportType,
  };
}

/**
 * Get all upcoming earnings for the next N months
 */
export function getUpcomingEarnings(monthsAhead: number = 3): EarningsDate[] {
  const upcoming: EarningsDate[] = [];
  const today = new Date();
  const cutoffDate = new Date(today.getTime() + monthsAhead * 30 * 24 * 60 * 60 * 1000);

  // Get all companies with cached data
  const cachedFiles = existsSync(DATA_DIR) ? readdirSync(DATA_DIR) : [];
  const cachedTickers = cachedFiles
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));

  for (const ticker of cachedTickers) {
    const estimated = estimateNextEarningsDate(ticker);
    if (estimated) {
      const estimatedDate = new Date(estimated.date);
      if (estimatedDate >= today && estimatedDate <= cutoffDate) {
        upcoming.push(estimated);
      }
    }
  }

  // Sort by date ascending
  return upcoming.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get earnings grouped by month for calendar view
 */
export function getEarningsCalendar(monthsAhead: number = 3): CalendarMonth[] {
  const upcoming = getUpcomingEarnings(monthsAhead);
  const monthMap = new Map<string, EarningsDate[]>();

  for (const earning of upcoming) {
    const month = earning.date.substring(0, 7); // YYYY-MM
    if (!monthMap.has(month)) {
      monthMap.set(month, []);
    }
    monthMap.get(month)!.push(earning);
  }

  // Convert to array and sort by month
  const months = Array.from(monthMap.entries())
    .map(([month, earnings]) => ({
      month,
      earnings: earnings.sort((a, b) => a.date.localeCompare(b.date)),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return months;
}

/**
 * Get upcoming earnings for a specific company
 */
export function getCompanyNextEarnings(ticker: string): EarningsDate | null {
  return estimateNextEarningsDate(ticker);
}

/**
 * Filter earnings by category
 */
export function filterEarningsByCategory(
  earnings: EarningsDate[],
  category: CompanyCategory
): EarningsDate[] {
  return earnings.filter(e => e.category.includes(category));
}

/**
 * Get all earnings for a specific date
 */
export function getEarningsByDate(date: string): EarningsDate[] {
  const upcoming = getUpcomingEarnings(12); // Look ahead 12 months
  return upcoming.filter(e => e.date === date);
}

/**
 * Format date for display
 */
export function formatEarningsDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Get month name from YYYY-MM format
 */
export function getMonthName(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
