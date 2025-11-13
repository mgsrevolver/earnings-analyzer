import Anthropic from "@anthropic-ai/sdk";
import { EarningsInsights } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ANALYSIS_PROMPT = `You are an expert financial analyst specializing in earnings report analysis. Your task is to extract key macro insights from earnings reports that would be valuable to retail investors looking for market trends.

IMPORTANT:
1. You must respond with ONLY valid JSON. Do not include any text before or after the JSON object.
2. If this is a 10-K (annual report), you MUST extract ONLY the Q4 quarterly data, NOT the full year consolidated data.
   - Look for "Quarterly Financial Data" or "Selected Quarterly Financial Information" sections
   - These are typically in the Notes to Financial Statements
   - Extract revenue and net income for the FOURTH QUARTER only (Oct-Dec or Q4 column)
   - DO NOT use the consolidated annual totals from the main financial statements
3. For 10-Q reports, extract the quarterly data for that specific quarter.

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
    const maxLength = 50000; // ~50k characters (~12-15k tokens)

    if (reportText.length > maxLength) {
      let keywords: string[] = [];

      if (formType === "10-K") {
        // For 10-K, look for quarterly breakdown tables
        keywords = [
          "quarterly financial data",
          "selected quarterly financial information",
          "quarterly financial information",
          "unaudited quarterly results"
        ];
      } else {
        // For 10-Q, look for financial statements
        keywords = [
          "condensed consolidated statements of income",
          "consolidated statements of operations",
          "consolidated statements of income",
          "statements of operations",
          "financial statements"
        ];
      }

      let bestMatch = -1;
      for (const keyword of keywords) {
        const index = reportText.toLowerCase().indexOf(keyword);
        if (index !== -1 && (bestMatch === -1 || index < bestMatch)) {
          bestMatch = index;
        }
      }

      if (bestMatch !== -1) {
        // Found financial section - extract from there
        const startIndex = Math.max(0, bestMatch - 5000); // Include some context before
        truncatedText = reportText.substring(startIndex, startIndex + maxLength);
      } else {
        // Fallback: take beginning of report
        truncatedText = reportText.substring(0, maxLength) + "...";
      }
    }

    let formTypeNote = "";
    if (formType === "10-K") {
      formTypeNote = `\n\n⚠️ CRITICAL: This is a 10-K ANNUAL REPORT. You MUST find the quarterly breakdown table (usually in Note 15 or similar) and extract ONLY Q4 quarterly numbers (Oct-Dec). DO NOT use the consolidated annual totals. If you cannot find quarterly breakdown, return null for revenue/netIncome.`;
    } else if (formType === "10-Q") {
      formTypeNote = `\n\n⚠️ IMPORTANT: This is a 10-Q QUARTERLY REPORT. Extract the quarterly revenue and net income from the "Condensed Consolidated Statements of Income/Operations" (usually labeled for "Three Months Ended"). DO NOT use year-to-date or nine-month totals. Look for the most recent quarter's data only.`;
    }

    const message = await anthropic.messages.create({
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
    const message = await anthropic.messages.create({
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
