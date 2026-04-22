import type { Metadata } from "next";
import { ContentCard } from "@/components/ContentCard";
import { CalendarClient } from "@/components/CalendarClient";
import { listEvents, toCalendarEvents } from "@/lib/events";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "My Community Site";

export const metadata: Metadata = {
  title: `Calendar — ${siteName}`,
};

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  const events = toCalendarEvents(listEvents());
  return (
    <article>
      <ContentCard>
        <h1 className="font-site-heading text-3xl sm:text-4xl font-semibold text-site-primary mb-6">
          Calendar
        </h1>
        <p className="font-site-body mb-6">
          Click any event to see details. For a chronological list, see the{" "}
          <a className="underline text-site-primary hover:text-site-link-hover" href="/events">
            Events page
          </a>
          .
        </p>
        <CalendarClient events={events} />
      </ContentCard>
    </article>
  );
}
