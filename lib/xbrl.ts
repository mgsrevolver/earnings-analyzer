/**
 * Exact financial figures from SEC XBRL company facts.
 *
 * LLM extraction of revenue/net income is unreliable about units (sometimes
 * returns billions instead of millions). XBRL facts are the structured values
 * companies file with the SEC, reported in USD — so we use them as the source
 * of truth for revenue and net income, and keep Claude for qualitative fields.
 */

const USER_AGENT = "EarningsAnalyzer/1.0 (clayreimus@gmail.com)"; // SEC requires a real contact

const REVENUE_TAGS = [
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "Revenues",
  "RevenueFromContractWithCustomerIncludingAssessedTax",
  "SalesRevenueNet",
];

const NET_INCOME_TAGS = ["NetIncomeLoss", "ProfitLoss"];

interface XbrlFact {
  start?: string;
  end: string;
  val: number;
  accn: string;
  form: string;
  fp?: string;
}

export interface XbrlFinancials {
  revenue: number | null; // millions
  netIncome: number | null; // millions
}

export type CompanyFacts = {
  facts?: {
    "us-gaap"?: Record<string, { units?: { USD?: XbrlFact[] } }>;
  };
} | null;

/**
 * Fetch all XBRL facts for a company (one call covers every concept/filing).
 * Returns null on any failure — callers fall back to LLM-extracted values.
 */
export async function fetchCompanyFacts(cik: string): Promise<CompanyFacts> {
  const paddedCIK = cik.padStart(10, "0");
  try {
    const response = await fetch(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCIK}.json`,
      { headers: { "User-Agent": USER_AGENT } }
    );
    if (!response.ok) {
      console.warn(`  ⚠️  XBRL companyfacts fetch failed for CIK ${cik}: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(`  ⚠️  XBRL companyfacts fetch error for CIK ${cik}:`, error);
    return null;
  }
}

function durationDays(fact: XbrlFact): number | null {
  if (!fact.start) return null;
  return (Date.parse(fact.end) - Date.parse(fact.start)) / 86_400_000;
}

/**
 * A 10-Q value must cover a single quarter (~3 months, not year-to-date);
 * a 10-K value must cover the full fiscal year.
 */
function hasExpectedDuration(fact: XbrlFact, isAnnual: boolean): boolean {
  const days = durationDays(fact);
  if (days == null) return false;
  return isAnnual ? days > 330 && days < 400 : days > 75 && days < 100;
}

function pickFact(
  facts: XbrlFact[],
  accessionNumber: string,
  reportDate: string,
  form: string
): number | null {
  const isAnnual = form === "10-K";

  // Prefer the fact reported in the filing itself
  for (const fact of facts) {
    if (
      fact.accn === accessionNumber &&
      fact.end === reportDate &&
      hasExpectedDuration(fact, isAnnual)
    ) {
      return fact.val;
    }
  }

  // Fall back to the same period reported as a comparative in a later filing
  // (equivalent value, possibly restated — which is fine)
  for (const fact of facts) {
    if (fact.end === reportDate && hasExpectedDuration(fact, isAnnual)) {
      return fact.val;
    }
  }

  return null;
}

/**
 * Look up exact revenue and net income (in millions) for a specific filing.
 * For 10-Qs this returns the quarter's figures; for 10-Ks the full-year totals.
 */
export function getXbrlFinancials(
  companyFacts: CompanyFacts,
  accessionNumber: string,
  reportDate: string,
  form: string
): XbrlFinancials {
  const gaap = companyFacts?.facts?.["us-gaap"];
  if (!gaap) return { revenue: null, netIncome: null };

  const lookup = (tags: string[]): number | null => {
    for (const tag of tags) {
      const usd = gaap[tag]?.units?.USD;
      if (!usd?.length) continue;
      const val = pickFact(usd, accessionNumber, reportDate, form);
      if (val != null) return val / 1_000_000;
    }
    return null;
  };

  return {
    revenue: lookup(REVENUE_TAGS),
    netIncome: lookup(NET_INCOME_TAGS),
  };
}

/**
 * Overwrite LLM-extracted revenue/netIncome with exact XBRL values when available.
 * Mutates and returns `insights`.
 */
export function applyXbrlFinancials<
  T extends { revenue?: number | null; netIncome?: number | null }
>(
  insights: T,
  companyFacts: CompanyFacts,
  accessionNumber: string,
  reportDate: string,
  form: string,
  label: string
): T {
  const xbrl = getXbrlFinancials(companyFacts, accessionNumber, reportDate, form);

  if (xbrl.revenue != null) {
    if (insights.revenue != null && Math.abs(insights.revenue - xbrl.revenue) > 1) {
      console.log(
        `  🔧 ${label}: revenue ${insights.revenue} → ${xbrl.revenue} (XBRL exact)`
      );
    }
    insights.revenue = xbrl.revenue;
  }
  if (xbrl.netIncome != null) {
    if (insights.netIncome != null && Math.abs(insights.netIncome - xbrl.netIncome) > 1) {
      console.log(
        `  🔧 ${label}: netIncome ${insights.netIncome} → ${xbrl.netIncome} (XBRL exact)`
      );
    }
    insights.netIncome = xbrl.netIncome;
  }

  return insights;
}

export interface YoYComparison {
  revenue: { current: number; prior: number } | null; // millions
  netIncome: { current: number; prior: number } | null; // millions
}

/**
 * Year-over-year comparison for a filing period, from exact XBRL facts.
 * For 10-Qs compares the quarter to the same quarter a year earlier;
 * for 10-Ks compares fiscal year to prior fiscal year.
 * Used to ground sentiment in actual fundamentals.
 */
export function getYoYComparison(
  companyFacts: CompanyFacts,
  reportDate: string,
  form: string
): YoYComparison {
  const gaap = companyFacts?.facts?.["us-gaap"];
  if (!gaap) return { revenue: null, netIncome: null };

  const isAnnual = form === "10-K";
  const currentEnd = Date.parse(reportDate);
  const YEAR_MS = 365.25 * 86_400_000;
  const TOLERANCE_MS = 21 * 86_400_000; // fiscal calendars drift by up to ~2 weeks

  const lookup = (tags: string[]): { current: number; prior: number } | null => {
    for (const tag of tags) {
      const usd = gaap[tag]?.units?.USD;
      if (!usd?.length) continue;

      let current: number | null = null;
      let prior: number | null = null;
      for (const fact of usd) {
        if (!hasExpectedDuration(fact, isAnnual)) continue;
        const end = Date.parse(fact.end);
        if (fact.end === reportDate) current = fact.val;
        else if (Math.abs(currentEnd - YEAR_MS - end) < TOLERANCE_MS) prior = fact.val;
      }
      if (current != null && prior != null) {
        return { current: current / 1_000_000, prior: prior / 1_000_000 };
      }
    }
    return null;
  };

  return {
    revenue: lookup(REVENUE_TAGS),
    netIncome: lookup(NET_INCOME_TAGS),
  };
}

/**
 * Sanity-guard for the derived Q4 = Annual − (Q1+Q2+Q3) calculation.
 * When units were mixed upstream, the subtraction produces negative or absurd
 * values — better to show no data than garbage.
 */
export function sanitizeQ4(
  q4Revenue: number | null,
  q4NetIncome: number | null,
  quarterRevenues: Array<number | null | undefined>,
  label: string
): { q4Revenue: number | null; q4NetIncome: number | null } {
  const knownRevenues = quarterRevenues.filter(
    (v): v is number => typeof v === "number" && v > 0
  );
  const maxQuarter = knownRevenues.length ? Math.max(...knownRevenues) : null;

  const revenueIsPlausible =
    q4Revenue != null &&
    Number.isFinite(q4Revenue) &&
    q4Revenue > 0 &&
    (maxQuarter == null || q4Revenue < maxQuarter * 3);

  if (!revenueIsPlausible) {
    if (q4Revenue != null) {
      console.warn(
        `  ⚠️  ${label}: computed Q4 revenue ${q4Revenue}M is implausible (unit mismatch?) — dropping Q4 financials`
      );
    }
    // Net income came from the same inputs, so it can't be trusted either
    return { q4Revenue: null, q4NetIncome: null };
  }

  return {
    q4Revenue,
    q4NetIncome: Number.isFinite(q4NetIncome as number) ? q4NetIncome : null,
  };
}
