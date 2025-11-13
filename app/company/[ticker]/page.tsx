import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCompanyByTicker } from "@/lib/companies";
import { EarningsAnalyzer } from "@/components/earnings-analyzer";
import { ArrowLeft } from "lucide-react";

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
                {company.category.map((cat) => (
                  <Badge key={cat} variant="secondary">
                    {cat}
                  </Badge>
                ))}
              </div>
              <h1 className="text-4xl font-bold mb-2">{company.name}</h1>
              <p className="text-muted-foreground">
                CIK: {company.cik}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {company.ticker.slice(0, 2)}
              </div>
            </div>
          </div>
        </div>

        <EarningsAnalyzer company={company} />
      </div>
    </main>
  );
}
