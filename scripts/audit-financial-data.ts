/**
 * Audit Financial Data Quality
 *
 * Scans all earnings data for unit inconsistencies and anomalies.
 * Detects values that are likely in wrong units (dollars/thousands instead of millions).
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data', 'earnings');

interface Issue {
  ticker: string;
  quarter: string;
  field: string;
  value: number;
  expectedRange: string;
  severity: 'critical' | 'warning';
  suggestedFix?: number;
}

const issues: Issue[] = [];

function detectUnitIssues(ticker: string, reports: any[]) {
  for (let i = 0; i < reports.length; i++) {
    const report = reports[i];
    const insights = report.insights;

    if (!insights) continue;

    const { revenue, netIncome, operatingCashFlow, capexAmount, deferredRevenue } = insights;
    const quarter = report.quarter;

    // Check revenue - should typically be 10-100,000 million for most companies
    // Values > 100,000 are likely in thousands (need to divide by 1000)
    // Values > 100,000,000 are likely in dollars (need to divide by 1,000,000)
    if (revenue != null) {
      if (revenue > 100000000) {
        issues.push({
          ticker,
          quarter,
          field: 'revenue',
          value: revenue,
          expectedRange: '10-100,000 million',
          severity: 'critical',
          suggestedFix: revenue / 1000000
        });
      } else if (revenue > 100000) {
        issues.push({
          ticker,
          quarter,
          field: 'revenue',
          value: revenue,
          expectedRange: '10-100,000 million',
          severity: 'critical',
          suggestedFix: revenue / 1000
        });
      }

      // Also check for sudden 100x+ jumps compared to adjacent quarters
      if (i > 0 && reports[i - 1]?.insights?.revenue) {
        const prevRevenue = reports[i - 1].insights.revenue;
        const ratio = revenue / prevRevenue;
        if (ratio > 100 && revenue > 100000) {
          issues.push({
            ticker,
            quarter,
            field: 'revenue',
            value: revenue,
            expectedRange: `close to previous quarter (${prevRevenue})`,
            severity: 'critical',
            suggestedFix: revenue / 1000
          });
        }
      }
    }

    // Check net income - similar logic
    if (netIncome != null) {
      const absNetIncome = Math.abs(netIncome);
      if (absNetIncome > 100000000) {
        issues.push({
          ticker,
          quarter,
          field: 'netIncome',
          value: netIncome,
          expectedRange: '-50,000 to 50,000 million',
          severity: 'critical',
          suggestedFix: netIncome / 1000000
        });
      } else if (absNetIncome > 100000) {
        issues.push({
          ticker,
          quarter,
          field: 'netIncome',
          value: netIncome,
          expectedRange: '-50,000 to 50,000 million',
          severity: 'critical',
          suggestedFix: netIncome / 1000
        });
      }
    }

    // Check operating cash flow
    if (operatingCashFlow != null && Math.abs(operatingCashFlow) > 100000) {
      issues.push({
        ticker,
        quarter,
        field: 'operatingCashFlow',
        value: operatingCashFlow,
        expectedRange: '-50,000 to 50,000 million',
        severity: 'warning',
        suggestedFix: operatingCashFlow / 1000
      });
    }

    // Check capex
    if (capexAmount != null && capexAmount > 100000) {
      issues.push({
        ticker,
        quarter,
        field: 'capexAmount',
        value: capexAmount,
        expectedRange: '0-50,000 million',
        severity: 'warning',
        suggestedFix: capexAmount / 1000
      });
    }

    // Check deferred revenue
    if (deferredRevenue != null && deferredRevenue > 100000) {
      issues.push({
        ticker,
        quarter,
        field: 'deferredRevenue',
        value: deferredRevenue,
        expectedRange: '0-50,000 million',
        severity: 'warning',
        suggestedFix: deferredRevenue / 1000
      });
    }
  }
}

function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                       FINANCIAL DATA QUALITY AUDIT                         ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));

  console.log(`Scanning ${files.length} company files...\n`);

  for (const file of files) {
    const ticker = file.replace('.json', '');
    const filePath = join(DATA_DIR, file);
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));

    detectUnitIssues(ticker, data.reports);
  }

  if (issues.length === 0) {
    console.log('✅ No issues found! All financial data appears to be in correct units.\n');
    return;
  }

  console.log(`Found ${issues.length} potential issues:\n`);

  // Group by ticker
  const byTicker = new Map<string, Issue[]>();
  for (const issue of issues) {
    if (!byTicker.has(issue.ticker)) {
      byTicker.set(issue.ticker, []);
    }
    byTicker.get(issue.ticker)!.push(issue);
  }

  // Display issues
  for (const [ticker, tickerIssues] of byTicker) {
    console.log(`\n${ticker} (${tickerIssues.length} issues):`);
    console.log('─'.repeat(80));

    for (const issue of tickerIssues) {
      const severity = issue.severity === 'critical' ? '🚨' : '⚠️';
      console.log(`  ${severity} ${issue.quarter} - ${issue.field}`);
      console.log(`     Current value: ${issue.value.toLocaleString()}`);
      if (issue.suggestedFix !== undefined) {
        console.log(`     Suggested fix: ${issue.suggestedFix.toFixed(3)} million`);
      }
      console.log(`     Expected range: ${issue.expectedRange}`);
    }
  }

  console.log('\n\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                              SUMMARY                                       ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  const critical = issues.filter(i => i.severity === 'critical').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;

  console.log(`Critical issues: ${critical}`);
  console.log(`Warnings: ${warnings}`);
  console.log(`\nAffected companies: ${byTicker.size}`);
  console.log(`Total issues: ${issues.length}`);

  console.log('\n\nTo automatically fix these issues, run:');
  console.log('  npx tsx scripts/fix-financial-units.ts');
}

main();
