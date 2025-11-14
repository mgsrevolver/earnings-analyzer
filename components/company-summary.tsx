"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalysisResponse } from "@/types";
import { TrendingUp, TrendingDown } from "lucide-react";
import { getCompaniesByCategory } from "@/lib/companies";

interface CompanySummaryProps {
  results: AnalysisResponse;
}

export function CompanySummary({ results }: CompanySummaryProps) {
  // Get the reports (sorted newest to oldest)
  const latestQuarter = results.reports[0];
  const previousQuarter = results.reports[1];
  const yearAgoQuarter = results.reports[4]; // 4 quarters ago

  if (!latestQuarter?.insights) {
    return null;
  }

  // Calculate QoQ growth rates
  const calculateGrowth = (current: number | null | undefined, previous: number | null | undefined) => {
    if (!current || !previous) return null;
    return ((current - previous) / previous) * 100;
  };

  const revenueQoQ = calculateGrowth(latestQuarter.insights.revenue, previousQuarter?.insights.revenue);
  const revenueYoY = calculateGrowth(latestQuarter.insights.revenue, yearAgoQuarter?.insights.revenue);
  const netIncomeQoQ = calculateGrowth(latestQuarter.insights.netIncome, previousQuarter?.insights.netIncome);
  const netIncomeYoY = calculateGrowth(latestQuarter.insights.netIncome, yearAgoQuarter?.insights.netIncome);

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return "N/A";
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}B`;
    }
    return `$${value.toLocaleString()}M`;
  };

  const formatGrowth = (value: number | null) => {
    if (value === null) return "N/A";
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const getGrowthIcon = (value: number | null) => {
    if (value === null) return null;
    return value >= 0
      ? <TrendingUp className="h-4 w-4 text-green-500" />
      : <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getGrowthColor = (value: number | null) => {
    if (value === null) return "text-gray-500 dark:text-gray-400";
    return value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  };

  // Use composite sentiment if available, otherwise use management tone
  const displaySentiment = latestQuarter.insights.marketData?.compositeSentiment || latestQuarter.insights.overallSentiment;
  const sentimentScore = latestQuarter.insights.marketData?.compositeSentimentScore;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Performance Summary - {latestQuarter.quarter}</span>
          <div className="flex gap-2">
            <Badge className={
              displaySentiment === "bullish"
                ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400"
                : displaySentiment === "bearish"
                ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400"
                : "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-400"
            }>
              {displaySentiment}
              {sentimentScore !== undefined && ` (${sentimentScore})`}
            </Badge>
            {latestQuarter.insights.guidanceDirection && (
              <Badge variant="outline">
                {latestQuarter.insights.guidanceDirection}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Revenue Section */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-muted-foreground">Revenue</div>
            <div className="text-3xl font-bold">
              {formatCurrency(latestQuarter.insights.revenue)}
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">QoQ:</span>
                {getGrowthIcon(revenueQoQ)}
                <span className={`font-semibold ${getGrowthColor(revenueQoQ)}`}>
                  {formatGrowth(revenueQoQ)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">YoY:</span>
                {getGrowthIcon(revenueYoY)}
                <span className={`font-semibold ${getGrowthColor(revenueYoY)}`}>
                  {formatGrowth(revenueYoY)}
                </span>
              </div>
            </div>
          </div>

          {/* Net Income Section */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-muted-foreground">Net Income</div>
            <div className="text-3xl font-bold">
              {formatCurrency(latestQuarter.insights.netIncome)}
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">QoQ:</span>
                {getGrowthIcon(netIncomeQoQ)}
                <span className={`font-semibold ${getGrowthColor(netIncomeQoQ)}`}>
                  {formatGrowth(netIncomeQoQ)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">YoY:</span>
                {getGrowthIcon(netIncomeYoY)}
                <span className={`font-semibold ${getGrowthColor(netIncomeYoY)}`}>
                  {formatGrowth(netIncomeYoY)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Peer Comparison Section */}
        <div className="mt-6 pt-6 border-t">
          <div className="text-sm font-semibold mb-3">
            Peer Comparison
          </div>
          <div className="space-y-4">
            {results.company.category.map((category) => {
              const peers = getCompaniesByCategory(category).filter(
                (p) => p.ticker !== results.company.ticker
              );

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">{category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      ({peers.length} peer{peers.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground ml-2">
                    Peers: {peers.map(p => p.ticker).join(', ')}
                  </div>
                  <div className="text-xs text-muted-foreground italic ml-2 mt-1">
                    Analyze peer companies to see comparative metrics here
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
