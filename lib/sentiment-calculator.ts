import { EarningsInsights } from "@/types";
import { MarketDataResult } from "./market-data";

/**
 * Composite Sentiment Calculator
 * Calculates reality-based sentiment scores using:
 * - 10% Management tone (from earnings report analysis)
 * - 40% Earnings beat/miss (actual vs estimates)
 * - 30% Post-earnings price action (7-day movement)
 * - 20% Guidance accuracy (hitting their own targets)
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
 * Calculate composite sentiment score (0-100) using weighted components
 * @param insights Earnings insights from Claude analysis
 * @param marketData Market data (prices, estimates)
 * @returns Weighted composite score
 */
export function calculateCompositeSentiment(
  insights: EarningsInsights,
  marketData: MarketDataResult
) {
  // Calculate individual component scores
  const managementToneScore = calculateManagementToneScore(insights);
  const earningsBeatScore = calculateEarningsBeatScore(marketData.epsSurprisePercent);
  const priceActionScore = calculatePriceActionScore(marketData.priceChangePercent);
  const guidanceAccuracyScore = calculateGuidanceAccuracyScore(
    insights.priorGuidanceHit,
    insights.guidanceDirection
  );

  // Apply weights: 10% mgmt + 40% beat + 30% price + 20% guidance
  const compositeSentimentScore =
    managementToneScore * 0.10 +
    earningsBeatScore * 0.40 +
    priceActionScore * 0.30 +
    guidanceAccuracyScore * 0.20;

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
    // Component scores
    managementToneScore: Math.round(managementToneScore),
    earningsBeatScore: Math.round(earningsBeatScore),
    priceActionScore: Math.round(priceActionScore),
    guidanceAccuracyScoreWeighted: Math.round(guidanceAccuracyScore),

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
