import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp } from "lucide-react";
import { getCompanyNextEarnings, formatEarningsDate } from "@/lib/earnings-calendar";

interface NextEarningsProps {
  ticker: string;
}

export function NextEarnings({ ticker }: NextEarningsProps) {
  const nextEarnings = getCompanyNextEarnings(ticker);

  if (!nextEarnings) {
    return null;
  }

  return (
    <Card className="border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              Next Earnings Report
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Estimated based on historical filing patterns
            </CardDescription>
          </div>
          <Link href="/calendar">
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
              View Calendar
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline gap-2 sm:gap-3">
            <div className="text-xl sm:text-2xl font-bold">
              {formatEarningsDate(nextEarnings.date)}
            </div>
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              Estimated
            </Badge>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{nextEarnings.reportType}</span>
            </div>
            {nextEarnings.fiscalQuarter && (
              <div>
                FQ{nextEarnings.fiscalQuarter} {nextEarnings.fiscalYear}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              This date is an estimate based on the company's typical quarterly filing schedule.
              The actual filing date may vary.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
