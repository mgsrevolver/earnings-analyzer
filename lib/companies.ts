import { Company } from "@/types";

export const COMPANIES: Company[] = [
  // Mag7
  {
    ticker: "AAPL",
    name: "Apple Inc.",
    category: ["Mag7", "Tech"],
    cik: "0000320193",
    fiscalYearEnd: "09-30", // Fiscal year ends September
  },
  {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    category: ["Mag7", "Tech"],
    cik: "0000789019",
    fiscalYearEnd: "06-30", // Fiscal year ends June
  },
  {
    ticker: "GOOGL",
    name: "Alphabet Inc.",
    category: ["Mag7", "Tech"],
    cik: "0001652044",
  },
  {
    ticker: "AMZN",
    name: "Amazon.com Inc.",
    category: ["Mag7", "Tech"],
    cik: "0001018724",
  },
  {
    ticker: "META",
    name: "Meta Platforms Inc.",
    category: ["Mag7", "Tech"],
    cik: "0001326801",
  },
  {
    ticker: "TSLA",
    name: "Tesla Inc.",
    category: ["Mag7", "Tech"],
    cik: "0001318605",
  },
  {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    category: ["Mag7", "Tech"],
    cik: "0001045810",
    fiscalYearEnd: "01-31", // Fiscal year ends January
  },

  // High-growth Tech
  {
    ticker: "SNOW",
    name: "Snowflake Inc.",
    category: ["Tech"],
    cik: "0001640147",
  },
  {
    ticker: "PLTR",
    name: "Palantir Technologies Inc.",
    category: ["Tech"],
    cik: "0001321655",
  },
  {
    ticker: "NET",
    name: "Cloudflare Inc.",
    category: ["Tech"],
    cik: "0001477333",
  },
  {
    ticker: "CRWD",
    name: "CrowdStrike Holdings Inc.",
    category: ["Tech"],
    cik: "0001535527",
  },
  {
    ticker: "DDOG",
    name: "Datadog Inc.",
    category: ["Tech"],
    cik: "0001561550",
  },
  {
    ticker: "ZS",
    name: "Zscaler Inc.",
    category: ["Tech"],
    cik: "0001713683",
  },
  {
    ticker: "OKTA",
    name: "Okta Inc.",
    category: ["Tech"],
    cik: "0001660134",
  },
  {
    ticker: "MDB",
    name: "MongoDB Inc.",
    category: ["Tech"],
    cik: "0001441110",
  },
  {
    ticker: "TEAM",
    name: "Atlassian Corporation",
    category: ["Tech"],
    cik: "0001650372",
  },
  {
    ticker: "U",
    name: "Unity Software Inc.",
    category: ["Tech"],
    cik: "0001810806",
  },
  {
    ticker: "RBLX",
    name: "Roblox Corporation",
    category: ["Tech"],
    cik: "0001315098",
  },

  // Semiconductors
  {
    ticker: "AMD",
    name: "Advanced Micro Devices Inc.",
    category: ["Tech"],
    cik: "0000002488",
  },
  {
    ticker: "INTC",
    name: "Intel Corporation",
    category: ["Tech"],
    cik: "0000050863",
  },
  {
    ticker: "QCOM",
    name: "QUALCOMM Inc.",
    category: ["Tech"],
    cik: "0000804328",
  },
  {
    ticker: "AVGO",
    name: "Broadcom Inc.",
    category: ["Tech"],
    cik: "0001730168",
  },

  // Biotech
  {
    ticker: "MRNA",
    name: "Moderna Inc.",
    category: ["Biotech"],
    cik: "0001682852",
  },
  {
    ticker: "BNTX",
    name: "BioNTech SE",
    category: ["Biotech"],
    cik: "0001776985",
  },
  {
    ticker: "GILD",
    name: "Gilead Sciences Inc.",
    category: ["Biotech"],
    cik: "0000882095",
  },
  {
    ticker: "VRTX",
    name: "Vertex Pharmaceuticals Inc.",
    category: ["Biotech"],
    cik: "0000875320",
  },
  {
    ticker: "REGN",
    name: "Regeneron Pharmaceuticals Inc.",
    category: ["Biotech"],
    cik: "0000872589",
  },
  {
    ticker: "BIIB",
    name: "Biogen Inc.",
    category: ["Biotech"],
    cik: "0000875045",
  },
  {
    ticker: "CRSP",
    name: "CRISPR Therapeutics AG",
    category: ["Biotech"],
    cik: "0001674384",
  },
  {
    ticker: "BEAM",
    name: "Beam Therapeutics Inc.",
    category: ["Biotech"],
    cik: "0001747769",
  },

  // WSB Favorites
  {
    ticker: "GME",
    name: "GameStop Corp.",
    category: ["WSB"],
    cik: "0001326380",
  },
  {
    ticker: "AMC",
    name: "AMC Entertainment Holdings Inc.",
    category: ["WSB"],
    cik: "0001411579",
  },
  {
    ticker: "BBBY",
    name: "Bed Bath & Beyond Inc.",
    category: ["WSB"],
    cik: "0000886158",
  },
  {
    ticker: "COIN",
    name: "Coinbase Global Inc.",
    category: ["WSB", "Tech"],
    cik: "0001679788",
  },
  {
    ticker: "HOOD",
    name: "Robinhood Markets Inc.",
    category: ["WSB", "Tech"],
    cik: "0001783879",
  },
];

// Helper functions
export function getAllCompanies(): Company[] {
  return COMPANIES;
}

export function getCompaniesByCategory(category: string): Company[] {
  return COMPANIES.filter((company) =>
    company.category.includes(category as any)
  );
}

export function getCompanyByTicker(ticker: string): Company | undefined {
  return COMPANIES.find((company) => company.ticker === ticker);
}

export function getCompanyByCIK(cik: string): Company | undefined {
  return COMPANIES.find((company) => company.cik === cik);
}
