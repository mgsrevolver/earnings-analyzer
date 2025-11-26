import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function TrendsPage() {
  return (
    <main className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-4">Company Trends</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Track sentiment and metrics over the last 4 quarters
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
              This feature is currently under development
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The trends view will show:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Revenue and earnings growth over 4 quarters</li>
              <li>• Guidance direction changes (raised/lowered/maintained)</li>
              <li>• Margin trend analysis (improving/declining)</li>
              <li>• Sentiment changes (bullish → bearish or vice versa)</li>
              <li>• Capex investment trajectory</li>
              <li>• Management credibility (guidance hit rate)</li>
              <li>• Interactive charts and visualizations</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
