import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCompanyByTicker } from "@/lib/companies";
import { ArrowLeft, ExternalLink } from "lucide-react";

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Latest Report</CardTitle>
              <CardDescription>Most recent earnings filing</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click "Analyze Earnings" to fetch and analyze the latest 4 quarters of earnings reports.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
              <CardDescription>4-quarter performance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View revenue growth, margin trends, and sentiment changes over time.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
              <CardDescription>AI-extracted metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Guidance direction, capex trends, partnerships, and more.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Earnings Reports</CardTitle>
            <CardDescription>
              Historical earnings filings and AI-powered analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                To analyze earnings reports, you'll need to set up your Anthropic API key.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Create a <code className="bg-muted px-2 py-1 rounded">.env.local</code> file with your <code className="bg-muted px-2 py-1 rounded">ANTHROPIC_API_KEY</code>
              </p>
              <Button variant="outline" asChild>
                <a
                  href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.cik}&type=&dateb=&owner=exclude&count=40`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on SEC EDGAR
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Coming Soon</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Automatic fetching and analysis of the last 4 quarters</li>
            <li>• Interactive trend visualizations</li>
            <li>• Side-by-side comparison with industry peers</li>
            <li>• Historical guidance accuracy tracking</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
