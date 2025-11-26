import { MacroAnalysis, SectorAnalysis, BroadSector, SubCategory } from "@/types";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { getAllCompanies, getCompanyByTicker } from "./companies";

/**
 * Canonical partner name mappings for normalization
 * Maps variations to a single canonical name
 */
const PARTNER_NAME_MAP: Record<string, string> = {
  // Tech giants
  "microsoft corporation": "Microsoft",
  "msft": "Microsoft",
  "microsoft corp": "Microsoft",
  "google": "Google",
  "alphabet": "Google",
  "googl": "Google",
  "google search licensing": "Google",
  "amazon": "Amazon",
  "amazon.com": "Amazon",
  "amzn": "Amazon",
  "aws": "AWS",
  "amazon web services": "AWS",
  "meta": "Meta",
  "meta platforms": "Meta",
  "facebook": "Meta",
  "apple": "Apple",
  "apple inc": "Apple",
  "aapl": "Apple",
  "nvidia": "NVIDIA",
  "nvidia corporation": "NVIDIA",
  "nvda": "NVIDIA",
  "rivian": "Rivian",
  "rivian electric vehicle": "Rivian",
  "rivian electric vehicle collaboration": "Rivian",

  // Cloud/AI
  "openai": "OpenAI",
  "open ai": "OpenAI",
  "openai global llc": "OpenAI",
  "anthropic": "Anthropic",
  "salesforce": "Salesforce",
  "salesforce.com": "Salesforce",
  "oracle": "Oracle",
  "oracle corporation": "Oracle",
  "ibm": "IBM",
  "snowflake": "Snowflake",
  "databricks": "Databricks",

  // Semiconductors
  "tsmc": "TSMC",
  "taiwan semiconductor": "TSMC",
  "taiwan semiconductor manufacturing": "TSMC",
  "samsung": "Samsung",
  "samsung electronics": "Samsung",
  "samsung bioepis": "Samsung",
  "samsung bioepis (biosimilars)": "Samsung",
  "umc": "UMC",
  "umc collaboration on 12nm foundry process": "UMC",
  "intel": "Intel",
  "intel corporation": "Intel",
  "amd": "AMD",
  "advanced micro devices": "AMD",
  "qualcomm": "Qualcomm",
  "broadcom": "Broadcom",
  "arm": "ARM",
  "arm holdings": "ARM",

  // Pharma/Biotech
  "pfizer": "Pfizer",
  "pfizer inc": "Pfizer",
  "merck": "Merck",
  "merck & co": "Merck",
  "johnson & johnson": "J&J",
  "j&j": "J&J",
  "roche": "Roche",
  "roche holding": "Roche",
  "novartis": "Novartis",
  "sanofi": "Sanofi",
  "astrazeneca": "AstraZeneca",
  "gsk": "GSK",
  "glaxosmithkline": "GSK",
  "eli lilly": "Eli Lilly",
  "lilly": "Eli Lilly",
  "abbvie": "AbbVie",
  "regeneron": "Regeneron",
  "moderna": "Moderna",
  "biontech": "BioNTech",
  "vertex": "Vertex",
  "vertex pharmaceuticals": "Vertex",
  "gilead": "Gilead",
  "gilead sciences": "Gilead",
  "biogen": "Biogen",
  "amgen": "Amgen",
  "crispr therapeutics": "CRISPR Therapeutics",
  "crispr therapeutics ag": "CRISPR Therapeutics",
  "crispr": "CRISPR Therapeutics",
  "eisai": "Eisai",
  "takeda": "Takeda",
  "takeda pharmaceutical": "Takeda",
  "takeda pharmaceutical company": "Takeda",

  // Other tech
  "sony": "Sony",
  "sony playstation": "Sony",
  "sony corporation": "Sony",
  "tencent": "Tencent",
  "alibaba": "Alibaba",
  "jd.com": "JD.com",
  "jd cloud": "JD.com",
  "activision": "Activision Blizzard",
  "activision blizzard": "Activision Blizzard",
};

/**
 * Entities to filter out (not real partnerships)
 */
const EXCLUDED_PARTNERS = new Set([
  // Government/regulatory
  "fda", "sec", "ftc", "doj", "irs", "fcc", "epa",
  "darpa", "barda", "nih", "cdc", "cms",
  "european commission", "eu commission", "european union",
  "us government", "u.s. government", "federal government",
  "ministry of health", "ministry of health labor and welfare",
  "uk health security agency", "taiwan food and drug administration",
  "national institutes", "national institutes of health",
  "national institutes of allergy and infectious diseases",

  // Generic phrases
  "cloud service providers", "cloud providers",
  "ai model collaborations", "continued ai model collaborations",
  "enhanced cloud service partnerships", "strategic partners",
  "global telecommunications service provider partners",
  "expanded content licensing agreements",
  "manufacturing investments", "domestic production",
  "ai infrastructure buildout",

  // Standards/organizations (not companies)
  "north american charging standard", "nacs", "nacs adoption",
  "institute for life changing medicines",

  // Distributors (unless strategic)
  "mckesson", "mckesson corp", "mckesson corporation",
  "cardinal health", "cencora", "amerisourcebergen",
  "besse medical", "fff enterprises",

  // Investment/finance (not partnerships)
  "brookfield", "apollo", "blackstone", "blackstone life sciences",
  "scip transaction", "convertible notes",

  // Acquisitions (not partnerships)
  "bitstamp", "bitstamp (pending acquisition)",
  "zt systems", "zt systems acquisition",
  "inflection ai", "inflection ai inc",
]);

/**
 * Normalize a partner name to its canonical form
 */
function normalizePartnerName(name: string): string | null {
  const lower = name.toLowerCase().trim();

  // Check if it should be excluded
  if (EXCLUDED_PARTNERS.has(lower)) {
    return null;
  }

  // Check for partial matches in exclusions
  for (const excluded of EXCLUDED_PARTNERS) {
    if (lower.includes(excluded) || excluded.includes(lower)) {
      // Be careful not to exclude legitimate companies
      if (lower.length < 20) continue; // Short names are likely real companies
      return null;
    }
  }

  // Look up canonical name
  if (PARTNER_NAME_MAP[lower]) {
    return PARTNER_NAME_MAP[lower];
  }

  // Clean up common suffixes and return
  let cleaned = name
    .replace(/\s+(inc\.?|corp\.?|corporation|llc|ltd\.?|plc|ag|nv|sa|limited)$/i, "")
    .replace(/\s+(collaboration|partnership|deal|agreement|acquisition|transaction)$/i, "")
    .replace(/\s*\([^)]*\)\s*/g, "") // Remove parentheticals
    .trim();

  // Skip if it looks like a description rather than a company name
  if (cleaned.split(" ").length > 4) {
    return null;
  }

  // Skip if it contains action words (likely a description)
  const descriptionWords = ["pending", "continued", "enhanced", "expanded", "new", "ongoing"];
  if (descriptionWords.some(word => lower.startsWith(word))) {
    return null;
  }

  return cleaned || null;
}

interface CompanyEarningsData {
  company: any;
  reports: any[];
  totalFetched: number;
  successfulAnalyses: number;
  lastUpdated: string;
}

/**
 * Load all earnings data from the data/earnings directory
 */
function loadAllEarningsData(dataDir: string): Map<string, CompanyEarningsData> {
  const dataMap = new Map<string, CompanyEarningsData>();

  try {
    const files = readdirSync(dataDir);

    for (const file of files) {
      if (file.endsWith(".json")) {
        const ticker = file.replace(".json", "");
        const filePath = join(dataDir, file);
        const data = JSON.parse(readFileSync(filePath, "utf-8"));
        dataMap.set(ticker, data);
      }
    }
  } catch (error) {
    console.error("Error loading earnings data:", error);
  }

  return dataMap;
}

/**
 * Compute macro analysis from all earnings data
 */
export function computeMacroAnalysis(dataDir: string, targetQuarter?: string): MacroAnalysis {
  const earningsData = loadAllEarningsData(dataDir);
  const companies = getAllCompanies();

  // Determine the most recent quarter if not specified
  let analysisQuarter = targetQuarter;
  if (!analysisQuarter) {
    const allQuarters = new Set<string>();
    for (const [_, data] of earningsData) {
      for (const report of data.reports) {
        allQuarters.add(report.quarter);
      }
    }
    const sortedQuarters = Array.from(allQuarters).sort().reverse();
    analysisQuarter = sortedQuarters[0] || "Unknown";
  }

  // Filter reports for the target quarter
  const quarterReports: Array<{
    ticker: string;
    company: any;
    report: any;
  }> = [];

  for (const [ticker, data] of earningsData) {
    const report = data.reports.find((r: any) => r.quarter === analysisQuarter);
    if (report && report.insights) {
      quarterReports.push({ ticker, company: data.company, report });
    }
  }

  // Aggregate insights
  const tickers = quarterReports.map((r) => r.ticker);
  let totalCapexGrowth = 0;
  let capexGrowthCount = 0;
  let guidanceRaised = 0;
  let guidanceLowered = 0;
  let guidanceMaintained = 0;
  let guidanceNotProvided = 0;
  let aiInvestmentCount = 0;

  const partnershipMap = new Map<string, Set<string>>();
  const supplyChainCounts = { tight: 0, easing: 0, normal: 0, unknown: 0 };
  const headcountCounts = { expanding: 0, stable: 0, freezing: 0, reducing: 0 };
  const pricingPowerCounts = { strong: 0, moderate: 0, weak: 0, unknown: 0 };
  const sentimentScores: number[] = [];

  for (const { ticker, report } of quarterReports) {
    const insights = report.insights;

    // Capex growth
    if (insights.capexGrowth != null && !isNaN(insights.capexGrowth)) {
      totalCapexGrowth += insights.capexGrowth;
      capexGrowthCount++;
    }

    // Guidance
    switch (insights.guidanceDirection) {
      case "raised":
        guidanceRaised++;
        break;
      case "lowered":
        guidanceLowered++;
        break;
      case "maintained":
        guidanceMaintained++;
        break;
      case "not_provided":
        guidanceNotProvided++;
        break;
    }

    // AI investment
    if (insights.aiInvestmentMentioned) {
      aiInvestmentCount++;
    }

    // Partnerships - normalize and filter
    if (insights.partnerships && Array.isArray(insights.partnerships)) {
      for (const partner of insights.partnerships) {
        const normalizedPartner = normalizePartnerName(partner);
        if (normalizedPartner) {
          if (!partnershipMap.has(normalizedPartner)) {
            partnershipMap.set(normalizedPartner, new Set());
          }
          partnershipMap.get(normalizedPartner)!.add(ticker);
        }
      }
    }

    // Supply chain
    if (insights.supplyChainStatus) {
      if (supplyChainCounts.hasOwnProperty(insights.supplyChainStatus)) {
        supplyChainCounts[
          insights.supplyChainStatus as keyof typeof supplyChainCounts
        ]++;
      }
    }

    // Headcount
    if (insights.headcountTrend) {
      if (headcountCounts.hasOwnProperty(insights.headcountTrend)) {
        headcountCounts[insights.headcountTrend as keyof typeof headcountCounts]++;
      }
    }

    // Pricing power
    if (insights.pricingPower) {
      if (pricingPowerCounts.hasOwnProperty(insights.pricingPower)) {
        pricingPowerCounts[
          insights.pricingPower as keyof typeof pricingPowerCounts
        ]++;
      }
    }

    // Sentiment score
    const sentimentScore =
      insights.overallSentiment === "bullish"
        ? 1
        : insights.overallSentiment === "bearish"
        ? -1
        : 0;
    sentimentScores.push(sentimentScore);
  }

  // Compute overall sentiment
  const avgSentiment =
    sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;
  const overallSentiment: "bullish" | "neutral" | "bearish" =
    avgSentiment > 0.3 ? "bullish" : avgSentiment < -0.3 ? "bearish" : "neutral";

  // Build partnership network
  // First, get all normalized partnerships sorted by mention count
  const allPartnerships = Array.from(partnershipMap.entries())
    .map(([partner, connectedCompanies]) => ({
      partner,
      mentions: connectedCompanies.size,
      connectedCompanies: Array.from(connectedCompanies),
    }))
    .sort((a, b) => b.mentions - a.mentions);

  // Prefer partnerships mentioned by 2+ companies (true cross-company relationships)
  // If none exist, show top normalized partners to provide some value
  const crossCompanyPartnerships = allPartnerships.filter((p) => p.mentions >= 2);
  const partnershipNetwork = crossCompanyPartnerships.length > 0
    ? crossCompanyPartnerships
    : allPartnerships.slice(0, 15); // Show top 15 if no cross-company partnerships

  // Sector analyses
  const sectorMap = new Map<string, any[]>();

  for (const { ticker, company, report } of quarterReports) {
    const sectorKey = `${company.sector}:${company.subCategory}`;
    if (!sectorMap.has(sectorKey)) {
      sectorMap.set(sectorKey, []);
    }
    sectorMap.get(sectorKey)!.push({ ticker, company, report });
  }

  const sectorAnalyses: SectorAnalysis[] = [];

  for (const [sectorKey, sectorReports] of sectorMap) {
    const [sector, subCategory] = sectorKey.split(":");

    let totalRevGrowth = 0;
    let revGrowthCount = 0;
    let totalCapex = 0;
    let capexCount = 0;
    const sectorGuidance = { raised: 0, maintained: 0, lowered: 0, notProvided: 0 };
    const sectorSupplyChain = { tight: 0, easing: 0, normal: 0, unknown: 0 };
    let sectorAiCount = 0;
    const sectorSentiments: number[] = [];
    const sectorPartnershipMap = new Map<string, number>();

    for (const { ticker, report } of sectorReports) {
      const insights = report.insights;

      // Revenue growth (would need historical data - skip for now)
      // For capex
      if (insights.capexGrowth != null) {
        totalCapex += insights.capexGrowth;
        capexCount++;
      }

      // Guidance
      switch (insights.guidanceDirection) {
        case "raised":
          sectorGuidance.raised++;
          break;
        case "lowered":
          sectorGuidance.lowered++;
          break;
        case "maintained":
          sectorGuidance.maintained++;
          break;
        case "not_provided":
          sectorGuidance.notProvided++;
          break;
      }

      // Supply chain
      if (insights.supplyChainStatus && sectorSupplyChain.hasOwnProperty(insights.supplyChainStatus)) {
        sectorSupplyChain[insights.supplyChainStatus as keyof typeof sectorSupplyChain]++;
      }

      // AI
      if (insights.aiInvestmentMentioned) {
        sectorAiCount++;
      }

      // Sentiment
      const score = insights.overallSentiment === "bullish" ? 1 : insights.overallSentiment === "bearish" ? -1 : 0;
      sectorSentiments.push(score);

      // Partnerships - normalize
      if (insights.partnerships) {
        for (const partner of insights.partnerships) {
          const normalizedPartner = normalizePartnerName(partner);
          if (normalizedPartner) {
            sectorPartnershipMap.set(normalizedPartner, (sectorPartnershipMap.get(normalizedPartner) || 0) + 1);
          }
        }
      }
    }

    const avgSectorSentiment = sectorSentiments.reduce((a, b) => a + b, 0) / sectorSentiments.length;
    // Only show partners with 2+ mentions at sector level, or top 3 if none qualify
    const allPartners = Array.from(sectorPartnershipMap.entries())
      .map(([partner, mentions]) => ({ partner, mentions }))
      .sort((a, b) => b.mentions - a.mentions);
    const topPartners = allPartners.filter(p => p.mentions >= 2).length > 0
      ? allPartners.filter(p => p.mentions >= 2).slice(0, 5)
      : allPartners.slice(0, 3);

    sectorAnalyses.push({
      sector: sector as BroadSector,
      subCategory: subCategory as SubCategory,
      companies: sectorReports.map((r) => r.ticker),
      averageRevenueGrowth: 0, // Would need historical comparison
      averageCapexGrowth: capexCount > 0 ? totalCapex / capexCount : 0,
      guidanceSentiment: sectorGuidance,
      supplyChainStatus: sectorSupplyChain,
      aiInvestmentPercentage: (sectorAiCount / sectorReports.length) * 100,
      averageSentiment: avgSectorSentiment,
      topPartners,
    });
  }

  // Identify divergences
  const divergences: MacroAnalysis["divergences"] = [];

  // Guidance divergence
  if (guidanceRaised > 0 || guidanceLowered > 0) {
    const raisers = quarterReports
      .filter((r) => r.report.insights.guidanceDirection === "raised")
      .map((r) => r.ticker);
    const lowerers = quarterReports
      .filter((r) => r.report.insights.guidanceDirection === "lowered")
      .map((r) => r.ticker);

    if (raisers.length > 0 || lowerers.length > 0) {
      divergences.push({
        theme: "Guidance Direction",
        winners: raisers,
        losers: lowerers,
        details: `${raisers.length} companies raised guidance vs ${lowerers.length} lowered`,
      });
    }
  }

  // Capex spending divergence
  const highCapex = quarterReports
    .filter((r) => r.report.insights.capexGrowth != null && r.report.insights.capexGrowth > 20)
    .map((r) => r.ticker);
  const lowCapex = quarterReports
    .filter((r) => r.report.insights.capexGrowth != null && r.report.insights.capexGrowth < -10)
    .map((r) => r.ticker);

  if (highCapex.length > 0 || lowCapex.length > 0) {
    divergences.push({
      theme: "Capital Expenditure",
      winners: highCapex,
      losers: lowCapex,
      details: `${highCapex.length} companies increasing capex >20% vs ${lowCapex.length} decreasing >10%`,
    });
  }

  // Extract top themes from summaries
  const topThemes: string[] = [];
  // This could be enhanced with NLP, but for now we'll leave it simple
  if (aiInvestmentCount > quarterReports.length * 0.5) {
    topThemes.push("AI Infrastructure Investment");
  }
  if (supplyChainCounts.easing > supplyChainCounts.tight) {
    topThemes.push("Supply Chain Easing");
  } else if (supplyChainCounts.tight > supplyChainCounts.easing) {
    topThemes.push("Supply Chain Constraints");
  }
  if (guidanceRaised > guidanceLowered * 2) {
    topThemes.push("Optimistic Outlook");
  } else if (guidanceLowered > guidanceRaised) {
    topThemes.push("Cautious Guidance");
  }
  if (headcountCounts.reducing > headcountCounts.expanding) {
    topThemes.push("Cost Cutting Measures");
  }

  return {
    period: analysisQuarter,
    generatedAt: new Date().toISOString(),
    companies: tickers,
    aggregateInsights: {
      averageCapexGrowth: capexGrowthCount > 0 ? totalCapexGrowth / capexGrowthCount : 0,
      companiesRaisingGuidance: guidanceRaised,
      companiesLoweringGuidance: guidanceLowered,
      aiInvestmentCount,
      overallMarketSentiment: overallSentiment,
      partnershipNetwork,
      supplyChainSentiment: supplyChainCounts,
      headcountTrends: headcountCounts,
      pricingPowerDistribution: pricingPowerCounts,
    },
    sectorAnalyses,
    divergences,
    topThemes,
  };
}

/**
 * Get sector comparison for a specific company
 */
export function getSectorComparison(
  ticker: string,
  dataDir: string,
  targetQuarter?: string
): {
  company: any;
  companyMetrics: any;
  sectorAverages: any;
  subCategoryAverages: any;
  ranking: {
    inSector: number;
    totalInSector: number;
    inSubCategory: number;
    totalInSubCategory: number;
  };
} | null {
  const company = getCompanyByTicker(ticker);
  if (!company) return null;

  const earningsData = loadAllEarningsData(dataDir);
  const companyData = earningsData.get(ticker);
  if (!companyData) return null;

  // Get the target quarter
  let analysisQuarter = targetQuarter;
  if (!analysisQuarter && companyData.reports.length > 0) {
    analysisQuarter = companyData.reports[0].quarter;
  }

  const companyReport = companyData.reports.find((r: any) => r.quarter === analysisQuarter);
  if (!companyReport) return null;

  // Get all companies in the same sector and subCategory
  const sectorCompanies: any[] = [];
  const subCategoryCompanies: any[] = [];

  for (const [otherTicker, data] of earningsData) {
    const otherCompany = data.company;
    const otherReport = data.reports.find((r: any) => r.quarter === analysisQuarter);

    if (!otherReport) continue;

    if (otherCompany.sector === company.sector) {
      sectorCompanies.push({
        ticker: otherTicker,
        company: otherCompany,
        insights: otherReport.insights,
      });
    }

    if (
      otherCompany.sector === company.sector &&
      otherCompany.subCategory === company.subCategory
    ) {
      subCategoryCompanies.push({
        ticker: otherTicker,
        company: otherCompany,
        insights: otherReport.insights,
      });
    }
  }

  // Calculate averages
  const calcAvg = (companies: any[], field: string) => {
    const values = companies
      .map((c) => c.insights[field])
      .filter((v) => v != null && !isNaN(v));
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };

  const sectorAverages = {
    capexGrowth: calcAvg(sectorCompanies, "capexGrowth"),
    revenue: calcAvg(sectorCompanies, "revenue"),
  };

  const subCategoryAverages = {
    capexGrowth: calcAvg(subCategoryCompanies, "capexGrowth"),
    revenue: calcAvg(subCategoryCompanies, "revenue"),
  };

  // Ranking by revenue
  sectorCompanies.sort((a, b) => (b.insights.revenue || 0) - (a.insights.revenue || 0));
  subCategoryCompanies.sort((a, b) => (b.insights.revenue || 0) - (a.insights.revenue || 0));

  const sectorRank = sectorCompanies.findIndex((c) => c.ticker === ticker) + 1;
  const subCategoryRank = subCategoryCompanies.findIndex((c) => c.ticker === ticker) + 1;

  return {
    company,
    companyMetrics: companyReport.insights,
    sectorAverages,
    subCategoryAverages,
    ranking: {
      inSector: sectorRank,
      totalInSector: sectorCompanies.length,
      inSubCategory: subCategoryRank,
      totalInSubCategory: subCategoryCompanies.length,
    },
  };
}
