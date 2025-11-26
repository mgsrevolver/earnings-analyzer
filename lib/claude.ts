import Anthropic from "@anthropic-ai/sdk";
import { EarningsInsights } from "@/types";

// Lazy initialization to support both Next.js and standalone scripts
let anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

const ANALYSIS_PROMPT = `You are an expert financial analyst specializing in earnings report analysis. Your task is to extract key macro insights from earnings reports that would be valuable to retail investors looking for market trends.

IMPORTANT:
1. You must respond with ONLY valid JSON. Do not include any text before or after the JSON object.
2. For 10-K (annual reports): Extract the FULL YEAR consolidated totals for revenue and net income
3. For 10-Q (quarterly reports): Extract the quarterly data for that specific quarter (NOT year-to-date)

Analyze the provided earnings report text and extract the following information in JSON format:

{
  "guidanceTone": "positive" | "neutral" | "negative" | "cautious",
  "guidanceDirection": "raised" | "maintained" | "lowered" | "not_provided",
  "bookingsGrowth": number (percentage, if mentioned),
  "pricingPower": "strong" | "moderate" | "weak" | "unknown",
  "headcountTrend": "expanding" | "stable" | "freezing" | "reducing",
  "revenue": number (in millions),
  "netIncome": number (in millions),
  "operatingCashFlow": number (in millions, if available),
  "freeCashFlow": number (in millions, if available),
  "daysalesOutstanding": number (days, if mentioned),
  "deferredRevenue": number (in millions, if mentioned),
  "marketShareMention": string (any mentions of market share gains/losses),
  "customerConcentration": number (% from top customers, if mentioned),
  "geographicBreakdown": object with region revenue percentages,
  "capexAmount": number (in millions, if mentioned),
  "capexGrowth": number (percentage YoY, if mentioned),
  "partnerships": array of strings (mentioned partnerships, deals, or agreements),
  "supplyChainStatus": "tight" | "easing" | "normal" | "unknown",
  "regulatoryHeadwinds": array of strings (mentioned regulatory challenges),
  "aiInvestmentMentioned": boolean,
  "priorGuidanceHit": boolean | null (did they hit previous guidance?),
  "managementTone": "confident" | "neutral" | "defensive",
  "overallSentiment": "bullish" | "neutral" | "bearish",
  "summary": string (2-3 sentence summary of key takeaways),
  "keyQuotes": array of strings (2-3 most important quotes from management)
}

Focus on:
1. Forward-looking indicators (guidance, bookings, pipeline)
2. Quality of earnings (cash flow vs earnings, working capital trends)
3. Competitive positioning and market dynamics
4. Macro signals (capex, partnerships, supply chain, AI investment)
5. Management credibility and tone

If a field cannot be determined from the text, use null or "unknown" as appropriate. Be precise with numbers and extract actual dollar amounts when mentioned.

Respond with ONLY the JSON object, nothing else.`;

/**
 * Analyze an earnings report using Claude Haiku
 */
export async function analyzeEarningsReport(
  companyName: string,
  reportText: string,
  quarter: string,
  formType?: string
): Promise<EarningsInsights> {
  try {
    // Smart text extraction to find financial data sections
    let truncatedText = reportText;
    // Claude Haiku supports 200k context - use most of it for comprehensive analysis
    // Need more context now for: partnerships, capex, supply chain, regulatory mentions, etc.
    const maxLength = formType === "10-K" ? 180000 : 80000; // 180k for 10-K, 80k for 10-Q

    if (reportText.length > maxLength) {
      if (formType === "10-K") {
        // For 10-K: Take from 20% through the document to capture:
        // - Business overview (partnerships, market dynamics)
        // - Risk factors (regulatory, supply chain)
        // - MD&A (management discussion - capex, guidance)
        // - Financial statements (revenue, cash flow)
        const startIndex = Math.floor(reportText.length * 0.20);
        truncatedText = reportText.substring(startIndex, startIndex + maxLength);
        console.log(`10-K: Extracting ${maxLength} chars from 20% mark (position ${startIndex})`);
      } else {
        // For 10-Q: Capture broader context for partnerships, MD&A
        const keywords = [
          "management's discussion and analysis",
          "condensed consolidated statements of income",
          "consolidated statements of operations",
          "consolidated statements of income",
        ];

        let bestMatch = -1;
        for (const keyword of keywords) {
          const index = reportText.toLowerCase().indexOf(keyword);
          if (index !== -1 && (bestMatch === -1 || index < bestMatch)) {
            bestMatch = index;
          }
        }

        if (bestMatch !== -1) {
          const startIndex = Math.max(0, bestMatch - 5000); // More context before
          truncatedText = reportText.substring(startIndex, startIndex + maxLength);
          console.log(`10-Q: Found key section at position ${bestMatch}, extracting from ${startIndex}`);
        } else {
          // Take from beginning, which usually has MD&A and financial statements
          truncatedText = reportText.substring(0, maxLength);
          console.log(`10-Q: No keywords found, taking first ${maxLength} characters`);
        }
      }
    }

    let formTypeNote = "";
    if (formType === "10-K") {
      formTypeNote = `\n\n⚠️ IMPORTANT: This is a 10-K ANNUAL REPORT. Extract the FULL YEAR consolidated revenue and net income totals from the Consolidated Statements of Operations.`;
    } else if (formType === "10-Q") {
      formTypeNote = `\n\n⚠️ IMPORTANT: This is a 10-Q QUARTERLY REPORT. Extract the quarterly revenue and net income from the "Condensed Consolidated Statements of Income/Operations" (usually labeled for "Three Months Ended"). DO NOT use year-to-date totals.`;
    }

    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `${ANALYSIS_PROMPT}

Company: ${companyName}
Quarter: ${quarter}
Form Type: ${formType || "10-Q"}${formTypeNote}

Earnings Report:
${truncatedText}`,
        },
      ],
    });

    // Extract JSON from response
    const responseText = message.content[0].type === "text"
      ? message.content[0].text
      : "";

    // Try to find JSON in the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Claude response did not contain JSON. Response:", responseText.substring(0, 500));
      throw new Error("No JSON found in Claude response");
    }

    try {
      const insights: EarningsInsights = JSON.parse(jsonMatch[0]);
      return insights;
    } catch (parseError) {
      console.error("Failed to parse JSON from Claude response:", jsonMatch[0].substring(0, 500));
      throw new Error(`Invalid JSON from Claude: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error("Error analyzing earnings report:", error);
    throw error;
  }
}

/**
 * Extract detailed partnership information from earnings report
 */
export async function extractPartnerships(
  companyName: string,
  reportText: string,
  quarter: string
): Promise<string[]> {
  const PARTNERSHIP_PROMPT = `You are analyzing an earnings report to identify ONLY significant business partnerships with other companies.

Extract partnerships that are:
1. Strategic partnerships with named companies (e.g., "partnership with Microsoft", "collaboration with TSMC")
2. Major supplier/manufacturing relationships (e.g., "TSMC manufactures our chips", "partnership with Samsung for displays")
3. Technology platform partnerships (e.g., "integrated with Salesforce", "built on AWS")
4. Joint ventures with named companies
5. Distribution/licensing partnerships (e.g., "Sanofi distributes our drug")

DO NOT include:
- Government agencies (FDA, DARPA, BARDA, SEC, EU Commission, etc.)
- Generic phrases ("cloud providers", "AI collaborations", "strategic partners")
- Internal initiatives ("domestic manufacturing investment", "AI infrastructure buildout")
- Acquisitions or M&A deals (these are not partnerships)
- Customer wins without ongoing partnership (one-time sales)
- Regulatory bodies or standards organizations
- Research institutions or universities (unless major commercial partnership)
- Distributors like McKesson, Cardinal Health unless specifically a strategic partnership

Rules:
- Return ONLY the company name, not descriptions (e.g., "TSMC" not "TSMC for chip manufacturing")
- Use canonical company names (e.g., "Microsoft" not "MSFT", "Amazon" not "AWS" unless specifically AWS)
- Must be a real, named company - no generic references
- Focus on partnerships that show business ecosystem connections

Return ONLY a JSON array of company names. Example:
["Microsoft", "TSMC", "Salesforce", "OpenAI"]

If no qualifying partnerships are found, return an empty array: []`;

  try {
    // Extract relevant sections mentioning partnerships
    const keywords = [
      "partnership",
      "collaborate",
      "agreement",
      "customer",
      "integration",
      "deal",
      "contract",
      "announce",
    ];

    let relevantSections: string[] = [];
    const lines = reportText.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (keywords.some((kw) => line.includes(kw))) {
        // Include context around the line
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length, i + 3);
        relevantSections.push(lines.slice(start, end).join("\n"));
      }
    }

    // Limit to ~30k characters for partnership extraction
    const partnershipText = relevantSections.join("\n\n").substring(0, 30000);

    if (!partnershipText.trim()) {
      return [];
    }

    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `${PARTNERSHIP_PROMPT}

Company: ${companyName}
Quarter: ${quarter}

Report Excerpt:
${partnershipText}`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "[]";

    // Parse JSON array
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn(
        `No partnership array found for ${companyName}. Response:`,
        responseText.substring(0, 200)
      );
      return [];
    }

    try {
      const partnerships: string[] = JSON.parse(jsonMatch[0]);
      return partnerships.filter((p) => typeof p === "string" && p.trim().length > 0);
    } catch (parseError) {
      console.error(
        `Failed to parse partnership JSON for ${companyName}:`,
        jsonMatch[0]
      );
      return [];
    }
  } catch (error) {
    console.error(`Error extracting partnerships for ${companyName}:`, error);
    return [];
  }
}

/**
 * Batch analyze multiple companies for cross-company insights
 */
export async function generateMacroAnalysis(
  reports: Array<{ companyName: string; insights: EarningsInsights }>
): Promise<string> {
  const summaryPrompt = `You are analyzing earnings reports across multiple companies to identify macro trends.

Here are the extracted insights from ${reports.length} companies:

${reports.map((r) => `${r.companyName}:\n${JSON.stringify(r.insights, null, 2)}`).join("\n\n")}

Provide a macro analysis covering:
1. Common themes across companies (capex trends, guidance direction, supply chain)
2. Divergences (which sectors/companies are outperforming or underperforming)
3. Key partnerships and deals that create interconnections
4. Overall market sentiment and what it signals for the next quarter
5. Notable credibility issues (companies missing guidance)

Format as a concise 5-7 bullet point summary.`;

  try {
    const client = getAnthropicClient();
    const message = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: summaryPrompt,
        },
      ],
    });

    return message.content[0].type === "text"
      ? message.content[0].text
      : "No analysis generated";
  } catch (error) {
    console.error("Error generating macro analysis:", error);
    throw error;
  }
}
