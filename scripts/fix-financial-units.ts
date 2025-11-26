/**
 * Fix Financial Data Units
 *
 * Automatically fixes unit inconsistencies in earnings data.
 * Converts values from thousands/dollars to millions where needed.
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
}

const fixes: Fix[] = [];

function applyFixes(ticker: string, data: any): boolean {
  let modified = false;

  for (let i = 0; i < data.reports.length; i++) {
    const report = data.reports[i];
    const insights = report.insights;

    if (!insights) continue;

    const quarter = report.quarter;

    // Fix revenue
    if (insights.revenue != null) {
      let fixedRevenue = insights.revenue;
      let fixed = false;

      if (insights.revenue > 100000000) {
        fixedRevenue = insights.revenue / 1000000;
        fixed = true;
      } else if (insights.revenue > 100000) {
        // Check if it's a sudden 100x jump
        if (i > 0 && data.reports[i - 1]?.insights?.revenue) {
          const prevRevenue = data.reports[i - 1].insights.revenue;
          const ratio = insights.revenue / prevRevenue;
          if (ratio > 100) {
            fixedRevenue = insights.revenue / 1000;
            fixed = true;
          }
        } else {
          fixedRevenue = insights.revenue / 1000;
          fixed = true;
        }
      }

      if (fixed) {
        fixes.push({
          ticker,
          quarter,
          field: 'revenue',
          oldValue: insights.revenue,
          newValue: fixedRevenue
        });
        insights.revenue = fixedRevenue;
        modified = true;
      }
    }

    // Fix net income
    if (insights.netIncome != null) {
      let fixedNetIncome = insights.netIncome;
      let fixed = false;
      const absValue = Math.abs(insights.netIncome);

      if (absValue > 100000000) {
        fixedNetIncome = insights.netIncome / 1000000;
        fixed = true;
      } else if (absValue > 100000) {
        fixedNetIncome = insights.netIncome / 1000;
        fixed = true;
      }

      if (fixed) {
        fixes.push({
          ticker,
          quarter,
          field: 'netIncome',
          oldValue: insights.netIncome,
          newValue: fixedNetIncome
        });
        insights.netIncome = fixedNetIncome;
        modified = true;
      }
    }

    // Fix operating cash flow
    if (insights.operatingCashFlow != null && Math.abs(insights.operatingCashFlow) > 100000) {
      const oldValue = insights.operatingCashFlow;
      insights.operatingCashFlow = insights.operatingCashFlow / 1000;
      fixes.push({
        ticker,
        quarter,
        field: 'operatingCashFlow',
        oldValue,
        newValue: insights.operatingCashFlow
      });
      modified = true;
    }

    // Fix capex
    if (insights.capexAmount != null && insights.capexAmount > 100000) {
      const oldValue = insights.capexAmount;
      insights.capexAmount = insights.capexAmount / 1000;
      fixes.push({
        ticker,
        quarter,
        field: 'capexAmount',
        oldValue,
        newValue: insights.capexAmount
      });
      modified = true;
    }

    // Fix deferred revenue
    if (insights.deferredRevenue != null && insights.deferredRevenue > 100000) {
      const oldValue = insights.deferredRevenue;
      insights.deferredRevenue = insights.deferredRevenue / 1000;
      fixes.push({
        ticker,
        quarter,
        field: 'deferredRevenue',
        oldValue,
        newValue: insights.deferredRevenue
      });
      modified = true;
    }
  }

  return modified;
}

function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                       FIXING FINANCIAL DATA UNITS                          ║');
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

  // Group by ticker
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
    }
  }

  console.log('\n\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                              SUMMARY                                       ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  console.log(`Files modified: ${filesModified}`);
  console.log(`Total fixes applied: ${fixes.length}`);

  console.log('\n\nNext steps:');
  console.log('1. Run: npm run macro');
  console.log('2. Restart your dev server to see the corrected data');
}

main();
