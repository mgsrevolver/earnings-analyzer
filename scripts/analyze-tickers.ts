/**
 * Analyze Specific Tickers Script
 *
 * Analyzes earnings data for specific tickers only (not all companies).
 * After analyzing, regenerates macro analysis to include the new data.
 *
 * Usage: npx tsx scripts/analyze-tickers.ts CEG VST CORZ DOCN IONQ
 *
 * Estimated runtime: ~15-30 min per company
 * Estimated cost: ~$0.50-1.00 per company
 */

import { config } from 'dotenv';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getCompanyByTicker } from '../lib/companies';
import { getRecentEarningsFilings, getFilingWithText } from '../lib/edgar';
import { analyzeEarningsReport, extractPartnerships } from '../lib/claude';
import { computeMacroAnalysis } from '../lib/macro';
import { fetchMarketData } from '../lib/market-data';
import { calculateCompositeSentiment } from '../lib/sentiment-calculator';
import { validateAndNormalizeFinancialUnits } from '../lib/validate-financial-units';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

const DATA_DIR = join(process.cwd(), 'data', 'earnings');
const MACRO_DIR = join(process.cwd(), 'data', 'macro');
const DELAY_BETWEEN_CALLS = 20000; // 20 seconds
const DELAY_BETWEEN_COMPANIES = 5000; // 5 seconds

// Ensure data directories exist
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}
if (!existsSync(MACRO_DIR)) {
  mkdirSync(MACRO_DIR, { recursive: true });
}

interface QuarterInfo {
  calendarQuarter: number;
  calendarYear: number;
  fiscalQuarter: number;
  fiscalYear: number;
  quarter: string;
  reportDate: string;
}

function getQuarterInfo(reportDate: string, company: any): QuarterInfo {
  const date = new Date(reportDate);
  const middleDate = new Date(date);
  middleDate.setDate(middleDate.getDate() - 45);

  const middleMonth = middleDate.getMonth();
  const middleYear = middleDate.getFullYear();

  let calendarQuarter;
  if (middleMonth >= 0 && middleMonth <= 2) {
    calendarQuarter = 1;
  } else if (middleMonth >= 3 && middleMonth <= 5) {
    calendarQuarter = 2;
  } else if (middleMonth >= 6 && middleMonth <= 8) {
    calendarQuarter = 3;
  } else {
    calendarQuarter = 4;
  }

  let year = middleYear;
  let fiscalYear = date.getFullYear();
  let fiscalQuarter = calendarQuarter;

  if (company.fiscalYearEnd) {
    const [fyEndMonth] = company.fiscalYearEnd.split('-').map(Number);
    const fyEndMonthIndex = fyEndMonth - 1;
    const endMonth = date.getMonth();

    if (endMonth > fyEndMonthIndex) {
      fiscalYear = date.getFullYear() + 1;
    }

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

async function analyzeCompany(company: any, companyIndex: number, totalCompanies: number) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`[${companyIndex}/${totalCompanies}] Processing ${company.name} (${company.ticker})`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    console.log(`Fetching filings for ${company.ticker}...`);
    const filings = await getRecentEarningsFilings(company.cik, 12);
    console.log(`Found ${filings.length} filings\n`);

    if (filings.length === 0) {
      console.warn(`⚠️  No filings found for ${company.ticker}, skipping...`);
      return;
    }

    const analyzedFilings = [];
    for (let index = 0; index < filings.length; index++) {
      const filing = filings[index];
      const { quarter } = getQuarterInfo(filing.reportDate, company);

      console.log(`  [${index + 1}/${filings.length}] Analyzing ${filing.form} from ${filing.reportDate} (${quarter})`);

      try {
        const { text } = await getFilingWithText(filing);

        const [rawInsights, detailedPartnerships] = await Promise.all([
          analyzeEarningsReport(company.name, text, quarter, filing.form),
          extractPartnerships(company.name, text, quarter)
        ]);

        // Validate and normalize financial units
        const insights = validateAndNormalizeFinancialUnits(rawInsights, company.name, quarter);

        const allPartnerships = Array.from(new Set([
          ...insights.partnerships,
          ...detailedPartnerships
        ]));

        console.log(`  📊 Fetching market data for ${filing.reportDate}...`);
        const marketData = await fetchMarketData(company.ticker, filing.reportDate);

        let sentimentData: any = {};
        if (marketData.epsSurprisePercent !== undefined || marketData.priceChangePercent !== undefined) {
          sentimentData = calculateCompositeSentiment(insights, marketData);
          console.log(`  🎯 Composite sentiment: ${sentimentData.compositeSentimentScore}/100 (${sentimentData.compositeSentiment})`);
        }

        analyzedFilings.push({
          filing,
          insights: {
            ...insights,
            partnerships: allPartnerships,
            marketData: {
              ...marketData,
              ...sentimentData,
            }
          },
          quarter,
          quarterInfo: getQuarterInfo(filing.reportDate, company),
          analyzedSuccessfully: true
        });

        console.log(`  ✓ Success (${allPartnerships.length} partnerships)`);
      } catch (error) {
        console.error(`  ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      if (index < filings.length - 1) {
        const delaySeconds = DELAY_BETWEEN_CALLS / 1000;
        process.stdout.write(`  ⏳ Waiting ${delaySeconds}s before next call...`);
        await sleep(DELAY_BETWEEN_CALLS);
        process.stdout.write('\r  ' + ' '.repeat(50) + '\r');
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

    const finalReports = [];
    for (const [year, data] of byFiscalYear) {
      if (data.quarters) {
        if (data.quarters.Q1) finalReports.push(data.quarters.Q1);
        if (data.quarters.Q2) finalReports.push(data.quarters.Q2);
        if (data.quarters.Q3) finalReports.push(data.quarters.Q3);
      }

      if (data.annual && data.quarters?.Q1 && data.quarters?.Q2 && data.quarters?.Q3) {
        const q4Revenue = data.annual.insights.revenue -
          (data.quarters.Q1.insights.revenue + data.quarters.Q2.insights.revenue + data.quarters.Q3.insights.revenue);
        const q4NetIncome = data.annual.insights.netIncome -
          (data.quarters.Q1.insights.netIncome + data.quarters.Q2.insights.netIncome + data.quarters.Q3.insights.netIncome);

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

    finalReports.sort((a, b) => b.filing.reportDate.localeCompare(a.filing.reportDate));

    const outputPath = join(DATA_DIR, `${company.ticker}.json`);
    const outputData = {
      company,
      reports: finalReports,
      totalFetched: filings.length,
      successfulAnalyses: finalReports.length,
      lastUpdated: new Date().toISOString()
    };

    writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\n✅ Saved ${finalReports.length} quarters to ${outputPath}`);

  } catch (error) {
    console.error(`\n❌ Failed to process ${company.ticker}:`, error);
  }
}

async function main() {
  const tickers = process.argv.slice(2).map(t => t.toUpperCase());

  if (tickers.length === 0) {
    console.error(`
Usage: npx tsx scripts/analyze-tickers.ts TICKER1 TICKER2 ...

Example: npx tsx scripts/analyze-tickers.ts CEG VST CORZ DOCN IONQ
`);
    process.exit(1);
  }

  // Validate tickers
  const companies = [];
  for (const ticker of tickers) {
    const company = getCompanyByTicker(ticker);
    if (!company) {
      console.error(`❌ Unknown ticker: ${ticker}`);
      console.error(`   Make sure it's added to lib/companies.ts first.`);
      process.exit(1);
    }
    companies.push(company);
  }

  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    EARNINGS ANALYZER - SELECTIVE ANALYSIS                  ║
╚════════════════════════════════════════════════════════════════════════════╝

Analyzing ${companies.length} companies: ${tickers.join(', ')}

Estimated time: ${companies.length * 15}-${companies.length * 30} minutes
Estimated cost: $${(companies.length * 0.5).toFixed(2)}-$${(companies.length * 1).toFixed(2)}

Press Ctrl+C to cancel within the next 3 seconds...
`);

  await sleep(3000);

  const startTime = Date.now();

  for (let i = 0; i < companies.length; i++) {
    await analyzeCompany(companies[i], i + 1, companies.length);

    if (i < companies.length - 1) {
      console.log(`\n⏸  Waiting ${DELAY_BETWEEN_COMPANIES / 1000}s before next company...\n`);
      await sleep(DELAY_BETWEEN_COMPANIES);
    }
  }

  const endTime = Date.now();
  const durationMinutes = Math.round((endTime - startTime) / 1000 / 60);

  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                         REGENERATING MACRO ANALYSIS                        ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

  try {
    console.log('Computing macro analysis from all earnings data...');
    const macroAnalysis = computeMacroAnalysis(DATA_DIR);

    const macroPath = join(MACRO_DIR, 'latest.json');
    writeFileSync(macroPath, JSON.stringify(macroAnalysis, null, 2));

    console.log(`✅ Macro analysis saved to ${macroPath}`);
    console.log(`   - Period: ${macroAnalysis.period}`);
    console.log(`   - Companies analyzed: ${macroAnalysis.companies.length}`);
    console.log(`   - Partnership network: ${macroAnalysis.aggregateInsights.partnershipNetwork.length} entries`);
  } catch (error) {
    console.error('❌ Failed to generate macro analysis:', error);
  }

  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                              ANALYSIS COMPLETE                             ║
╚════════════════════════════════════════════════════════════════════════════╝

✅ Analyzed: ${tickers.join(', ')}
⏱  Total time: ${durationMinutes} minutes
📁 Data saved to: ${DATA_DIR}
📊 Macro analysis updated: ${MACRO_DIR}/latest.json
`);
}

main().catch(console.error);
