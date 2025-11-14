'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Company, AnalysisResponse } from '@/types';
import { getCompanyLogoUrl } from '@/lib/logos';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PinnedHeaderProps {
  company: Company;
  results: AnalysisResponse | null;
}

export function PinnedHeader({ company, results }: PinnedHeaderProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show header after scrolling down 200px
      setIsVisible(window.scrollY > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!results || results.reports.length === 0) {
    return null;
  }

  // Get the latest quarter data
  const latestReport = results.reports[0];
  const insights = latestReport.insights;

  // Calculate QoQ and YoY changes for both revenue and net income
  const getChanges = (metricName: 'revenue' | 'netIncome') => {
    const current = insights[metricName];

    // QoQ
    let qoq = null;
    if (results.reports.length >= 2) {
      const previous = results.reports[1].insights[metricName];
      if (current && previous) {
        qoq = ((current - previous) / previous) * 100;
      }
    }

    // YoY
    let yoy = null;
    if (results.reports.length >= 5) {
      const yearAgo = results.reports[4].insights[metricName];
      if (current && yearAgo) {
        yoy = ((current - yearAgo) / yearAgo) * 100;
      }
    }

    return { qoq, yoy };
  };

  const revenueChanges = getChanges('revenue');
  const incomeChanges = getChanges('netIncome');

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null) return 'N/A';

    // Round to nearest whole number and format
    const rounded = Math.round(amount);

    // If 1 billion or more, show in billions
    if (rounded >= 1000) {
      return `$${Math.round(rounded / 1000)}B`;
    }

    // Otherwise show in millions
    return `$${rounded.toLocaleString()}M`;
  };

  const formatChange = (change: number | null) => {
    if (change === null) return null;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${Math.round(change)}%`;
  };

  const getChangeIcon = (change: number | null) => {
    if (change === null) return <Minus className="h-3 w-3" />;
    if (change > 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3" />;
  };

  const getChangeColor = (change: number | null) => {
    if (change === null) return 'text-gray-500';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-b shadow-sm transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="max-w-7xl mx-auto px-8 py-3">
        <div className="flex items-center justify-between gap-6">
          {/* Company Info */}
          <div className="flex items-center gap-4">
            <Image
              src={getCompanyLogoUrl(company.ticker)}
              alt={`${company.name} logo`}
              width={40}
              height={40}
              className="rounded"
            />
            <div>
              <h2 className="font-bold text-lg">{company.name}</h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {company.ticker}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {latestReport.quarter}
                </span>
              </div>
            </div>
          </div>

          {/* Latest Quarter Metrics */}
          <div className="flex items-center gap-8">
            {/* Revenue */}
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                <p className="font-semibold text-2xl">{formatCurrency(insights.revenue)}</p>
              </div>
              <div className="flex flex-col gap-1">
                {revenueChanges.qoq !== null && (
                  <div className="flex items-center gap-1">
                    {getChangeIcon(revenueChanges.qoq)}
                    <span className={`text-xs font-medium ${getChangeColor(revenueChanges.qoq)}`}>
                      {formatChange(revenueChanges.qoq)} QoQ
                    </span>
                  </div>
                )}
                {revenueChanges.yoy !== null && (
                  <div className="flex items-center gap-1">
                    {getChangeIcon(revenueChanges.yoy)}
                    <span className={`text-xs font-medium ${getChangeColor(revenueChanges.yoy)}`}>
                      {formatChange(revenueChanges.yoy)} YoY
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Net Income */}
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Net Income</p>
                <p className="font-semibold text-2xl">{formatCurrency(insights.netIncome)}</p>
              </div>
              <div className="flex flex-col gap-1">
                {incomeChanges.qoq !== null && (
                  <div className="flex items-center gap-1">
                    {getChangeIcon(incomeChanges.qoq)}
                    <span className={`text-xs font-medium ${getChangeColor(incomeChanges.qoq)}`}>
                      {formatChange(incomeChanges.qoq)} QoQ
                    </span>
                  </div>
                )}
                {incomeChanges.yoy !== null && (
                  <div className="flex items-center gap-1">
                    {getChangeIcon(incomeChanges.yoy)}
                    <span className={`text-xs font-medium ${getChangeColor(incomeChanges.yoy)}`}>
                      {formatChange(incomeChanges.yoy)} YoY
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
