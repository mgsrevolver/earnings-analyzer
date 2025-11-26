"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalysisResponse } from "@/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EarningsOverviewProps {
  results: AnalysisResponse;
}

export function EarningsOverview({ results }: EarningsOverviewProps) {
  // Prepare data for financial metrics chart (revenue & net income)
  const financialData = results.reports
    .slice()
    .reverse() // Show oldest to newest
    .map((report) => ({
      quarter: report.quarter,
      revenue: report.insights.revenue || 0,
      netIncome: report.insights.netIncome || 0,
    }));

  // Prepare data for guidance evolution
  const guidanceData = results.reports.slice().reverse();

  // Calculate overall trajectory and insights
  const latestReport = results.reports[0];
  const oldestReport = results.reports[results.reports.length - 1];

  const revenueGrowth =
    latestReport.insights.revenue && oldestReport.insights.revenue
      ? (
          ((latestReport.insights.revenue - oldestReport.insights.revenue) /
            oldestReport.insights.revenue) *
          100
        ).toFixed(1)
      : null;

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}B`;
    }
    return `$${value.toLocaleString()}M`;
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "bullish":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "bearish":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "bullish":
        return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400";
      case "bearish":
        return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-400";
    }
  };

  // Get score color based on value (0-100 scale)
  const getScoreColor = (score: number) => {
    if (score >= 60) return "text-green-600 dark:text-green-400";
    if (score <= 40) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const getGuidanceColor = (direction: string) => {
    switch (direction) {
      case "raised":
        return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400";
      case "lowered":
        return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400";
      case "maintained":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-400";
    }
  };

  // Custom tooltip component for dark mode support
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">{entry.name}:</span>
              <span className="text-sm font-medium text-foreground">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Generate overall analysis summary
  const generateSummary = () => {
    const sentiments = results.reports.map((r) => r.insights.overallSentiment);
    const bullishCount = sentiments.filter((s) => s === "bullish").length;
    const bearishCount = sentiments.filter((s) => s === "bearish").length;

    const guidanceDirections = results.reports.map((r) => r.insights.guidanceDirection);
    const raisedCount = guidanceDirections.filter((g) => g === "raised").length;
    const loweredCount = guidanceDirections.filter((g) => g === "lowered").length;

    let trendText = "";
    if (bullishCount > bearishCount + 1) {
      trendText = "consistently bullish";
    } else if (bearishCount > bullishCount + 1) {
      trendText = "showing bearish trends";
    } else {
      trendText = "showing mixed sentiment";
    }

    let guidanceText = "";
    if (raisedCount > 2) {
      guidanceText = "multiple guidance raises";
    } else if (loweredCount > 2) {
      guidanceText = "several guidance cuts";
    } else {
      guidanceText = "stable guidance";
    }

    return `Over the past 5 quarters, ${results.company.name} has been ${trendText} with ${guidanceText}. ${
      revenueGrowth
        ? `Revenue has ${
            parseFloat(revenueGrowth) > 0 ? "grown" : "declined"
          } ${Math.abs(parseFloat(revenueGrowth))}% during this period.`
        : ""
    } The latest quarter shows ${latestReport.insights.overallSentiment} sentiment with ${
      latestReport.insights.guidanceTone
    } tone from management.`;
  };

  // Check if we have enhanced market data for the latest report
  const hasMarketData = latestReport.insights.marketData?.compositeSentimentScore !== undefined;

  return (
    <div className="space-y-6">
      {/* Composite Sentiment Breakdown */}
      {hasMarketData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Reality-Based Sentiment Analysis</span>
              <div className="flex items-center gap-2">
                {getSentimentIcon(latestReport.insights.marketData?.compositeSentiment || "neutral")}
                <Badge className={getSentimentColor(latestReport.insights.marketData?.compositeSentiment || "neutral")}>
                  {latestReport.insights.marketData?.compositeSentiment}
                </Badge>
                <span className={`text-2xl font-bold ${getScoreColor(latestReport.insights.marketData?.compositeSentimentScore || 50)}`}>
                  {latestReport.insights.marketData?.compositeSentimentScore}/100
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Based on actual market data, not just management spin. Weighted score: 10% management tone + 40% earnings beat/miss + 30% price action + 20% guidance accuracy.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Management Tone (10%)</div>
                <div className={`text-2xl font-bold ${getScoreColor(latestReport.insights.marketData?.managementToneScore || 50)}`}>
                  {latestReport.insights.marketData?.managementToneScore || 50}
                </div>
                <div className="text-xs text-muted-foreground mt-1">From earnings report</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Earnings Beat/Miss (40%)</div>
                <div className={`text-2xl font-bold ${getScoreColor(latestReport.insights.marketData?.earningsBeatScore || 50)}`}>
                  {latestReport.insights.marketData?.earningsBeatScore || 50}
                </div>
                {latestReport.insights.marketData?.epsSurprisePercent !== undefined && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {latestReport.insights.marketData.epsSurprisePercent > 0 ? "+" : ""}
                    {latestReport.insights.marketData.epsSurprisePercent.toFixed(1)}% vs estimates
                  </div>
                )}
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">7-Day Price Action (30%)</div>
                <div className={`text-2xl font-bold ${getScoreColor(latestReport.insights.marketData?.priceActionScore || 50)}`}>
                  {latestReport.insights.marketData?.priceActionScore || 50}
                </div>
                {latestReport.insights.marketData?.priceChangePercent !== undefined && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {latestReport.insights.marketData.priceChangePercent > 0 ? "+" : ""}
                    {latestReport.insights.marketData.priceChangePercent.toFixed(1)}% post-earnings
                  </div>
                )}
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Guidance Accuracy (20%)</div>
                <div className={`text-2xl font-bold ${getScoreColor(latestReport.insights.marketData?.guidanceAccuracyScoreWeighted || 50)}`}>
                  {latestReport.insights.marketData?.guidanceAccuracyScoreWeighted || 50}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {latestReport.insights.priorGuidanceHit === true ? "Hit targets" : latestReport.insights.priorGuidanceHit === false ? "Missed targets" : "Unknown"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Metrics Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Financial Performance Trend</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
            <LineChart data={financialData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="quarter"
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
                className="sm:text-sm"
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(value) => formatCurrency(value)}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
                width={45}
                className="sm:text-sm"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => formatCurrency(value)}
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 11 }}
                width={45}
                className="sm:text-sm"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: 'hsl(var(--foreground))' }}
                iconType="line"
                iconSize={10}
                fontSize={12}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#60a5fa"
                strokeWidth={2}
                name="Revenue"
                dot={{ r: 4, fill: "#60a5fa" }}
                className="sm:stroke-[2.5]"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="netIncome"
                stroke="#34d399"
                strokeWidth={2}
                name="Net Income"
                dot={{ r: 4, fill: "#34d399" }}
                className="sm:stroke-[2.5]"
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Sentiment and Guidance badges aligned with quarters */}
          <div className="mt-6 space-y-3 overflow-x-auto">
            {/* Sentiment row - use composite if available, otherwise management tone */}
            <div className="flex items-start gap-2 sm:gap-4 min-w-[500px] sm:min-w-0">
              <div className="text-xs sm:text-sm font-semibold min-w-[80px] sm:min-w-[100px] pt-1">
                {guidanceData.some(r => r.insights.marketData?.compositeSentiment) ? "Market:" : "Sentiment:"}
              </div>
              <div className="flex justify-between flex-1 gap-1 sm:gap-2 px-2 sm:px-8">
                {guidanceData.map((report, index) => {
                  const sentiment = report.insights.marketData?.compositeSentiment || report.insights.overallSentiment;
                  const score = report.insights.marketData?.compositeSentimentScore;
                  return (
                    <div key={index} className="flex flex-col items-center gap-0.5 sm:gap-1">
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        {getSentimentIcon(sentiment)}
                        <Badge className={getSentimentColor(sentiment) + " text-[10px] sm:text-xs px-1 sm:px-2 py-0 sm:py-0.5"}>
                          {sentiment.slice(0, 4)}
                        </Badge>
                      </div>
                      {score !== undefined && (
                        <div className={`text-[10px] sm:text-xs font-semibold ${getScoreColor(score)}`}>
                          {score}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Guidance row */}
            <div className="flex items-start gap-2 sm:gap-4 min-w-[500px] sm:min-w-0">
              <div className="text-xs sm:text-sm font-semibold min-w-[80px] sm:min-w-[100px] pt-1">Guidance:</div>
              <div className="flex justify-between flex-1 gap-1 sm:gap-2 px-2 sm:px-8">
                {guidanceData.map((report, index) => (
                  <Badge key={index} className={getGuidanceColor(report.insights.guidanceDirection || "unknown") + " text-[10px] sm:text-xs px-1 sm:px-2 py-0 sm:py-0.5"}>
                    {(report.insights.guidanceDirection || "unknown").slice(0, 8)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Analysis & Outlook</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{generateSummary()}</p>

          {latestReport.insights.summary && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-semibold mb-2">Latest Quarter Highlights:</p>
              <p className="text-sm text-muted-foreground">{latestReport.insights.summary}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
