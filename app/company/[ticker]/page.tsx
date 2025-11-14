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
    <main className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="mb-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {company.ticker}
                </Badge>
                <Badge variant="secondary">
                  {company.sector}
                </Badge>
                <Badge variant="outline">
                  {company.subCategory}
                </Badge>
              </div>
              <h1 className="text-4xl font-bold mb-2">{company.name}</h1>
              <p className="text-muted-foreground">
                CIK: {company.cik}
              </p>
            </div>
            <div className="flex-shrink-0">
              <Image
                src={getCompanyLogoUrl(company.ticker)}
                alt={`${company.name} logo`}
                width={96}
                height={96}
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>

        {/* Next Earnings */}
        <div className="mb-6">
          <NextEarnings ticker={ticker.toUpperCase()} />
        </div>

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

        <EarningsAnalyzer company={company} initialData={cachedEarnings} />
      </div>
    </main>
  );
}
