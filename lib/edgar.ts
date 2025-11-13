import { Filing } from "@/types";

const EDGAR_BASE_URL = "https://data.sec.gov";
const USER_AGENT = "EarningsAnalyzer/1.0 (contact@example.com)"; // SEC requires this

export interface EdgarFiling {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  acceptanceDateTime: string;
  act: string;
  form: string;
  fileNumber: string;
  filmNumber: string;
  items: string;
  size: number;
  isXBRL: number;
  isInlineXBRL: number;
  primaryDocument: string;
  primaryDocDescription: string;
}

export interface EdgarCompanyFilings {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  ein: string;
  description: string;
  website: string;
  category: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      acceptanceDateTime: string[];
      act: string[];
      form: string[];
      fileNumber: string[];
      filmNumber: string[];
      items: string[];
      size: number[];
      isXBRL: number[];
      isInlineXBRL: number[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
  };
}

/**
 * Fetch recent filings for a company from SEC EDGAR
 */
export async function fetchCompanyFilings(
  cik: string
): Promise<EdgarCompanyFilings> {
  // Pad CIK to 10 digits
  const paddedCIK = cik.padStart(10, "0");

  const response = await fetch(
    `${EDGAR_BASE_URL}/submissions/CIK${paddedCIK}.json`,
    {
      headers: {
        "User-Agent": USER_AGENT,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch filings for CIK ${cik}: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get the last N earnings-related filings (8-K, 10-Q, 10-K) for a company
 * Deduplicates by quarter - prefers 10-Q/10-K over 8-K for same period
 */
export async function getRecentEarningsFilings(
  cik: string,
  count: number = 5
): Promise<Filing[]> {
  const data = await fetchCompanyFilings(cik);
  const filingsByQuarter = new Map<string, Filing>();

  const { recent } = data.filings;

  for (let i = 0; i < recent.form.length; i++) {
    const form = recent.form[i];

    // Only include earnings-related forms
    if (form === "8-K" || form === "10-Q" || form === "10-K") {
      // For 8-K, check if it's earnings-related (Item 2.02)
      if (form === "8-K") {
        const items = recent.items[i];
        if (!items || !items.includes("2.02")) {
          continue; // Skip non-earnings 8-Ks
        }
      }

      const reportDate = recent.reportDate[i] || recent.filingDate[i];
      const accessionNumber = recent.accessionNumber[i].replace(/-/g, "");
      const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cik.replace(/^0+/, "")}/${accessionNumber}/${recent.primaryDocument[i]}`;

      const filing: Filing = {
        accessionNumber: recent.accessionNumber[i],
        filingDate: recent.filingDate[i],
        reportDate,
        form: form as "8-K" | "10-Q" | "10-K",
        url: filingUrl,
      };

      // Use report date as quarter key (YYYY-MM format for grouping by quarter)
      const quarterKey = reportDate.substring(0, 7); // e.g., "2025-07"

      // Prefer 10-Q/10-K over 8-K for the same quarter
      const existing = filingsByQuarter.get(quarterKey);
      if (!existing || (existing.form === "8-K" && form !== "8-K")) {
        filingsByQuarter.set(quarterKey, filing);
      }
    }

    // Stop once we have enough unique quarters
    if (filingsByQuarter.size >= count * 2) break; // Buffer to ensure we get enough
  }

  // Convert to array, sort by report date descending, and take the requested count
  return Array.from(filingsByQuarter.values())
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate))
    .slice(0, count);
}

/**
 * Fetch the full text of a filing document
 */
export async function fetchFilingDocument(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch filing document: ${response.statusText}`);
  }

  return response.text();
}

/**
 * Extract text from HTML filing (strips HTML tags)
 */
export function extractTextFromHTML(html: string): string {
  // Remove script and style elements
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Get earnings filing with extracted text
 */
export async function getFilingWithText(filing: Filing): Promise<{ filing: Filing; text: string }> {
  const html = await fetchFilingDocument(filing.url);
  const text = extractTextFromHTML(html);

  return { filing, text };
}
