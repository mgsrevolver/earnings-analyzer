/**
 * Batch Analysis Script
 *
 * This script fetches and analyzes earnings data for all companies in the database.
 * It stores the results in /data/earnings/{TICKER}.json for fast loading.
 *
 * For each company, it:
 * 1. Fetches last 12 filings from SEC EDGAR
 * 2. Runs Claude analysis on each filing (earnings metrics, sentiment, etc.)
 * 3. Extracts detailed partnerships with separate Claude call
 * 4. Fetches market data from Yahoo Finance (EPS beat/miss, price action)
 * 5. Calculates composite sentiment scores (0-100 scale)
 * 6. Saves all data to /data/earnings/{TICKER}.json
 *
 * After all companies, generates macro analysis at /data/macro/latest.json
 *
 * Usage: npm run analyze-all
 *
 * Estimated runtime: 2-3 hours for ~40 companies
 * Estimated cost: $5-10 in Anthropic API credits
 */

import { config } from 'dotenv';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { getAllCompanies } from '../lib/companies';
import { getRecentEarningsFilings, getFilingWithText } from '../lib/edgar';
import { analyzeEarningsReport, extractPartnerships } from '../lib/claude';
import { computeMacroAnalysis } from '../lib/macro';
import { calculateCompositeSentiment } from '../lib/sentiment-calculator';
import { validateAndNormalizeFinancialUnits } from '../lib/validate-financial-units';
import { fetchCompanyFacts, applyXbrlFinancials, sanitizeQ4, getYoYComparison } from '../lib/xbrl';

// Force unbuffered output for GitHub Actions real-time logging
process.stdout.write('🚀 Script starting... (unbuffered output)\n');

// Load environment variables from .env.local (local dev) or use process.env (GitHub Actions)
config({ path: join(process.cwd(), '.env.local') });

process.stdout.write('🔧 Checking environment...\n');
process.stdout.write(`   Environment: ${process.env.GITHUB_ACTIONS ? 'GitHub Actions' : 'Local'}\n`);
process.stdout.write(`   API Key: ${process.env.ANTHROPIC_API_KEY ? '✓ Present' : '✗ MISSING!'}\n`);
process.stdout.write(`   Working directory: ${process.cwd()}\n`);

const DATA_DIR = join(process.cwd(), 'data', 'earnings');
const MACRO_DIR = join(process.cwd(), 'data', 'macro');
const DELAY_BETWEEN_CALLS = 20000; // 20 seconds (safe for 50k tokens/min limit)
const DELAY_BETWEEN_COMPANIES = 5000; // 5 seconds between companies

// Ensure data directories exist
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
  process.stdout.write('✓ Created data/earnings directory\n');
}
if (!existsSync(MACRO_DIR)) {
  mkdirSync(MACRO_DIR, { recursive: true });
  process.stdout.write('✓ Created data/macro directory\n');
}

process.stdout.write('✅ Initialization complete\n\n');

interface QuarterInfo {
  calendarQuarter: number;
  calendarYear: number;
  fiscalQuarter: number;
  fiscalYear: number;
  quarter: string;
  reportDate: string;
}

// Helper function to map report date to calendar quarter (same logic as API route)
function getQuarterInfo(reportDate: string, company: any): QuarterInfo {
  const date = new Date(reportDate);
  const month = date.getMonth(); // 0-11

  // Go back 1.5 months (45 days) to find the middle of the reporting period
  const middleDate = new Date(date);
  middleDate.setDate(middleDate.getDate() - 45);

  const middleMonth = middleDate.getMonth();
  const middleYear = middleDate.getFullYear();

  // Determine calendar quarter based on middle of reporting period
  let calendarQuarter;
  if (middleMonth >= 0 && middleMonth <= 2) {
    calendarQuarter = 1; // Jan-Mar
  } else if (middleMonth >= 3 && middleMonth <= 5) {
    calendarQuarter = 2; // Apr-Jun
  } else if (middleMonth >= 6 && middleMonth <= 8) {
    calendarQuarter = 3; // Jul-Sep
  } else {
    calendarQuarter = 4; // Oct-Dec
  }

  let year = middleYear;

  // For fiscal year grouping (needed for Q4 calculation), use the actual report end date
  let fiscalYear = date.getFullYear();
  let fiscalQuarter = calendarQuarter;

  if (company.fiscalYearEnd) {
    const [fyEndMonth, fyEndDay] = company.fiscalYearEnd.split('-').map(Number);
    const fyEndMonthIndex = fyEndMonth - 1;

    // Determine which fiscal year this belongs to
    const endMonth = date.getMonth();
    if (endMonth > fyEndMonthIndex || (endMonth === fyEndMonthIndex && date.getDate() > fyEndDay)) {
      fiscalYear = date.getFullYear() + 1;
    }

    // Calculate fiscal quarter
    let monthsSinceFYEnd = endMonth - fyEndMonthIndex;
    if (monthsSinceFYEnd <= 0) monthsSinceFYEnd += 12;

    if (monthsSinceFYEnd <= 3) {
      fiscalQuarter = 1;
    } else if (monthsSinceFYEnd <= 6) {
      fiscalQuarter = 2;
    } else if (monthsSinceFYEnd <= 9) {
      fiscalQuarter = 3;
    } else {
      fiscalQuarter = 4;
    }
  }

  return {
    calendarQuarter,
    calendarYear: year,
    fiscalQuarter,
    fiscalYear,
    quarter: `Q${calendarQuarter} ${year}`,
    reportDate
  };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a company already has complete AND fresh analysis data.
 * Data older than MAX_DATA_AGE_DAYS is re-analyzed so the weekly refresh
 * actually refreshes (previously any ticker with data was skipped forever).
 * Set FORCE_REFRESH=1 to re-analyze everything regardless of age.
 */
const MAX_DATA_AGE_DAYS = 5;

function hasCompleteData(ticker: string): boolean {
  if (process.env.FORCE_REFRESH) return false;

  const outputPath = join(DATA_DIR, `${ticker}.json`);
  if (!existsSync(outputPath)) return false;

  try {
    const data = JSON.parse(readFileSync(outputPath, 'utf-8'));
    if (!(data.successfulAnalyses >= 3)) return false;

    const ageDays = (Date.now() - Date.parse(data.lastUpdated ?? 0)) / 86_400_000;
    return Number.isFinite(ageDays) && ageDays < MAX_DATA_AGE_DAYS;
  } catch {
    return false;
  }
}

/**
 * Commit and push data for a single company (incremental backup)
 * This ensures we don't lose work if the workflow times out
 */
async function commitAndPushData(ticker: string) {
  try {
    const filePath = `data/earnings/${ticker}.json`;

    // Check if there are changes to commit
    try {
      execSync('git diff --quiet HEAD ' + filePath, { stdio: 'pipe' });
      // No changes
      return;
    } catch {
      // Has changes, continue with commit
    }

    execSync(`git add ${filePath}`, { stdio: 'inherit' });
    execSync(`git commit -m "Update earnings data for ${ticker} [skip ci]"`, { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    console.log(`✓ Pushed ${ticker} data to GitHub\n`);
  } catch (error) {
    console.warn(`⚠️  Could not push ${ticker} data (continuing anyway):`, error instanceof Error ? error.message : error);
  }
}

async function analyzeCompany(company: any, companyIndex: number, totalCompanies: number) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${companyIndex}/${totalCompanies}] Processing ${company.name} (${company.ticker})`);
  console.log(`${'='.repeat(80)}\n`);

  // Skip if already has complete data
  if (hasCompleteData(company.ticker)) {
    console.log(`✓ ${company.ticker} already has complete data, skipping...`);
    return;
  }

  try {
    // Fetch filings
    console.log(`Fetching filings for ${company.ticker}...`);
    const filings = await getRecentEarningsFilings(company.cik, 12);
    console.log(`Found ${filings.length} filings\n`);

    if (filings.length === 0) {
      console.warn(`⚠️  No filings found for ${company.ticker}, skipping...`);
      return;
    }

    // Fetch exact XBRL financials once per company (source of truth for revenue/net income)
    const companyFacts = await fetchCompanyFacts(company.cik);
    if (!companyFacts) {
      console.warn(`⚠️  No XBRL facts for ${company.ticker} — falling back to LLM-extracted financials`);
    }

    // Analyze each filing
    const analyzedFilings = [];
    for (let index = 0; index < filings.length; index++) {
      const filing = filings[index];
      const { quarter } = getQuarterInfo(filing.reportDate, company);

      console.log(`  [${index + 1}/${filings.length}] Analyzing ${filing.form} from ${filing.reportDate} (${quarter})`);

      try {
        const { text } = await getFilingWithText(filing);

        // Run Claude analyses in parallel for efficiency
        const [rawInsights, detailedPartnerships] = await Promise.all([
          analyzeEarningsReport(company.name, text, quarter, filing.form),
          extractPartnerships(company.name, text, quarter)
        ]);

        // Validate and normalize financial units
        const insights = validateAndNormalizeFinancialUnits(rawInsights, company.name, quarter);

        // Replace LLM-extracted revenue/netIncome with exact SEC XBRL values
        applyXbrlFinancials(
          insights,
          companyFacts,
          filing.accessionNumber,
          filing.reportDate,
          filing.form,
          `${company.ticker} ${quarter}`
        );

        // Merge detailed partnerships with basic partnerships from insights
        const allPartnerships = Array.from(new Set([
          ...insights.partnerships,
          ...detailedPartnerships
        ]));

        // Sentiment grounded in exact YoY fundamentals from XBRL
        // (Yahoo Finance EPS/price data is no longer freely accessible)
        const yoy = getYoYComparison(companyFacts, filing.reportDate, filing.form);
        const sentimentData = calculateCompositeSentiment(insights, {}, yoy);
        console.log(`  🎯 Composite sentiment: ${sentimentData.compositeSentimentScore}/100 (${sentimentData.compositeSentiment})`);

        analyzedFilings.push({
          filing,
          insights: {
            ...insights,
            partnerships: allPartnerships,
            marketData: {
              ...sentimentData,
            }
          },
          quarter,
          quarterInfo: getQuarterInfo(filing.reportDate, company),
          analyzedSuccessfully: true
        });

        console.log(`  ✓ Success (${allPartnerships.length} partnerships, YoY rev ${yoy.revenue ? '✓' : '✗'}, YoY NI ${yoy.netIncome ? '✓' : '✗'})`);
      } catch (error) {
        console.error(`  ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Rate limiting: wait between API calls
      if (index < filings.length - 1) {
        const delaySeconds = DELAY_BETWEEN_CALLS / 1000;
        process.stdout.write(`  ⏳ Waiting ${delaySeconds}s before next call...`);
        await sleep(DELAY_BETWEEN_CALLS);
        process.stdout.write('\r  ' + ' '.repeat(50) + '\r'); // Clear the line
      }
    }

    // Group by fiscal year for Q4 calculation
    const byFiscalYear = new Map<number, any>();
    for (const report of analyzedFilings) {
      const { fiscalYear, fiscalQuarter } = report.quarterInfo;

      if (!byFiscalYear.has(fiscalYear)) {
        byFiscalYear.set(fiscalYear, {});
      }

      const yearData = byFiscalYear.get(fiscalYear)!;

      if (report.filing.form === '10-K') {
        yearData.annual = report;
      } else {
        if (!yearData.quarters) yearData.quarters = {};
        yearData.quarters[`Q${fiscalQuarter}`] = report;
      }
    }

    // Calculate Q4 for years where we have annual + Q1/Q2/Q3
    const finalReports = [];

    for (const [year, data] of byFiscalYear) {
      // Add Q1, Q2, Q3 if we have them
      if (data.quarters) {
        if (data.quarters.Q1) finalReports.push(data.quarters.Q1);
        if (data.quarters.Q2) finalReports.push(data.quarters.Q2);
        if (data.quarters.Q3) finalReports.push(data.quarters.Q3);
      }

      // Calculate Q4 if we have annual and all three quarters
      if (data.annual && data.quarters?.Q1 && data.quarters?.Q2 && data.quarters?.Q3) {
        const q1Revenue = data.quarters.Q1.insights.revenue;
        const q2Revenue = data.quarters.Q2.insights.revenue;
        const q3Revenue = data.quarters.Q3.insights.revenue;
        const annualRevenue = data.annual.insights.revenue;

        const q1NetIncome = data.quarters.Q1.insights.netIncome;
        const q2NetIncome = data.quarters.Q2.insights.netIncome;
        const q3NetIncome = data.quarters.Q3.insights.netIncome;
        const annualNetIncome = data.annual.insights.netIncome;

        const rawQ4Revenue = annualRevenue && q1Revenue && q2Revenue && q3Revenue
          ? annualRevenue - (q1Revenue + q2Revenue + q3Revenue)
          : null;

        const rawQ4NetIncome = annualNetIncome && q1NetIncome != null && q2NetIncome != null && q3NetIncome != null
          ? annualNetIncome - (q1NetIncome + q2NetIncome + q3NetIncome)
          : null;

        const { q4Revenue, q4NetIncome } = sanitizeQ4(
          rawQ4Revenue,
          rawQ4NetIncome,
          [q1Revenue, q2Revenue, q3Revenue],
          `${company.ticker} FY${year}`
        );

        const q4QuarterInfo = getQuarterInfo(data.annual.filing.reportDate, company);

        finalReports.push({
          filing: data.annual.filing,
          insights: {
            ...data.annual.insights,
            revenue: q4Revenue,
            netIncome: q4NetIncome
          },
          quarter: q4QuarterInfo.quarter,
          quarterInfo: q4QuarterInfo,
          analyzedSuccessfully: true
        });

        console.log(`  📊 Calculated Q4 FY${year}: Revenue ${q4Revenue}M, Net Income ${q4NetIncome}M`);
      }
    }

    // Sort by date descending
    finalReports.sort((a, b) => b.filing.reportDate.localeCompare(a.filing.reportDate));

    // Save to file
    const outputPath = join(DATA_DIR, `${company.ticker}.json`);
    const data = {
      company,
      reports: finalReports,
      totalFetched: filings.length,
      successfulAnalyses: finalReports.length,
      lastUpdated: new Date().toISOString()
    };

    // Don't overwrite existing good data with empty results
    if (finalReports.length === 0 && existsSync(outputPath)) {
      console.log(`\n⚠️  Skipping save - 0 successful analyses and existing data found`);
      console.log(`   Keeping cached data to preserve user experience`);
      return;
    }

    writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`\n✅ Saved ${finalReports.length} quarters to ${outputPath}`);

    // Commit and push data incrementally (GitHub Actions only)
    if (process.env.GITHUB_ACTIONS) {
      await commitAndPushData(company.ticker);
    }

  } catch (error) {
    console.error(`\n❌ Failed to process ${company.ticker}:`, error);
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                     EARNINGS ANALYZER - BATCH PROCESSING                   ║
╚════════════════════════════════════════════════════════════════════════════╝

Starting batch analysis of all companies...

⚠️  IMPORTANT:
   - This will take 2-3 hours to complete
   - Estimated cost: $5-10 in API credits
   - Rate limit: 20 seconds between API calls
   - Do not interrupt the process

Press Ctrl+C to cancel within the next 5 seconds...
`);

  await sleep(5000);

  const companies = getAllCompanies();
  console.log(`\n📊 Found ${companies.length} companies to process\n`);

  const startTime = Date.now();

  for (let i = 0; i < companies.length; i++) {
    await analyzeCompany(companies[i], i + 1, companies.length);

    // Delay between companies
    if (i < companies.length - 1) {
      console.log(`\n⏸  Waiting ${DELAY_BETWEEN_COMPANIES / 1000}s before next company...\n`);
      await sleep(DELAY_BETWEEN_COMPANIES);
    }
  }

  const endTime = Date.now();
  const durationMinutes = Math.round((endTime - startTime) / 1000 / 60);

  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                         GENERATING MACRO ANALYSIS                          ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

  try {
    // Compute macro analysis
    console.log('Computing macro analysis from all earnings data...');
    const macroAnalysis = computeMacroAnalysis(DATA_DIR);

    // Save macro analysis
    const macroPath = join(MACRO_DIR, 'latest.json');
    writeFileSync(macroPath, JSON.stringify(macroAnalysis, null, 2));

    console.log(`✅ Macro analysis saved to ${macroPath}`);
    console.log(`   - Period: ${macroAnalysis.period}`);
    console.log(`   - Companies analyzed: ${macroAnalysis.companies.length}`);
    console.log(`   - Sectors: ${macroAnalysis.sectorAnalyses.length}`);
    console.log(`   - Top partnerships: ${macroAnalysis.aggregateInsights.partnershipNetwork.slice(0, 5).map(p => p.partner).join(', ')}`);
  } catch (error) {
    console.error('❌ Failed to generate macro analysis:', error);
  }

  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                            BATCH PROCESSING COMPLETE                       ║
╚════════════════════════════════════════════════════════════════════════════╝

✅ Successfully processed all companies
⏱  Total time: ${durationMinutes} minutes
📁 Data saved to: ${DATA_DIR}
📊 Macro analysis saved to: ${MACRO_DIR}

Next steps:
1. Restart your Next.js dev server
2. Visit /company/{TICKER} to see instant-loading earnings data
3. Visit /macro to see cross-company macro trends
`);
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main().catch((error) => {
  console.error('💥 Fatal error in main():', error);
  process.exit(1);
});
