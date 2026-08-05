import { EarningsInsights } from "@/types";
import { MarketDataResult } from "./market-data";
import { YoYComparison } from "./xbrl";

/**
 * Composite Sentiment Calculator
 *
 * Calculates reality-based sentiment scores from components we can actually
 * trust, weighted by availability:
 * - Revenue YoY growth (exact, from SEC XBRL)        weight 30
 * - Net income level & YoY trajectory (exact, XBRL)  weight 25
 * - Post-earnings price action (when available)      weight 30
 * - Management tone (LLM-extracted, soft signal)     weight 15
 *
 * Components without data are dropped and the remaining weights renormalized —
 * a missing feed can never push a score toward fake-neutral or fake-bearish.
 * (Earlier versions leaned on EPS-estimate surprises from Yahoo Finance and
 * LLM-guessed guidance direction; the former is no longer freely available and
 * the latter was noise, which made everything read bearish.)
 */

/**
 * Convert management tone to a 0-100 score
 */
function calculateManagementToneScore(insights: EarningsInsights): number {
  const { managementTone, overallSentiment, guidanceTone } = insights;

  let score = 50; // Neutral baseline

  // Management tone (most important)
  if (managementTone === "confident") score += 20;
  else if (managementTone === "defensive") score -= 20;

  // Overall sentiment
  if (overallSentiment === "bullish") score += 20;
  else if (overallSentiment === "bearish") score -= 20;

  // Guidance tone
  if (guidanceTone === "positive") score += 10;
  else if (guidanceTone === "negative") score -= 10;
  else if (guidanceTone === "cautious") score -= 5;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Convert EPS surprise to a 0-100 score
 * Beats > 5% = bullish (score 80-100)
 * Beats 0-5% = slight bullish (score 55-80)
 * Misses 0-5% = slight bearish (score 20-45)
 * Misses > 5% = bearish (score 0-20)
 */
function calculateEarningsBeatScore(epsSurprisePercent?: number): number {
  if (epsSurprisePercent === undefined) {
    return 50; // Neutral if no data
  }

  if (epsSurprisePercent > 10) return 100; // Massive beat
  if (epsSurprisePercent > 5) return 85;    // Strong beat
  if (epsSurprisePercent > 2) return 70;    // Solid beat
  if (epsSurprisePercent > 0) return 60;    // Slight beat
  if (epsSurprisePercent > -2) return 40;   // Slight miss
  if (epsSurprisePercent > -5) return 25;   // Moderate miss
  if (epsSurprisePercent > -10) return 15;  // Bad miss
  return 5; // Disaster
}

/**
 * Convert 7-day price action to a 0-100 score
 * Stock up > 10% = very bullish (score 90-100)
 * Stock up 5-10% = bullish (score 70-90)
 * Stock up 0-5% = slight bullish (score 55-70)
 * Stock down 0-5% = slight bearish (score 30-45)
 * Stock down 5-10% = bearish (score 10-30)
 * Stock down > 10% = very bearish (score 0-10)
 */
function calculatePriceActionScore(priceChangePercent?: number): number {
  if (priceChangePercent === undefined) {
    return 50; // Neutral if no data
  }

  if (priceChangePercent > 15) return 100;  // Explosive
  if (priceChangePercent > 10) return 90;   // Very strong
  if (priceChangePercent > 7) return 80;    // Strong
  if (priceChangePercent > 5) return 70;    // Good
  if (priceChangePercent > 3) return 65;    // Solid
  if (priceChangePercent > 0) return 55;    // Slight positive
  if (priceChangePercent > -3) return 45;   // Slight negative
  if (priceChangePercent > -5) return 35;   // Negative
  if (priceChangePercent > -7) return 25;   // Bad
  if (priceChangePercent > -10) return 15;  // Very bad
  return 5; // Disastrous
}

/**
 * Calculate guidance accuracy score
 * Based on whether they hit their own previous quarter's guidance
 */
function calculateGuidanceAccuracyScore(
  priorGuidanceHit: boolean | null,
  guidanceDirection?: string
): number {
  // If we don't know if they hit prior guidance
  if (priorGuidanceHit === null) {
    // Use current guidance direction as a proxy
    if (guidanceDirection === "raised") return 70;
    if (guidanceDirection === "maintained") return 50;
    if (guidanceDirection === "lowered") return 30;
    return 50; // Unknown
  }

  // If they hit prior guidance
  if (priorGuidanceHit) {
    // And they're raising guidance = very credible
    if (guidanceDirection === "raised") return 90;
    if (guidanceDirection === "maintained") return 75;
    if (guidanceDirection === "lowered") return 40; // Hit but lowering = concerning
    return 80; // Hit guidance in general = good
  }

  // If they missed prior guidance
  // And they're raising again = not credible
  if (guidanceDirection === "raised") return 30;
  if (guidanceDirection === "maintained") return 25;
  if (guidanceDirection === "lowered") return 35; // At least they're being realistic
  return 20; // Missed guidance = bad
}

/**
 * Score revenue YoY growth (0-100)
 */
function calculateRevenueGrowthScore(yoyRevenue: { current: number; prior: number }): number | null {
  if (!(yoyRevenue.prior > 0)) return null; // growth % meaningless off a non-positive base

  const growthPercent = ((yoyRevenue.current - yoyRevenue.prior) / yoyRevenue.prior) * 100;

  if (growthPercent > 30) return 95;
  if (growthPercent > 20) return 88;
  if (growthPercent > 10) return 76;
  if (growthPercent > 5) return 66;
  if (growthPercent > 2) return 58;
  if (growthPercent > -2) return 48;  // flat
  if (growthPercent > -5) return 38;
  if (growthPercent > -10) return 28;
  if (growthPercent > -20) return 18;
  return 8;
}

/**
 * Score net income level + YoY trajectory (0-100).
 * Sign matters more than percentage change (which is meaningless across sign flips).
 */
function calculateNetIncomeScore(yoyNetIncome: { current: number; prior: number }): number {
  const { current, prior } = yoyNetIncome;

  if (current > 0 && prior > 0) {
    const change = (current - prior) / prior;
    if (change > 0.25) return 90;  // profitable and growing fast
    if (change > 0.05) return 75;  // profitable and growing
    if (change > -0.05) return 60; // profitable, flat
    if (change > -0.25) return 45; // profitable but shrinking
    return 32;                     // profitable, shrinking hard
  }
  if (current > 0 && prior <= 0) return 78; // swung to profit
  if (current <= 0 && prior > 0) return 15; // swung to loss
  // Both negative: improving or worsening?
  return current > prior ? 35 : 12;
}

interface SentimentComponent {
  score: number | null;
  weight: number;
}

/**
 * Calculate composite sentiment score (0-100) using weighted components.
 * Components without data are excluded and the rest renormalized.
 *
 * @param insights Earnings insights from Claude analysis
 * @param marketData Market data (post-earnings price action, if available)
 * @param yoy Exact YoY fundamentals from SEC XBRL (revenue, net income)
 */
export function calculateCompositeSentiment(
  insights: EarningsInsights,
  marketData: MarketDataResult = {},
  yoy?: YoYComparison
) {
  const managementToneScore = calculateManagementToneScore(insights);
  const priceActionScore =
    marketData.priceChangePercent !== undefined
      ? calculatePriceActionScore(marketData.priceChangePercent)
      : null;
  const revenueGrowthScore = yoy?.revenue ? calculateRevenueGrowthScore(yoy.revenue) : null;
  const netIncomeScore = yoy?.netIncome ? calculateNetIncomeScore(yoy.netIncome) : null;

  const components: SentimentComponent[] = [
    { score: revenueGrowthScore, weight: 30 },
    { score: netIncomeScore, weight: 25 },
    { score: priceActionScore, weight: 30 },
    { score: managementToneScore, weight: 15 },
  ];

  const available = components.filter((c) => c.score !== null);
  const totalWeight = available.reduce((sum, c) => sum + c.weight, 0);
  const compositeSentimentScore = totalWeight
    ? available.reduce((sum, c) => sum + (c.score as number) * c.weight, 0) / totalWeight
    : 50;

  // Determine categorical sentiment
  let compositeSentiment: "bullish" | "neutral" | "bearish";
  if (compositeSentimentScore >= 60) {
    compositeSentiment = "bullish";
  } else if (compositeSentimentScore <= 40) {
    compositeSentiment = "bearish";
  } else {
    compositeSentiment = "neutral";
  }

  return {
    // Component scores (null = no data, excluded from composite)
    managementToneScore: Math.round(managementToneScore),
    revenueGrowthScore: revenueGrowthScore === null ? null : Math.round(revenueGrowthScore),
    netIncomeScore: netIncomeScore === null ? null : Math.round(netIncomeScore),
    priceActionScore: priceActionScore === null ? null : Math.round(priceActionScore),

    // Composite
    compositeSentimentScore: Math.round(compositeSentimentScore),
    compositeSentiment,
  };
}

/**
 * Get a human-readable explanation of the sentiment score
 */
export function getSentimentExplanation(
  compositeSentiment: "bullish" | "neutral" | "bearish",
  compositeSentimentScore: number
): string {
  if (compositeSentiment === "bullish") {
    if (compositeSentimentScore >= 80) return "Very Strong Bullish Signal";
    if (compositeSentimentScore >= 70) return "Strong Bullish Signal";
    return "Moderately Bullish";
  }

  if (compositeSentiment === "bearish") {
    if (compositeSentimentScore <= 20) return "Very Strong Bearish Signal";
    if (compositeSentimentScore <= 30) return "Strong Bearish Signal";
    return "Moderately Bearish";
  }

  return "Neutral - Mixed Signals";
}
