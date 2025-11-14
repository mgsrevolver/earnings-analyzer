'use client';

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
} from 'lucide-react';
import { Company, AnalysisResponse } from '@/types';
import { EarningsOverview } from './earnings-overview';
import { CompanySummary } from './company-summary';

interface EarningsAnalyzerProps {
  company: Company;
  initialData?: AnalysisResponse | null;
}

export function EarningsAnalyzer({
  company,
  initialData,
}: EarningsAnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResponse | null>(
    initialData || null
  );

  const analyzeEarnings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analyze/${company.ticker}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze earnings');
      }

      const data: AnalysisResponse = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'bearish':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400';
      case 'bearish':
        return 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-950 dark:text-gray-400';
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null) return 'N/A';

    // If 1 billion or more, show in billions
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(2)}B`;
    }

    // Otherwise show in millions
    return `$${amount.toLocaleString()}M`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Earnings Analysis</CardTitle>
        <CardDescription>
          AI-powered analysis using Claude Haiku
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!results && !loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-6">
              Fetch and analyze the latest earnings reports from SEC EDGAR. This
              will extract key insights including guidance, capex trends,
              partnerships, and sentiment analysis.
            </p>
            <Button onClick={analyzeEarnings} size="lg">
              Analyze Earnings History
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Analyzes last ~3 years of quarterly reports
            </p>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">
              Fetching and analyzing earnings reports...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This may take 30-60 seconds
            </p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={analyzeEarnings} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {results && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Analyzed {results.successfulAnalyses} of{' '}
                  {results.totalFetched} reports
                </p>
              </div>
              <Button onClick={analyzeEarnings} variant="outline" size="sm">
                Force Re-Analyze
              </Button>
            </div>

            {results.successfulAnalyses > 0 && (
              <>
                <CompanySummary results={results} />
                <EarningsOverview results={results} />

                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Quarterly Reports</CardTitle>
                    <CardDescription>
                      In-depth analysis of each quarter's earnings filing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {results.reports.map((report, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">
                                  {report.quarter}
                                </CardTitle>
                                <CardDescription>
                                  {report.filing.form} • Filed{' '}
                                  {new Date(
                                    report.filing.filingDate
                                  ).toLocaleDateString()}
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-2">
                                {getSentimentIcon(
                                  report.insights.overallSentiment
                                )}
                                <Badge
                                  className={getSentimentColor(
                                    report.insights.overallSentiment
                                  )}
                                >
                                  {report.insights.overallSentiment}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <h4 className="font-semibold mb-2">Summary</h4>
                              <p className="text-sm text-muted-foreground">
                                {report.insights.summary}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Revenue
                                </p>
                                <p className="text-lg font-semibold">
                                  {formatCurrency(report.insights.revenue)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Net Income
                                </p>
                                <p className="text-lg font-semibold">
                                  {formatCurrency(report.insights.netIncome)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Guidance
                                </p>
                                <Badge variant="outline">
                                  {report.insights.guidanceDirection ||
                                    'unknown'}
                                </Badge>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Tone
                                </p>
                                <Badge variant="outline">
                                  {report.insights.guidanceTone || 'unknown'}
                                </Badge>
                              </div>
                            </div>

                            {report.insights.capexAmount && (
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  Capex
                                </p>
                                <p className="text-sm font-medium">
                                  {formatCurrency(report.insights.capexAmount)}
                                  {report.insights.capexGrowth && (
                                    <span className="text-xs text-muted-foreground ml-2">
                                      (
                                      {report.insights.capexGrowth > 0
                                        ? '+'
                                        : ''}
                                      {report.insights.capexGrowth}% YoY)
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}

                            {report.insights.partnerships &&
                              report.insights.partnerships.length > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Partnerships
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {report.insights.partnerships.map(
                                      (partner, i) => (
                                        <Badge
                                          key={i}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {partner}
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                            {report.insights.keyQuotes &&
                              report.insights.keyQuotes.length > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-2">
                                    Key Quotes
                                  </p>
                                  <div className="space-y-2">
                                    {report.insights.keyQuotes.map(
                                      (quote, i) => (
                                        <p
                                          key={i}
                                          className="text-sm italic border-l-2 border-primary pl-3"
                                        >
                                          "{quote}"
                                        </p>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                            <div className="pt-2">
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={report.filing.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View Original Filing
                                  <ExternalLink className="ml-2 h-3 w-3" />
                                </a>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {results.successfulAnalyses === 0 && (
              <div className="p-6 border-2 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                  API Credits Required
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                  Your Anthropic API key doesn't have enough credits. The
                  earnings reports were fetched successfully, but the AI
                  analysis requires credits.
                </p>
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-100">
                    To fix this:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-amber-800 dark:text-amber-200">
                    <li>
                      Go to{' '}
                      <a
                        href="https://console.anthropic.com/settings/plans"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-amber-900 dark:hover:text-amber-100"
                      >
                        console.anthropic.com/settings/plans
                      </a>
                    </li>
                    <li>Add credits to your account (minimum $5)</li>
                    <li>Come back and click "Refresh Analysis"</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
