/**
 * Fix Financial Data Units (V2 - Conservative)
 *
 * Smarter unit fixing that validates against reasonable company size ranges.
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data', 'earnings');

interface Fix {
  ticker: string;
  quarter: string;
  field: string;
  oldValue: number;
  newValue: number;
  reason: string;
}

const fixes: Fix[] = [];

// Reasonable ranges for validation (in millions)
const RANGES = {
  revenue: { min: 0.001, max: 1000000 }, // $1K to $1T
  netIncome: { min: -500000, max: 500000 }, // -$500B to +$500B
  operatingCashFlow: { min: -100000, max: 500000 }, // -$100B to +$500B
  capexAmount: { min: 0, max: 500000 }, // $0 to $500B
  deferredRevenue: { min: 0, max: 500000 }, // $0 to $500B
};

function isReasonable(field: string, value: number): boolean {
  const range = RANGES[field as keyof typeof RANGES];
  if (!range) return true;
  return value >= range.min && value <= range.max;
}

function applyFixes(ticker: string, data: any): boolean {
  let modified = false;

  for (let i = 0; i < data.reports.length; i++) {
    const report = data.reports[i];
    const insights = report.insights;

    if (!insights) continue;

    const quarter = report.quarter;

    // Fix revenue
    if (insights.revenue != null && !isReasonable('revenue', insights.revenue)) {
      let fixedRevenue = insights.revenue;
      let reason = '';

      // If > 1B (unlikely for most companies), probably in dollars
      if (insights.revenue > 1000000) {
        fixedRevenue = insights.revenue / 1000000;
        reason = 'converted from dollars to millions';
      }
      // If > 100K but < 1M, probably in thousands
      else if (insights.revenue > 100000 && insights.revenue < 1000000) {
        fixedRevenue = insights.revenue / 1000;
        reason = 'converted from thousands to millions';
      }

      // Validate the fix makes sense
      if (isReasonable('revenue', fixedRevenue)) {
        fixes.push({ ticker, quarter, field: 'revenue', oldValue: insights.revenue, newValue: fixedRevenue, reason });
        insights.revenue = fixedRevenue;
        modified = true;
      }
    }

    // Fix net income
    if (insights.netIncome != null && !isReasonable('netIncome', insights.netIncome)) {
      let fixedNetIncome = insights.netIncome;
      let reason = '';
      const absValue = Math.abs(insights.netIncome);

      if (absValue > 1000000) {
        fixedNetIncome = insights.netIncome / 1000000;
        reason = 'converted from dollars to millions';
      } else if (absValue > 100000 && absValue < 1000000) {
        fixedNetIncome = insights.netIncome / 1000;
        reason = 'converted from thousands to millions';
      }

      if (isReasonable('netIncome', fixedNetIncome)) {
        fixes.push({ ticker, quarter, field: 'netIncome', oldValue: insights.netIncome, newValue: fixedNetIncome, reason });
        insights.netIncome = fixedNetIncome;
        modified = true;
      }
    }

    // Fix operating cash flow
    if (insights.operatingCashFlow != null && !isReasonable('operatingCashFlow', insights.operatingCashFlow)) {
      let fixedOCF = insights.operatingCashFlow;
      let reason = '';
      const absValue = Math.abs(insights.operatingCashFlow);

      if (absValue > 1000000) {
        fixedOCF = insights.operatingCashFlow / 1000000;
        reason = 'converted from dollars to millions';
      } else if (absValue > 100000 && absValue < 1000000) {
        fixedOCF = insights.operatingCashFlow / 1000;
        reason = 'converted from thousands to millions';
      }

      if (isReasonable('operatingCashFlow', fixedOCF)) {
        fixes.push({ ticker, quarter, field: 'operatingCashFlow', oldValue: insights.operatingCashFlow, newValue: fixedOCF, reason });
        insights.operatingCashFlow = fixedOCF;
        modified = true;
      }
    }

    // Fix capex
    if (insights.capexAmount != null && !isReasonable('capexAmount', insights.capexAmount)) {
      let fixedCapex = insights.capexAmount;
      let reason = '';

      if (insights.capexAmount > 1000000) {
        fixedCapex = insights.capexAmount / 1000000;
        reason = 'converted from dollars to millions';
      } else if (insights.capexAmount > 100000 && insights.capexAmount < 1000000) {
        fixedCapex = insights.capexAmount / 1000;
        reason = 'converted from thousands to millions';
      }

      if (isReasonable('capexAmount', fixedCapex)) {
        fixes.push({ ticker, quarter, field: 'capexAmount', oldValue: insights.capexAmount, newValue: fixedCapex, reason });
        insights.capexAmount = fixedCapex;
        modified = true;
      }
    }

    // Fix deferred revenue
    if (insights.deferredRevenue != null && !isReasonable('deferredRevenue', insights.deferredRevenue)) {
      let fixedDR = insights.deferredRevenue;
      let reason = '';

      if (insights.deferredRevenue > 1000000) {
        fixedDR = insights.deferredRevenue / 1000000;
        reason = 'converted from dollars to millions';
      } else if (insights.deferredRevenue > 100000 && insights.deferredRevenue < 1000000) {
        fixedDR = insights.deferredRevenue / 1000;
        reason = 'converted from thousands to millions';
      }

      if (isReasonable('deferredRevenue', fixedDR)) {
        fixes.push({ ticker, quarter, field: 'deferredRevenue', oldValue: insights.deferredRevenue, newValue: fixedDR, reason });
        insights.deferredRevenue = fixedDR;
        modified = true;
      }
    }
  }

  return modified;
}

function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                   FIXING FINANCIAL DATA UNITS (V2)                         ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));

  console.log(`Processing ${files.length} company files...\n`);

  let filesModified = 0;

  for (const file of files) {
    const ticker = file.replace('.json', '');
    const filePath = join(DATA_DIR, file);
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));

    const modified = applyFixes(ticker, data);

    if (modified) {
      writeFileSync(filePath, JSON.stringify(data, null, 2));
      filesModified++;
      console.log(`✓ Fixed ${ticker}`);
    }
  }

  if (fixes.length === 0) {
    console.log('\n✅ No fixes needed! All data is already in correct units.\n');
    return;
  }

  console.log('\n\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                              FIXES APPLIED                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  const byTicker = new Map<string, Fix[]>();
  for (const fix of fixes) {
    if (!byTicker.has(fix.ticker)) {
      byTicker.set(fix.ticker, []);
    }
    byTicker.get(fix.ticker)!.push(fix);
  }

  for (const [ticker, tickerFixes] of byTicker) {
    console.log(`\n${ticker}:`);
    for (const fix of tickerFixes) {
      console.log(`  ${fix.quarter} - ${fix.field}`);
      console.log(`    ${fix.oldValue.toLocaleString()} → ${fix.newValue.toFixed(3)} million`);
      console.log(`    ${fix.reason}`);
    }
  }

  console.log('\n\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                              SUMMARY                                       ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  console.log(`Files modified: ${filesModified}`);
  console.log(`Total fixes applied: ${fixes.length}`);
}

main();
