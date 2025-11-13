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

    // Fetch last 5 quarters
    const filings = await getRecentEarningsFilings(company.cik, 5);

    if (filings.length === 0) {
      return NextResponse.json({
        error: 'No earnings filings found for this company'
      }, { status: 404 });
    }

    console.log(`Found ${filings.length} filings. Analyzing...`);

    // Analyze each filing
    const reports = await Promise.all(
      filings.map(async (filing, index) => {
        console.log(`Analyzing filing ${index + 1}/${filings.length}: ${filing.form} from ${filing.reportDate}`);

        try {
          const { text } = await getFilingWithText(filing);

          // Determine quarter from report date
          // The reportDate is the END of the fiscal period being reported
          const reportDate = new Date(filing.reportDate);
          const month = reportDate.getMonth(); // 0-11
          const year = reportDate.getFullYear();

          // Calculate fiscal quarter based on the END month of the period
          // Q1: Jan-Mar (ends in Mar/month 2)
          // Q2: Apr-Jun (ends in Jun/month 5)
          // Q3: Jul-Sep (ends in Sep/month 8)
          // Q4: Oct-Dec (ends in Dec/month 11)
          let fiscalQuarter;
          if (month <= 2) fiscalQuarter = 1;
          else if (month <= 5) fiscalQuarter = 2;
          else if (month <= 8) fiscalQuarter = 3;
          else fiscalQuarter = 4;

          const quarter = `Q${fiscalQuarter} ${year}`;

          const insights = await analyzeEarningsReport(
            company.name,
            text,
            quarter
          );

          return {
            filing,
            insights,
            quarter,
            analyzedSuccessfully: true
          };
        } catch (error) {
          console.error(`Error analyzing filing ${filing.accessionNumber}:`, error);
          return {
            filing,
            quarter: filing.reportDate,
            analyzedSuccessfully: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    console.log('Analysis complete!');

    return NextResponse.json({
      company,
      reports: reports.filter(r => r.analyzedSuccessfully),
      totalFetched: filings.length,
      successfulAnalyses: reports.filter(r => r.analyzedSuccessfully).length
    });
  } catch (error) {
    console.error('Error in analyze API:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to analyze earnings'
    }, { status: 500 });
  }
}
