import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCompanyByTicker } from "@/lib/companies";
import { EarningsAnalyzer } from "@/components/earnings-analyzer";
import { getCachedEarnings } from "@/lib/earnings-cache";
import { getSectorComparison } from "@/lib/macro";
import { SectorComparison } from "@/components/sector-comparison";
import { NextEarnings } from "@/components/next-earnings";
import { getCompanyLogoUrl } from "@/lib/logos";
import { PinnedHeader } from "@/components/pinned-header";
import { ArrowLeft } from "lucide-react";
import { join } from "path";

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const company = getCompanyByTicker(ticker.toUpperCase());

  if (!company) {
    notFound();
  }

  // Load cached earnings data
  const cachedEarnings = getCachedEarnings(ticker);

  // Load sector comparison
  const dataDir = join(process.cwd(), "data", "earnings");
  const sectorComparison = getSectorComparison(ticker.toUpperCase(), dataDir);

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-background">
      <PinnedHeader company={company} results={cachedEarnings} />
      <div className="max-w-7xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4 sm:mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>

        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6">
            <div className="flex-1 w-full">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <Badge variant="outline" className="text-base sm:text-lg px-2 sm:px-3 py-0.5 sm:py-1">
                  {company.ticker}
                </Badge>
                <Badge variant="secondary" className="text-xs sm:text-sm">
                  {company.sector}
                </Badge>
                <Badge variant="outline" className="text-xs sm:text-sm">
                  {company.subCategory}
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold mb-2">{company.name}</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                CIK: {company.cik}
              </p>
            </div>
            <div className="flex-shrink-0 self-center sm:self-start">
              <Image
                src={getCompanyLogoUrl(company.ticker)}
                alt={`${company.name} logo`}
                width={64}
                height={64}
                className="rounded-lg shadow-lg sm:w-24 sm:h-24"
              />
            </div>
          </div>
        </div>

        {/* Next Earnings */}
        <div className="mb-6">
          <NextEarnings ticker={ticker.toUpperCase()} />
        </div>

        <EarningsAnalyzer company={company} initialData={cachedEarnings} />

        {/* Sector Comparison */}
        {sectorComparison && (
          <SectorComparison
            ticker={ticker.toUpperCase()}
            company={sectorComparison.company}
            companyMetrics={sectorComparison.companyMetrics}
            sectorAverages={sectorComparison.sectorAverages}
            subCategoryAverages={sectorComparison.subCategoryAverages}
            ranking={sectorComparison.ranking}
          />
        )}
      </div>
    </main>
  );
}
