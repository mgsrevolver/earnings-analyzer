// Company categories
export type CompanyCategory =
  | "Mag7"
  | "Tech"
  | "Biotech"
  | "WSB"
  | "Other";

// Basic company information
export interface Company {
  ticker: string;
  name: string;
  category: CompanyCategory[];
  cik: string; // SEC Central Index Key for EDGAR lookups
}

// Earnings report filing info
export interface Filing {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: "8-K" | "10-Q" | "10-K";
  url: string;
}

// Macro insights extracted from earnings reports
export interface EarningsInsights {
  // Leading Indicators
  guidanceTone: "positive" | "neutral" | "negative" | "cautious";
  guidanceDirection: "raised" | "maintained" | "lowered" | "not_provided";
  bookingsGrowth?: number; // percentage
  pricingPower: "strong" | "moderate" | "weak" | "unknown";
  headcountTrend: "expanding" | "stable" | "freezing" | "reducing";

  // Quality of Earnings
  revenue: number;
  netIncome: number;
  operatingCashFlow?: number;
  freeCashFlow?: number;
  daysalesOutstanding?: number;
  deferredRevenue?: number;

  // Competitive Dynamics
  marketShareMention?: string;
  customerConcentration?: number; // % from top 3 customers
  geographicBreakdown?: {
    [region: string]: number; // revenue by region
  };

  // Macro Signals
  capexAmount?: number;
  capexGrowth?: number; // percentage YoY
  partnerships: string[]; // mentioned partnerships/deals
  supplyChainStatus: "tight" | "easing" | "normal" | "unknown";
  regulatoryHeadwinds: string[];
  aiInvestmentMentioned: boolean;

  // Credibility
  priorGuidanceHit: boolean | null;
  managementTone: "confident" | "neutral" | "defensive";

  // Sentiment & Summary
  overallSentiment: "bullish" | "neutral" | "bearish";
  summary: string;
  keyQuotes: string[];
}

// Earnings report with analysis
export interface EarningsReport {
  company: Company;
  filing: Filing;
  quarter: string; // e.g., "Q4 2024"
  fiscalYear: number;
  insights: EarningsInsights;
  analyzedAt: string; // ISO timestamp
}

// Trend data across multiple quarters for a single company
export interface CompanyTrend {
  company: Company;
  reports: EarningsReport[]; // sorted by quarter, most recent first
  trends: {
    revenueGrowth: number[]; // QoQ growth rates
    marginTrend: "improving" | "stable" | "declining";
    guidanceTrend: "increasingly_positive" | "stable" | "increasingly_cautious";
    capexTrend: "increasing" | "stable" | "decreasing";
  };
}

// Cross-company macro analysis
export interface MacroAnalysis {
  period: string; // e.g., "Q4 2024"
  companies: string[]; // ticker symbols
  aggregateInsights: {
    averageCapexGrowth: number;
    companiesRaisingGuidance: number;
    companiesLoweringGuidance: number;
    commonPartners: { [partner: string]: number }; // count of mentions
    supplyChainSentiment: {
      tight: number;
      easing: number;
      normal: number;
    };
    aiInvestmentCount: number;
    overallMarketSentiment: "bullish" | "neutral" | "bearish";
    topThemes: string[];
  };
  divergences: {
    theme: string;
    winners: string[]; // tickers
    losers: string[]; // tickers
  }[];
}

// Earnings calendar event
export interface EarningsEvent {
  company: Company;
  expectedDate: string;
  confirmed: boolean;
  fiscalQuarter: string;
}
