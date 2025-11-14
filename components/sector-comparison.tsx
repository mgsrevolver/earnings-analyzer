"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";

interface SectorComparisonProps {
  ticker: string;
  company: any;
  companyMetrics: any;
  sectorAverages: {
    capexGrowth: number | null;
    revenue: number | null;
  };
  subCategoryAverages: {
    capexGrowth: number | null;
    revenue: number | null;
  };
  ranking: {
    inSector: number;
    totalInSector: number;
    inSubCategory: number;
    totalInSubCategory: number;
  };
}

export function SectorComparison({
  ticker,
  company,
  companyMetrics,
  sectorAverages,
  subCategoryAverages,
  ranking,
}: SectorComparisonProps) {
  const formatNumber = (num: number | null) => {
    if (num === null || isNaN(num)) return "N/A";
    return num.toLocaleString();
  };

  const formatPercentage = (num: number | null) => {
    if (num === null || isNaN(num)) return "N/A";
    return `${num.toFixed(1)}%`;
  };

  const getComparisonBadge = (value: number | null, average: number | null) => {
    if (value === null || average === null || isNaN(value) || isNaN(average)) {
      return null;
    }

    const diff = ((value - average) / average) * 100;
    const isAbove = diff > 5;
    const isBelow = diff < -5;

    if (!isAbove && !isBelow) {
      return <Badge variant="secondary">At average</Badge>;
    }

    return isAbove ? (
      <Badge variant="default" className="bg-green-600">
        <TrendingUp className="h-3 w-3 mr-1" />
        {diff.toFixed(0)}% above avg
      </Badge>
    ) : (
      <Badge variant="destructive">
        <TrendingDown className="h-3 w-3 mr-1" />
        {Math.abs(diff).toFixed(0)}% below avg
      </Badge>
    );
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Sector Comparison</CardTitle>
        <CardDescription>
          How {ticker} performs vs {company.sector} sector and {company.subCategory} peers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Ranking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Sector Ranking ({company.sector})
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">#{ranking.inSector}</span>
                <span className="text-sm text-muted-foreground">
                  of {ranking.totalInSector}
                </span>
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Category Ranking ({company.subCategory})
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">#{ranking.inSubCategory}</span>
                <span className="text-sm text-muted-foreground">
                  of {ranking.totalInSubCategory}
                </span>
              </div>
            </div>
          </div>

          {/* Metrics Comparison */}
          <div className="space-y-4">
            <h3 className="font-semibold">Key Metrics vs Averages</h3>

            {/* Revenue */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Revenue (Quarterly)</span>
                {getComparisonBadge(companyMetrics.revenue, subCategoryAverages.revenue)}
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{ticker}</p>
                  <p className="font-semibold">
                    ${formatNumber(companyMetrics.revenue)}M
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{company.subCategory} Avg</p>
                  <p className="font-semibold">
                    ${formatNumber(subCategoryAverages.revenue)}M
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{company.sector} Avg</p>
                  <p className="font-semibold">
                    ${formatNumber(sectorAverages.revenue)}M
                  </p>
                </div>
              </div>
            </div>

            {/* Capex Growth */}
            {companyMetrics.capexGrowth != null && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Capex Growth (YoY)</span>
                  {getComparisonBadge(
                    companyMetrics.capexGrowth,
                    subCategoryAverages.capexGrowth
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{ticker}</p>
                    <p className="font-semibold">
                      {formatPercentage(companyMetrics.capexGrowth)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{company.subCategory} Avg</p>
                    <p className="font-semibold">
                      {formatPercentage(subCategoryAverages.capexGrowth)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{company.sector} Avg</p>
                    <p className="font-semibold">
                      {formatPercentage(sectorAverages.capexGrowth)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sentiment */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Overall Sentiment</span>
                <Badge
                  variant={
                    companyMetrics.overallSentiment === "bullish"
                      ? "default"
                      : companyMetrics.overallSentiment === "bearish"
                      ? "destructive"
                      : "secondary"
                  }
                  className={
                    companyMetrics.overallSentiment === "bullish"
                      ? "bg-green-600"
                      : ""
                  }
                >
                  {companyMetrics.overallSentiment}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Guidance: {companyMetrics.guidanceDirection}
                {companyMetrics.guidanceTone && ` • Tone: ${companyMetrics.guidanceTone}`}
              </p>
            </div>
          </div>

          {/* Link to macro analysis */}
          <div className="pt-4 border-t">
            <Link href="/macro">
              <Button variant="outline" className="w-full">
                View Full Sector Analysis →
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Button({ variant, className, children, ...props }: any) {
  return (
    <button
      className={`px-4 py-2 rounded-md font-medium transition-colors ${
        variant === "outline"
          ? "border border-gray-300 hover:bg-gray-100"
          : "bg-blue-600 text-white hover:bg-blue-700"
      } ${className || ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
