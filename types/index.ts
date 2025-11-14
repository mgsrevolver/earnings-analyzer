// Company categories - hierarchical taxonomy
export type BroadSector =
  | "Technology"
  | "Healthcare"
  | "Consumer"
  | "Financial"
  | "Industrial"
  | "Other";

export type TechSubCategory =
  | "Cloud Infrastructure"
  | "Cybersecurity"
  | "AI/ML"
  | "SaaS"
  | "Semiconductors"
  | "E-commerce"
  | "Social Media"
  | "FinTech"
  | "Gaming"
  | "Enterprise Software";

export type HealthcareSubCategory =
  | "Biotech"
  | "Pharmaceuticals"
  | "Medical Devices"
  | "Healthcare IT";

export type SubCategory = TechSubCategory | HealthcareSubCategory | "Other";

// Legacy category for backward compatibility
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
  category: CompanyCategory[]; // Legacy - keep for now
  sector: BroadSector;
  subCategory: SubCategory;
  cik: string; // SEC Central Index Key for EDGAR lookups
  fiscalYearEnd?: string; // MM-DD format, e.g., "01-31" for Jan 31. Omit for calendar year (Dec 31)
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

  // Enhanced Market-Based Sentiment (optional - only available when market data is fetched)
  marketData?: {
    // Earnings beat/miss data
    actualEPS?: number;
    estimatedEPS?: number;
    epsSurprisePercent?: number; // (actual - estimate) / estimate * 100

    // Price action post-earnings
    priceOnEarningsDate?: number;
    priceAfter7Days?: number;
    priceChangePercent?: number; // % change over 7 days post-earnings

    // Guidance accuracy (comparing to previous quarter's guidance)
    guidanceAccuracyScore?: number; // 0-100, how well they met their own guidance

    // Composite sentiment scores (0-100)
    managementToneScore?: number; // Derived from existing sentiment fields
    earningsBeatScore?: number; // Based on EPS surprise
    priceActionScore?: number; // Based on post-earnings price movement
    guidanceAccuracyScoreWeighted?: number; // Based on hitting their own targets

    // Weighted composite (10% mgmt + 40% beat + 30% price + 20% guidance)
    compositeSentimentScore?: number; // 0-100
    compositeSentiment?: "bullish" | "neutral" | "bearish"; // Derived from composite score
  };
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

// Sector-level aggregation
export interface SectorAnalysis {
  sector: BroadSector;
  subCategory?: SubCategory;
  companies: string[]; // tickers
  averageRevenueGrowth: number;
  averageCapexGrowth: number;
  guidanceSentiment: {
    raised: number;
    maintained: number;
    lowered: number;
    notProvided: number;
  };
  supplyChainStatus: {
    tight: number;
    easing: number;
    normal: number;
    unknown: number;
  };
  aiInvestmentPercentage: number; // % of companies mentioning AI
  averageSentiment: number; // -1 to 1 scale
  topPartners: { partner: string; mentions: number }[];
}

// Cross-company macro analysis
export interface MacroAnalysis {
  period: string; // e.g., "Q4 2024"
  generatedAt: string; // ISO timestamp
  companies: string[]; // ticker symbols analyzed

  aggregateInsights: {
    // Overall metrics
    averageCapexGrowth: number;
    companiesRaisingGuidance: number;
    companiesLoweringGuidance: number;
    aiInvestmentCount: number;
    overallMarketSentiment: "bullish" | "neutral" | "bearish";

    // Partnership network
    partnershipNetwork: {
      partner: string;
      mentions: number;
      connectedCompanies: string[]; // tickers
    }[];

    // Supply chain
    supplyChainSentiment: {
      tight: number;
      easing: number;
      normal: number;
      unknown: number;
    };

    // Leading indicators
    headcountTrends: {
      expanding: number;
      stable: number;
      freezing: number;
      reducing: number;
    };

    pricingPowerDistribution: {
      strong: number;
      moderate: number;
      weak: number;
      unknown: number;
    };
  };

  // Sector breakdowns
  sectorAnalyses: SectorAnalysis[];

  // Divergences and outliers
  divergences: {
    theme: string;
    winners: string[]; // tickers
    losers: string[]; // tickers
    details: string;
  }[];

  // Key themes extracted
  topThemes: string[];
}

// Earnings calendar event
export interface EarningsEvent {
  company: Company;
  expectedDate: string;
  confirmed: boolean;
  fiscalQuarter: string;
}

// Analysis report from API
export interface AnalysisReport {
  filing: Filing;
  insights: EarningsInsights;
  quarter: string;
  analyzedSuccessfully: boolean;
}

// Analysis response from API
export interface AnalysisResponse {
  company: Company;
  reports: AnalysisReport[];
  totalFetched: number;
  successfulAnalyses: number;
}
