/**
 * Repair Financial Data Script
 *
 * Patches existing data/earnings/*.json files with exact revenue/net income
 * from SEC XBRL company facts — no Claude API calls, zero cost.
 *
 * Fixes two historical data bugs:
 *  1. LLM-extracted values stored in billions instead of millions (rendered as ~$0)
 *  2. Computed Q4 rows (Annual − Q1−Q2−Q3) that went negative from mixed units
 *
 * Q4 rows (stored with filing.form === '10-K') are recomputed from XBRL:
 *  - Use the standalone Q4 fact if the company reports one, else
 *  - Exact annual minus the three exact fiscal quarters
 *
 * Deliberately does NOT touch lastUpdated, so the scheduled refresh workflow
 * still treats these files as stale and regenerates the qualitative analysis.
 *
 * Usage: npx tsx scripts/repair-financials.ts
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fetchCompanyFacts, getXbrlFinancials, CompanyFacts } from '../lib/xbrl';
import { computeMacroAnalysis } from '../lib/macro';

const DATA_DIR = join(process.cwd(), 'data', 'earnings');
const MACRO_DIR = join(process.cwd(), 'data', 'macro');

const REVENUE_TAGS = [
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'Revenues',
  'RevenueFromContractWithCustomerIncludingAssessedTax',
  'SalesRevenueNet',
];
const NET_INCOME_TAGS = ['NetIncomeLoss', 'ProfitLoss'];

interface Fact {
  start?: string;
  end: string;
  val: number;
}

/**
 * Compute Q4 trying each tag until one yields a value. Companies report under
 * different tags over time (e.g. NVDA has stale facts under
 * RevenueFromContractWithCustomer... but current data under Revenues), so
 * committing to the first non-empty tag silently misses.
 */
function computeQ4AcrossTags(
  companyFacts: CompanyFacts,
  tags: string[],
  fyEnd: string
): number | null {
  const gaap = (companyFacts as any)?.facts?.['us-gaap'];
  if (!gaap) return null;
  for (const tag of tags) {
    const usd: Fact[] | undefined = gaap[tag]?.units?.USD;
    if (!usd?.length) continue;
    const val = computeQ4(usd, fyEnd);
    if (val != null) return val;
  }
  return null;
}

function days(f: Fact): number | null {
  if (!f.start) return null;
  return (Date.parse(f.end) - Date.parse(f.start)) / 86_400_000;
}

const isQuarterly = (f: Fact) => {
  const d = days(f);
  return d != null && d > 75 && d < 100;
};
const isAnnual = (f: Fact) => {
  const d = days(f);
  return d != null && d > 330 && d < 400;
};

/**
 * Exact fiscal-Q4 value (millions) for a fiscal year ending on `fyEnd`.
 */
function computeQ4(facts: Fact[], fyEnd: string): number | null {
  // Best case: the company reports Q4 standalone
  const direct = facts.find((f) => f.end === fyEnd && isQuarterly(f));
  if (direct) return direct.val / 1e6;

  const annual = facts.find((f) => f.end === fyEnd && isAnnual(f));
  if (!annual?.start) return null;

  // The three quarters strictly inside the fiscal year, deduped by end date
  const quarterEnds = new Map<string, number>();
  for (const f of facts) {
    if (
      isQuarterly(f) &&
      f.start! >= annual.start &&
      f.end < fyEnd &&
      !quarterEnds.has(f.end)
    ) {
      quarterEnds.set(f.end, f.val);
    }
  }
  if (quarterEnds.size !== 3) return null;

  const quarterSum = Array.from(quarterEnds.values()).reduce((a, b) => a + b, 0);
  return (annual.val - quarterSum) / 1e6;
}

async function repairTicker(file: string): Promise<{ fixed: number; missed: number }> {
  const path = join(DATA_DIR, file);
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  const cik: string | undefined = data.company?.cik;
  const ticker = file.replace('.json', '');

  if (!cik) {
    console.warn(`  ⚠️  ${ticker}: no CIK in file, skipping`);
    return { fixed: 0, missed: 0 };
  }

  const companyFacts = await fetchCompanyFacts(String(cik));
  if (!companyFacts) {
    console.warn(`  ⚠️  ${ticker}: could not fetch XBRL facts, skipping`);
    return { fixed: 0, missed: 0 };
  }

  let fixed = 0;
  let missed = 0;

  for (const report of data.reports ?? []) {
    const { form, accessionNumber, reportDate } = report.filing ?? {};
    const insights = report.insights;
    if (!insights || !reportDate) continue;

    let revenue: number | null = null;
    let netIncome: number | null = null;

    if (form === '10-K') {
      // Stored 10-K rows are computed fiscal-Q4 rows
      revenue = computeQ4AcrossTags(companyFacts, REVENUE_TAGS, reportDate);
      netIncome = computeQ4AcrossTags(companyFacts, NET_INCOME_TAGS, reportDate);
      if (revenue != null && revenue <= 0) {
        // Even exact data can't produce a sensible Q4 (e.g. tag mismatch) — drop it
        revenue = null;
        netIncome = null;
      }
    } else {
      const xbrl = getXbrlFinancials(companyFacts, accessionNumber, reportDate, form);
      revenue = xbrl.revenue;
      netIncome = xbrl.netIncome;
    }

    const logChange = (field: string, oldVal: number | null, newVal: number) => {
      if (oldVal != null && Math.abs(oldVal - newVal) > 1) {
        console.log(
          `  🔧 ${ticker} ${report.quarter} ${field}: ${oldVal} → ${Math.round(newVal).toLocaleString()}`
        );
        fixed++;
      }
    };

    if (revenue != null) {
      logChange('revenue', insights.revenue, revenue);
      insights.revenue = revenue;
    } else if (form === '10-K') {
      if (insights.revenue != null && insights.revenue <= 0) {
        console.log(`  🧹 ${ticker} ${report.quarter}: dropping implausible Q4 financials`);
        insights.revenue = null;
        insights.netIncome = null;
        fixed++;
      } else {
        missed++;
      }
    } else {
      missed++;
    }

    if (netIncome != null) {
      logChange('netIncome', insights.netIncome, netIncome);
      insights.netIncome = netIncome;
    }
  }

  // Note: lastUpdated intentionally left unchanged (see header comment)
  writeFileSync(path, JSON.stringify(data, null, 2));
  return { fixed, missed };
}

async function main() {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  console.log(`Repairing financial data for ${files.length} tickers...\n`);

  let totalFixed = 0;
  let totalMissed = 0;

  for (const file of files) {
    console.log(`${file}:`);
    const { fixed, missed } = await repairTicker(file);
    totalFixed += fixed;
    totalMissed += missed;
    // SEC fair-use: stay well under 10 req/s
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n✅ Done. ${totalFixed} values corrected, ${totalMissed} rows without XBRL match (left as-is).`);

  console.log('\nRegenerating macro analysis from repaired data...');
  const macroAnalysis = computeMacroAnalysis(DATA_DIR);
  writeFileSync(join(MACRO_DIR, 'latest.json'), JSON.stringify(macroAnalysis, null, 2));
  console.log('✅ Macro analysis regenerated.');
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
