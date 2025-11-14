import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { COMPANIES, getCompaniesByCategory } from '@/lib/companies';
import { TrendingUp, Calendar, BarChart3 } from 'lucide-react';

export default function Home() {
  const mag7 = getCompaniesByCategory('Mag7');
  const tech = getCompaniesByCategory('Tech').filter(
    (c) => !c.category.includes('Mag7')
  );
  const biotech = getCompaniesByCategory('Biotech');
  const wsb = getCompaniesByCategory('WSB');

  return (
    <main className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
            Earnings Analyzer
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Democratizing earnings analysis for retail investors.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link href="/calendar">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <Calendar className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Earnings Calendar</CardTitle>
                <CardDescription>
                  View upcoming earnings reports
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/trends">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <TrendingUp className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Company Trends</CardTitle>
                <CardDescription>
                  Track sentiment and metrics over the last 12 quarters
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/macro">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <BarChart3 className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Macro Analysis</CardTitle>
                <CardDescription>
                  Cross-company insights on capex, deals, and more
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Companies by Category */}
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold mb-4">Magnificent 7</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {mag7.map((company) => (
                    <Link
                      key={company.ticker}
                      href={`/company/${company.ticker}`}
                    >
                      <div className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{company.ticker}</Badge>
                        </div>
                        <p className="text-sm font-medium">{company.name}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="text-3xl font-bold mb-4">High-Growth Tech</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {tech.slice(0, 12).map((company) => (
                    <Link
                      key={company.ticker}
                      href={`/company/${company.ticker}`}
                    >
                      <div className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{company.ticker}</Badge>
                        </div>
                        <p className="text-sm font-medium truncate">
                          {company.name}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-3xl font-bold mb-4">Biotech</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    {biotech.map((company) => (
                      <Link
                        key={company.ticker}
                        href={`/company/${company.ticker}`}
                      >
                        <div className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{company.ticker}</Badge>
                          </div>
                          <p className="text-sm font-medium truncate">
                            {company.name}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-4">WSB Favorites</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    {wsb.map((company) => (
                      <Link
                        key={company.ticker}
                        href={`/company/${company.ticker}`}
                      >
                        <div className="p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{company.ticker}</Badge>
                          </div>
                          <p className="text-sm font-medium truncate">
                            {company.name}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>Data powered by SEC EDGAR API • Analysis by Claude Haiku</p>
          <p className="mt-2">
            Free and open-source earnings intelligence for retail investors
          </p>
        </div>
      </div>
    </main>
  );
}
