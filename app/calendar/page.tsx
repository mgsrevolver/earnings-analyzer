import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getEarningsCalendar } from "@/lib/earnings-calendar";
import { CalendarView } from "@/components/calendar-view";

export default function CalendarPage() {
  // Get calendar data on server
  const calendarData = getEarningsCalendar(6);

  return (
    <main className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <CalendarView calendarData={calendarData} />
      </div>
    </main>
  );
}
