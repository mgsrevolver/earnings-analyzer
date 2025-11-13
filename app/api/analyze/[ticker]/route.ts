import { NextResponse } from 'next/server';
import { getCompanyByTicker } from '@/lib/companies';
import { getRecentEarningsFilings, getFilingWithText } from '@/lib/edgar';
import { analyzeEarningsReport } from '@/lib/claude';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const company = getCompanyByTicker(ticker.toUpperCase());

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    console.log(`Fetching earnings filings for ${company.name} (${company.ticker})...`);

    // Fetch more filings to have enough data for Q4 calculation (need 3 years worth)
    const filings = await getRecentEarningsFilings(company.cik, 12);

    if (filings.length === 0) {
      return NextResponse.json({
        error: 'No earnings filings found for this company'
      }, { status: 404 });
    }

    console.log(`Found ${filings.length} filings. Analyzing...`);

    // Helper function to determine quarter from report date
    const getQuarterInfo = (reportDate: string) => {
      const date = new Date(reportDate);
      const month = date.getMonth(); // 0-11
      let year = date.getFullYear();

      let fiscalQuarter;
      if (month >= 0 && month <= 2) {
        fiscalQuarter = 1;
      } else if (month >= 3 && month <= 5) {
        fiscalQuarter = 2;
      } else if (month >= 6 && month <= 8) {
        fiscalQuarter = 3;
      } else {
        fiscalQuarter = 4;
      }

      return { fiscalQuarter, year, quarter: `Q${fiscalQuarter} ${year}` };
    };

    // Analyze each filing sequentially to avoid rate limits
    const analyzedFilings = [];
    for (let index = 0; index < filings.length; index++) {
      const filing = filings[index];
      const { quarter } = getQuarterInfo(filing.reportDate);

      console.log(`Analyzing filing ${index + 1}/${filings.length}: ${filing.form} from ${filing.reportDate} (${quarter})`);

      try {
        const { text } = await getFilingWithText(filing);

        const insights = await analyzeEarningsReport(
          company.name,
          text,
          quarter,
          filing.form
        );

        analyzedFilings.push({
          filing,
          insights,
          quarter,
          quarterInfo: getQuarterInfo(filing.reportDate),
          analyzedSuccessfully: true
        });
      } catch (error) {
        console.error(`Error analyzing filing ${filing.accessionNumber}:`, error);
      }

      // Add a small delay between requests to avoid rate limits
      if (index < filings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    // Group by fiscal year
    const byFiscalYear = new Map<number, any>();
    for (const report of analyzedFilings) {
      const { year, fiscalQuarter } = report.quarterInfo;

      if (!byFiscalYear.has(year)) {
        byFiscalYear.set(year, {});
      }

      const yearData = byFiscalYear.get(year)!;

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

        // Calculate Q4 = Annual - (Q1 + Q2 + Q3)
        const q4Revenue = annualRevenue && q1Revenue && q2Revenue && q3Revenue
          ? annualRevenue - (q1Revenue + q2Revenue + q3Revenue)
          : null;

        const q4NetIncome = annualNetIncome && q1NetIncome && q2NetIncome && q3NetIncome
          ? annualNetIncome - (q1NetIncome + q2NetIncome + q3NetIncome)
          : null;

        console.log(`Calculated Q4 ${year}: Revenue ${q4Revenue}M, Net Income ${q4NetIncome}M`);

        // Create Q4 report with calculated data + guidance from 10-K
        finalReports.push({
          filing: data.annual.filing,
          insights: {
            ...data.annual.insights,
            revenue: q4Revenue,
            netIncome: q4NetIncome
          },
          quarter: `Q4 ${year}`,
          quarterInfo: { fiscalQuarter: 4, year, quarter: `Q4 ${year}` },
          analyzedSuccessfully: true
        });
      }
    }

    // Sort by date descending and take the last 5 quarters
    finalReports.sort((a, b) => b.filing.reportDate.localeCompare(a.filing.reportDate));
    const last5Quarters = finalReports.slice(0, 5);

    console.log('Analysis complete!');

    return NextResponse.json({
      company,
      reports: last5Quarters,
      totalFetched: filings.length,
      successfulAnalyses: last5Quarters.length
    });
  } catch (error) {
    console.error('Error in analyze API:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to analyze earnings'
    }, { status: 500 });
  }
}
