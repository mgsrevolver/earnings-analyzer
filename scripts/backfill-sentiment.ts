/**
 * Backfill Composite Sentiment Script
 *
 * Recomputes composite sentiment for existing data/earnings/*.json using the
 * fundamentals-grounded calculator (exact YoY revenue/net income from SEC XBRL
 * plus management tone). No Claude API calls — free and instant.
 *
 * Like repair-financials.ts, this does NOT touch lastUpdated so the scheduled
 * refresh workflow still re-analyzes everything.
 *
 * Usage: npx tsx scripts/backfill-sentiment.ts
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fetchCompanyFacts, getYoYComparison } from '../lib/xbrl';
import { calculateCompositeSentiment } from '../lib/sentiment-calculator';

const DATA_DIR = join(process.cwd(), 'data', 'earnings');

async function main() {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
  console.log(`Backfilling sentiment for ${files.length} tickers...\n`);

  for (const file of files) {
    const path = join(DATA_DIR, file);
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const ticker = file.replace('.json', '');

    const companyFacts = await fetchCompanyFacts(String(data.company?.cik ?? ''));
    if (!companyFacts) {
      console.warn(`⚠️  ${ticker}: no XBRL facts, skipping`);
      continue;
    }

    let updated = 0;
    for (const report of data.reports ?? []) {
      const { form, reportDate } = report.filing ?? {};
      if (!report.insights || !reportDate) continue;

      const yoy = getYoYComparison(companyFacts, reportDate, form);
      const sentiment = calculateCompositeSentiment(report.insights, {}, yoy);
      report.insights.marketData = { ...sentiment };
      updated++;
    }

    writeFileSync(path, JSON.stringify(data, null, 2));
    console.log(`✓ ${ticker}: ${updated} quarters`);
    await new Promise((r) => setTimeout(r, 300)); // SEC fair-use
  }

  console.log('\n✅ Sentiment backfill complete.');
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
