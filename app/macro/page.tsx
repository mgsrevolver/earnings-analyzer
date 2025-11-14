import Link from "next/link";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, Users, Zap } from "lucide-react";
import { MacroAnalysis } from "@/types";

function loadMacroAnalysis(): MacroAnalysis | null {
  const macroPath = join(process.cwd(), "data", "macro", "latest.json");
  if (!existsSync(macroPath)) {
    return null;
  }

  try {
    const data = readFileSync(macroPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load macro analysis:", error);
    return null;
  }
}

export default function MacroPage() {
  const macro = loadMacroAnalysis();

  if (!macro) {
    return (
      <main className="min-h-screen p-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <Link href="/">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <h1 className="text-4xl font-bold mb-4">Macro Analysis</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Cross-company insights on capex, deals, and guidance
          </p>

          <Card>
            <CardHeader>
              <CardTitle>No Data Available</CardTitle>
              <CardDescription>
                Run the batch analysis script to generate macro insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                To generate macro analysis data, run:
              </p>
              <code className="block p-4 bg-muted rounded-lg text-sm">
                npm run analyze-all
              </code>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const insights = macro.aggregateInsights;
  const totalGuidance =
    insights.companiesRaisingGuidance + insights.companiesLoweringGuidance;
  const guidanceRatio =
    totalGuidance > 0
      ? (insights.companiesRaisingGuidance / totalGuidance) * 100
      : 50;

  return (
    <main className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Macro Analysis</h1>
          <p className="text-xl text-muted-foreground">
            {macro.period} • {macro.companies.length} companies analyzed
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Market Sentiment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {insights.overallMarketSentiment === "bullish" ? (
                  <TrendingUp className="h-6 w-6 text-green-500" />
                ) : insights.overallMarketSentiment === "bearish" ? (
                  <TrendingDown className="h-6 w-6 text-red-500" />
                ) : (
                  <div className="h-6 w-6" />
                )}
                <span className="text-2xl font-bold capitalize">
                  {insights.overallMarketSentiment}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Capex Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {insights.averageCapexGrowth.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Guidance Direction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-600">Raised</span>
                  <span className="text-lg font-bold text-green-600">
                    {insights.companiesRaisingGuidance}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-red-600">Lowered</span>
                  <span className="text-lg font-bold text-red-600">
                    {insights.companiesLoweringGuidance}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                AI Investment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Zap className="h-6 w-6 text-yellow-500" />
                <p className="text-2xl font-bold">
                  {insights.aiInvestmentCount}
                  <span className="text-sm text-muted-foreground ml-1">
                    companies
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Themes */}
        {macro.topThemes.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Key Themes</CardTitle>
              <CardDescription>
                Dominant trends across the market
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {macro.topThemes.map((theme, idx) => (
                  <Badge key={idx} variant="secondary" className="text-sm">
                    {theme}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leading Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Headcount Trends</CardTitle>
              <CardDescription>Workforce expansion signals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(insights.headcountTrends).map(
                  ([trend, count]) => (
                    <div key={trend} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{trend}</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 bg-primary rounded-full"
                          style={{
                            width: `${(count / macro.companies.length) * 100}px`,
                          }}
                        />
                        <span className="text-sm font-medium w-8">{count}</span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Supply Chain Status</CardTitle>
              <CardDescription>Constraint signals across sectors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(insights.supplyChainSentiment).map(
                  ([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{status}</span>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 rounded-full ${
                            status === "tight"
                              ? "bg-red-500"
                              : status === "easing"
                              ? "bg-green-500"
                              : "bg-blue-500"
                          }`}
                          style={{
                            width: `${(count / macro.companies.length) * 100}px`,
                          }}
                        />
                        <span className="text-sm font-medium w-8">{count}</span>
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Partnership Network */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Partnership Network</CardTitle>
            <CardDescription>
              Most mentioned partners across earnings reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.partnershipNetwork.slice(0, 10).map((p) => (
                <div key={p.partner} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{p.partner}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {p.mentions} mentions
                    </span>
                    <div className="flex gap-1">
                      {p.connectedCompanies.slice(0, 5).map((ticker) => (
                        <Link key={ticker} href={`/company/${ticker}`}>
                          <Badge variant="outline" className="text-xs">
                            {ticker}
                          </Badge>
                        </Link>
                      ))}
                      {p.connectedCompanies.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{p.connectedCompanies.length - 5}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sector Comparisons */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Sector Breakdown</CardTitle>
            <CardDescription>
              Performance metrics by sector and category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {macro.sectorAnalyses.map((sector) => (
                <div key={`${sector.sector}-${sector.subCategory}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{sector.sector}</h3>
                      <p className="text-sm text-muted-foreground">
                        {sector.subCategory} • {sector.companies.length} companies
                      </p>
                    </div>
                    <Badge
                      variant={
                        sector.averageSentiment > 0.3
                          ? "default"
                          : sector.averageSentiment < -0.3
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {sector.averageSentiment > 0.3
                        ? "Bullish"
                        : sector.averageSentiment < -0.3
                        ? "Bearish"
                        : "Neutral"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Avg Capex Growth</p>
                      <p className="font-semibold">
                        {sector.averageCapexGrowth.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">AI Investment</p>
                      <p className="font-semibold">
                        {sector.aiInvestmentPercentage.toFixed(0)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Guidance</p>
                      <p className="font-semibold text-green-600">
                        ↑{sector.guidanceSentiment.raised}
                      </p>
                      <p className="font-semibold text-red-600">
                        ↓{sector.guidanceSentiment.lowered}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Companies</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sector.companies.slice(0, 3).map((ticker) => (
                          <Link key={ticker} href={`/company/${ticker}`}>
                            <Badge variant="outline" className="text-xs">
                              {ticker}
                            </Badge>
                          </Link>
                        ))}
                        {sector.companies.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{sector.companies.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Divergences */}
        {macro.divergences.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Divergence Analysis</CardTitle>
              <CardDescription>
                Winners and losers across key metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {macro.divergences.map((div, idx) => (
                  <div key={idx} className="border-b last:border-0 pb-4 last:pb-0">
                    <h3 className="font-semibold mb-2">{div.theme}</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {div.details}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-green-600 mb-2">
                          Outperformers
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {div.winners.map((ticker) => (
                            <Link key={ticker} href={`/company/${ticker}`}>
                              <Badge variant="outline" className="text-xs">
                                {ticker}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-red-600 mb-2">
                          Underperformers
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {div.losers.map((ticker) => (
                            <Link key={ticker} href={`/company/${ticker}`}>
                              <Badge variant="outline" className="text-xs">
                                {ticker}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
