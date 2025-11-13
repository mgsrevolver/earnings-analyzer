import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function CalendarPage() {
  return (
    <main className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <h1 className="text-4xl font-bold mb-4">Earnings Calendar</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Upcoming earnings reports for the next 3 months
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
              The earnings calendar will show:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Expected earnings report dates for all tracked companies</li>
              <li>• Month-by-month calendar view</li>
              <li>• Company categories and filtering</li>
              <li>• Historical earnings dates</li>
              <li>• Quick links to analyze each report</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
