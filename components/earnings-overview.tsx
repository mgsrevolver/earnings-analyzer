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

  return (
    <div className="space-y-6">
      {/* Financial Metrics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Performance - Last 5 Quarters</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={financialData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" />
              <YAxis
                yAxisId="left"
                hide={true}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                hide={true}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={3}
                name="Revenue"
                dot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="netIncome"
                stroke="#10b981"
                strokeWidth={3}
                name="Net Income"
                dot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Sentiment and Guidance badges aligned with quarters */}
          <div className="mt-4 flex justify-between px-12">
            {guidanceData.map((report, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1">
                  {getSentimentIcon(report.insights.overallSentiment)}
                  <Badge className={getSentimentColor(report.insights.overallSentiment) + " text-xs"}>
                    {report.insights.overallSentiment}
                  </Badge>
                </div>
                <Badge className={getGuidanceColor(report.insights.guidanceDirection || "unknown") + " text-xs"}>
                  {report.insights.guidanceDirection || "unknown"}
                </Badge>
              </div>
            ))}
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
