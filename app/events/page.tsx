import type { Metadata } from "next";
import { ContentCard } from "@/components/ContentCard";
import { EventsTable } from "@/components/EventsTable";
import { listEvents, splitUpcomingPast } from "@/lib/events";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "My Community Site";

export const metadata: Metadata = {
  title: `Events — ${siteName}`,
};

export const dynamic = "force-dynamic";

export default function EventsPage() {
  const events = listEvents();
  const { upcoming, past } = splitUpcomingPast(events);
  return (
    <article>
      <ContentCard>
        <h1 className="font-site-heading text-3xl sm:text-4xl font-semibold text-site-primary mb-6">
          Events
        </h1>
        <div className="prose-site">
          <p>
            Upcoming and recent events. Dates and times are subject to change —
            check back for updates.
          </p>
          <EventsTable events={upcoming} caption="Upcoming Events" />
          {past.length > 0 && (
            <EventsTable events={past} caption="Past Events" />
          )}
          <p>
            Prefer a month-grid view? See the{" "}
            <a href="/calendar">calendar</a>.
          </p>
        </div>
      </ContentCard>
    </article>
  );
}
