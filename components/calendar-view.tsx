"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp } from "lucide-react";
import { getCompanyLogoUrl } from "@/lib/logos";
import { CompanyCategory } from "@/types";
import { CalendarMonth, EarningsDate } from "@/lib/earnings-calendar";

const CATEGORIES: { value: CompanyCategory | 'All'; label: string }[] = [
  { value: 'All', label: 'All Companies' },
  { value: 'Mag7', label: 'Magnificent 7' },
  { value: 'Tech', label: 'Tech' },
  { value: 'Biotech', label: 'Biotech' },
  { value: 'WSB', label: 'WSB Favorites' },
];

interface CalendarViewProps {
  calendarData: CalendarMonth[];
}

// Format date for display
function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Get month name from YYYY-MM format
function getMonthName(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function CalendarView({ calendarData }: CalendarViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<CompanyCategory | 'All'>('All');

  // Filter earnings by category
  const filteredCalendar = useMemo(() => {
    if (selectedCategory === 'All') {
      return calendarData;
    }

    return calendarData.map(month => ({
      month: month.month,
      earnings: month.earnings.filter(e => e.category.includes(selectedCategory)),
    })).filter(month => month.earnings.length > 0);
  }, [calendarData, selectedCategory]);

  const totalEarnings = useMemo(() => {
    return filteredCalendar.reduce((sum, month) => sum + month.earnings.length, 0);
  }, [filteredCalendar]);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
          <Calendar className="h-10 w-10" />
          Earnings Calendar
        </h1>
        <p className="text-xl text-muted-foreground mb-6">
          Upcoming earnings reports for the next 6 months
        </p>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(category => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.value)}
              size="sm"
            >
              {category.label}
            </Button>
          ))}
        </div>

        <div className="mt-4">
          <Badge variant="secondary" className="text-sm">
            {totalEarnings} upcoming earnings reports
          </Badge>
        </div>
      </div>

      {/* Calendar Grid */}
      {filteredCalendar.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No upcoming earnings found for the selected category.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {filteredCalendar.map(month => (
            <div key={month.month}>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                {getMonthName(month.month)}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {month.earnings.map(earning => (
                  <EarningsCard
                    key={`${earning.ticker}-${earning.date}`}
                    earning={earning}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Card */}
      <Card className="mt-8 border-blue-200 dark:border-blue-900">
        <CardHeader>
          <CardTitle className="text-sm">About Estimated Dates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Earnings dates shown are estimates based on historical quarterly filing patterns.
            Actual dates may vary. Companies typically file 10-Q (quarterly) and 10-K (annual)
            reports approximately every 90 days.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

function EarningsCard({ earning, formatDate }: { earning: EarningsDate; formatDate: (date: string) => string }) {
  return (
    <Link href={`/company/${earning.ticker}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="font-mono">
                  {earning.ticker}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {earning.reportType}
                </Badge>
              </div>
              <CardTitle className="text-lg mb-1">
                {earning.companyName}
              </CardTitle>
              <CardDescription>
                {earning.sector} • {earning.subCategory}
              </CardDescription>
            </div>
            <div className="flex-shrink-0">
              <Image
                src={getCompanyLogoUrl(earning.ticker)}
                alt={`${earning.companyName} logo`}
                width={48}
                height={48}
                className="rounded-lg"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{formatDate(earning.date)}</span>
            </div>
            {earning.isEstimated && (
              <Badge variant="outline" className="text-xs">
                Estimated
              </Badge>
            )}
            {earning.fiscalQuarter && (
              <div className="text-xs text-muted-foreground">
                FQ{earning.fiscalQuarter} {earning.fiscalYear}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
