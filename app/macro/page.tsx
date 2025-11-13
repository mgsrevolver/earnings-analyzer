import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function MacroPage() {
  return (
    <main className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-4">Macro Analysis</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Cross-company insights on capex, deals, and guidance
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
              The macro analysis will provide:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>• <strong>Aggregate Trends</strong>: Average capex growth, guidance direction across all companies</li>
              <li>• <strong>Partnership Network</strong>: Which companies are working together (ecosystem map)</li>
              <li>• <strong>Sector Comparisons</strong>: Tech vs Biotech sentiment and spending</li>
              <li>• <strong>Supply Chain Signals</strong>: Are constraints easing or tightening?</li>
              <li>• <strong>AI Investment Wave</strong>: Who's spending on AI and how much?</li>
              <li>• <strong>Divergence Analysis</strong>: Which companies are outperforming their sector?</li>
              <li>• <strong>Leading Indicators</strong>: Forward-looking signals for next quarter</li>
            </ul>
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>The Power of Macro Analysis:</strong> This is the killer feature that sets
                Earnings Analyzer apart. Instead of looking at stocks in isolation, you'll see
                the interconnected picture that professional analysts use to make informed decisions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
