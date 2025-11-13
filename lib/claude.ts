import Anthropic from "@anthropic-ai/sdk";
import { EarningsInsights } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ANALYSIS_PROMPT = `You are an expert financial analyst specializing in earnings report analysis. Your task is to extract key macro insights from earnings reports that would be valuable to retail investors looking for market trends.

IMPORTANT:
1. You must respond with ONLY valid JSON. Do not include any text before or after the JSON object.
2. If this is a 10-K (annual report), extract ONLY the most recent QUARTER's data (Q4), NOT the full year data.
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
    // Truncate report if too long (Claude has context limits and rate limits)
    // 10-K annual reports can be 200+ pages, we need to be more aggressive
    const maxLength = 50000; // ~50k characters (~12-15k tokens)
    const truncatedText =
      reportText.length > maxLength
        ? reportText.substring(0, maxLength) + "..."
        : reportText;

    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `${ANALYSIS_PROMPT}

Company: ${companyName}
Quarter: ${quarter}

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
