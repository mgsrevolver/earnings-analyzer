# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Earnings Analyzer is a Next.js web application that democratizes earnings analysis for retail investors. It uses Claude Haiku to analyze SEC EDGAR filings and extract macro insights across 40+ companies in tech, biotech, and high-volatility sectors. The app helps identify cross-company trends like AI investment, capex changes, partnership networks, and guidance sentiment.

**Key Value Proposition**: Identify macro trends across earnings reports that are usually locked behind Bloomberg Terminal - which companies are increasing AI spending, who's partnering with whom, sector-wide guidance trends, etc.

## Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server on localhost:3000
npm run build            # Production build
npm run start            # Production server
npm run lint             # Run ESLint

# Analysis Scripts (require ANTHROPIC_API_KEY in .env.local)
npm run analyze          # Analyze specific tickers (via scripts/analyze-tickers.ts)
npm run analyze-all      # Analyze all companies in lib/companies.ts
npm run macro            # Regenerate macro analysis from existing earnings data
npm run audit            # Audit financial data for unit inconsistencies
```

## Environment Setup

Requires `ANTHROPIC_API_KEY` in `.env.local` (get free key at console.anthropic.com). The SEC EDGAR API is free and requires no key, but you must set a proper User-Agent in `lib/edgar.ts`.

## Architecture

### Data Flow

1. **Data Ingestion** (`lib/edgar.ts`): Fetches 10-Q/10-K filings from SEC EDGAR API
   - Deduplicates by quarter (prefers 10-Q/10-K over 8-K)
   - Extracts plain text from HTML filings
   - Uses company CIK (Central Index Key) for lookups

2. **AI Analysis** (`lib/claude.ts`): Claude Haiku extracts ~50 structured data points per report
   - Leading indicators: guidance tone/direction, bookings, pricing power
   - Quality metrics: revenue, net income, cash flows
   - Macro signals: capex, partnerships, supply chain status, AI mentions
   - Management tone and credibility tracking

3. **Market Data Enrichment** (`lib/market-data.ts`, `lib/sentiment-calculator.ts`):
   - Fetches EPS surprise and price action from Yahoo Finance
   - Calculates composite sentiment score (weighted: 40% earnings beat, 30% price action, 20% guidance accuracy, 10% management tone)
   - Reality-checks management tone against market reaction

4. **Data Storage**: Analysis results saved as JSON to `data/earnings/{ticker}.json`

5. **Macro Aggregation** (`lib/macro.ts`): Cross-company analysis
   - Partner name normalization (maps variations like "MSFT", "Microsoft Corp" → "Microsoft")
   - Sector-level aggregations (average capex growth, guidance sentiment distribution)
   - Partnership network graph (who's mentioned partnering with whom)
   - Divergence detection (winners vs losers within sectors)

### Fiscal Year Handling

Companies have different fiscal year ends (e.g., Apple ends Sept, Microsoft ends June). The codebase handles this carefully:

- **Calendar Quarter Normalization** (`app/api/analyze/[ticker]/route.ts:35-102`): All companies displayed using calendar quarters (Q1 = Jan-Mar, Q2 = Apr-Jun, etc.) for meaningful peer comparison
- **Fiscal Quarter Tracking**: Used internally for grouping and Q4 calculation
- **Q4 Calculation**: For companies that only file 10-K (annual) + three 10-Qs, Q4 is calculated as: Annual - (Q1 + Q2 + Q3)
- Company fiscal year ends stored in `lib/companies.ts` as `fiscalYearEnd: "MM-DD"` (omit for calendar year companies)

### Financial Data Units

**CRITICAL**: All financial metrics (revenue, netIncome, capex, etc.) must be stored in **millions of dollars**. The Claude analysis prompt enforces this, but validate with `lib/validate-financial-units.ts` and `npm run audit`.

Common issues:
- SEC filings report in thousands → divide by 1,000
- Some filings report in actual dollars → divide by 1,000,000
- Always check the "in thousands" or "in millions" notation in financial statements

### Type System

Core types in `types/index.ts`:

- **Company**: Basic info + SEC CIK + fiscal year end
- **Filing**: 8-K/10-Q/10-K metadata + URL
- **EarningsInsights**: ~50 extracted data points per report
- **EarningsReport**: Company + Filing + Insights for one quarter
- **MacroAnalysis**: Cross-company aggregations and themes
- **SectorAnalysis**: Sector-level rollups

Legacy `CompanyCategory` (Mag7/Tech/Biotech/WSB) still used for UI filtering, but moving toward hierarchical `BroadSector` + `SubCategory` taxonomy.

### Key Files

- `lib/companies.ts`: Curated list of 40+ companies with CIKs and fiscal year ends
- `lib/edgar.ts`: SEC EDGAR API client (fetching filings, extracting text)
- `lib/claude.ts`: Claude Haiku integration for earnings analysis
- `lib/macro.ts`: Cross-company aggregation logic and partner normalization
- `lib/market-data.ts`: Yahoo Finance integration for EPS/price data
- `lib/sentiment-calculator.ts`: Composite sentiment scoring
- `app/api/analyze/[ticker]/route.ts`: Main analysis API endpoint
- `scripts/analyze-tickers.ts`: Standalone script to analyze specific companies
- `scripts/regenerate-macro.ts`: Regenerate macro analysis from existing data

### Scripts Usage

**Analyze specific companies:**
```bash
npx tsx scripts/analyze-tickers.ts AAPL MSFT GOOGL
```

**Analyze all companies** (takes 6-12 hours, costs ~$20-40):
```bash
npm run analyze-all
```

**Regenerate macro analysis** (after adding new earnings data):
```bash
npm run macro
```

**Audit financial units** (find data in wrong units):
```bash
npm run audit
```

## UI Structure

- `app/page.tsx`: Dashboard with company grid (filterable by category)
- `app/company/[ticker]/page.tsx`: Individual company earnings history
- `app/macro/page.tsx`: Cross-company macro analysis (partnership networks, capex trends, divergences)
- `app/trends/page.tsx`: Trend visualizations (stub - not yet implemented)
- `app/calendar/page.tsx`: Earnings calendar (6-month forward outlook)
- `components/ui/`: shadcn/ui components (button, card, badge, etc.)

## Cost Structure

- **SEC EDGAR API**: Free (no rate limits, but be respectful)
- **Claude Haiku**: ~$0.25 per million tokens
  - ~$0.01-0.03 per earnings report (depending on length)
  - ~$1-5/month for analyzing 100-500 reports
- **Yahoo Finance API** (via yahoo-finance2): Free
- **Vercel hosting**: Free tier sufficient

## Common Issues & Solutions

This section documents recurring challenges and their solutions. Add new issues here as they're discovered.

### Issue 1: 10-K Financial Data Extraction (Annual vs Quarterly)

**Problem**: Claude may extract incorrect financial figures from 10-K annual reports.

**Symptoms**:
- Revenue/netIncome values are 3-4x larger than expected for Q4
- Q4 values match the full year totals instead of just the fourth quarter
- Inconsistent quarter-over-quarter growth rates (huge spike in Q4)

**Root Cause**:
- 10-K reports contain BOTH full-year consolidated numbers AND quarterly breakdowns
- Claude may extract the prominent annual totals instead of Q4-specific data
- Year-to-date (YTD) figures can be mistaken for quarterly figures
- Different companies format their financial statements differently (some show quarterly breakdowns, some don't)

**Solution**:
1. **Prompt Engineering** (`lib/claude.ts:18-64`): Explicitly instruct Claude to extract "FULL YEAR consolidated totals" for 10-K and "quarterly data for that specific quarter (NOT year-to-date)" for 10-Q
2. **Q4 Calculation Logic** (`app/api/analyze/[ticker]/route.ts:194-233`): For companies that file 10-K + three 10-Qs, calculate Q4 as: `Annual - (Q1 + Q2 + Q3)`. This ensures accuracy even if Claude extraction is imperfect.
3. **Validation** (`lib/validate-financial-units.ts`): Check for unrealistic quarter-over-quarter changes (e.g., >300% growth)
4. **Context Targeting** (`lib/claude.ts:76-100`): For 10-Ks, extract text starting at 20% through the document to capture MD&A and financial statements sections where quarterly breakdowns appear

**Prevention**:
- Always run `npm run audit` after analyzing companies to catch extraction errors
- Manually verify Q4 numbers for new companies (check against investor relations sites)
- Consider the Q4 calculation method as the source of truth, not direct 10-K extraction

### Issue 2: [Template for Future Issues]

**Problem**: Brief description of the issue

**Symptoms**:
- Observable behavior that indicates this problem
- Error messages or unexpected output
- Where in the app/data you notice it

**Root Cause**:
- Technical explanation of why this happens
- Relevant code locations or architectural decisions

**Solution**:
- Step-by-step fix or workaround
- Code changes made
- Configuration updates

**Prevention**:
- How to avoid this issue in the future
- Validation steps to add
- Tests or checks to implement

---

## GitHub Actions

The project uses GitHub Actions to automate earnings analysis. See `.github/workflows/analyze-earnings.yml`.

### Workflow: Analyze All Companies

- **Trigger**: Manual dispatch via GitHub Actions tab, or scheduled (if enabled)
- **Runtime**: ~6-12 hours, 3-hour timeout
- **Cost**: ~$20-40 per full run
- **Output**: Commits updated JSON files to `data/earnings/` and `data/macro/`

### Enabling Scheduled Runs

To run weekly, uncomment the schedule in the workflow file:

```yaml
schedule:
  - cron: '0 2 * * 0' # Every Sunday at 2 AM UTC
```

### Required Secrets

- `ANTHROPIC_API_KEY`: Set in repository Settings → Secrets and variables → Actions

### Manual Trigger

1. Go to Actions tab in GitHub
2. Select "Analyze All Companies" workflow
3. Click "Run workflow"

## Development Notes

- Use **calendar quarters** (Q1-Q4) for display/comparison, not fiscal quarters
- Always validate financial units are in millions
- Partner names must be normalized via `lib/macro.ts:PARTNER_NAME_MAP`
- SEC requires User-Agent header on all EDGAR requests
- Add 2-20 second delays between Claude API calls to avoid rate limits
- When adding new companies, include CIK and fiscal year end (if not Dec 31)
