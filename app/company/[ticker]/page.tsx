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

        <EarningsAnalyzer company={company} />
      </div>
    </main>
  );
}
