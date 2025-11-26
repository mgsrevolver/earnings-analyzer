/**
 * Regenerate Macro Analysis
 *
 * Quick script to regenerate /data/macro/latest.json from existing earnings data.
 * Use this after making changes to the macro analysis logic.
 *
 * Usage: npx tsx scripts/regenerate-macro.ts
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { computeMacroAnalysis } from '../lib/macro';

const DATA_DIR = join(process.cwd(), 'data', 'earnings');
const MACRO_DIR = join(process.cwd(), 'data', 'macro');

// Ensure macro directory exists
if (!existsSync(MACRO_DIR)) {
  mkdirSync(MACRO_DIR, { recursive: true });
}

async function main() {
  console.log('Regenerating macro analysis...');
  console.log(`Reading earnings data from: ${DATA_DIR}`);

  const macroAnalysis = computeMacroAnalysis(DATA_DIR);

  const macroPath = join(MACRO_DIR, 'latest.json');
  writeFileSync(macroPath, JSON.stringify(macroAnalysis, null, 2));

  console.log(`\nMacro analysis saved to: ${macroPath}`);
  console.log(`\nSummary:`);
  console.log(`- Period: ${macroAnalysis.period}`);
  console.log(`- Companies analyzed: ${macroAnalysis.companies.length}`);
  console.log(`- Partnership network entries: ${macroAnalysis.aggregateInsights.partnershipNetwork.length}`);

  if (macroAnalysis.aggregateInsights.partnershipNetwork.length > 0) {
    console.log(`\nTop partnerships (2+ companies):`);
    macroAnalysis.aggregateInsights.partnershipNetwork.slice(0, 10).forEach(p => {
      console.log(`  - ${p.partner}: ${p.mentions} companies (${p.connectedCompanies.join(', ')})`);
    });
  } else {
    console.log(`\nNo cross-company partnerships found (requires 2+ companies mentioning same partner)`);
  }

  console.log(`\nSector analyses: ${macroAnalysis.sectorAnalyses.length}`);
}

main().catch(console.error);
