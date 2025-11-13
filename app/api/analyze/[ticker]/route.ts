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

    // Analyze each filing sequentially to avoid rate limits
    const reports = [];
    for (let index = 0; index < filings.length; index++) {
      const filing = filings[index];
      console.log(`Analyzing filing ${index + 1}/${filings.length}: ${filing.form} from ${filing.reportDate}`);

        try {
          const { text } = await getFilingWithText(filing);

          // Determine quarter from report date
          // The reportDate is the END of the fiscal period being reported
          // For most calendar-year companies:
          // - Report ending ~Jan 31 = Q4 of previous year
          // - Report ending ~Apr 30 = Q1
          // - Report ending ~Jul 31 = Q2
          // - Report ending ~Oct 31 = Q3
          const reportDate = new Date(filing.reportDate);
          const month = reportDate.getMonth(); // 0-11
          let year = reportDate.getFullYear();

          // Map the ending month to the quarter that ended
          let fiscalQuarter;
          if (month === 0 || month === 1) {
            // Jan/Feb = Q4 of previous year
            fiscalQuarter = 4;
            year = year - 1;
          } else if (month >= 2 && month <= 4) {
            // Mar-May = Q1
            fiscalQuarter = 1;
          } else if (month >= 5 && month <= 7) {
            // Jun-Aug = Q2
            fiscalQuarter = 2;
          } else {
            // Sep-Dec = Q3
            fiscalQuarter = 3;
          }

          const quarter = `Q${fiscalQuarter} ${year}`;

          const insights = await analyzeEarningsReport(
            company.name,
            text,
            quarter
          );

          reports.push({
            filing,
            insights,
            quarter,
            analyzedSuccessfully: true
          });
        } catch (error) {
          console.error(`Error analyzing filing ${filing.accessionNumber}:`, error);
          reports.push({
            filing,
            quarter: filing.reportDate,
            analyzedSuccessfully: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }

        // Add a small delay between requests to avoid rate limits
        if (index < filings.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
    }

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
