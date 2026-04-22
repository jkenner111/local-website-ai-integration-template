import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const EVENTS_DIR = path.join(process.cwd(), "content", "events");

export type EventType =
  | "board-meeting"
  | "community-event"
  | "annual-meeting";

export type EventStatus = "confirmed" | "tentative" | "canceled";

export type EventFrontmatter = {
  title: string;
  date: string;       // ISO YYYY-MM-DD
  time?: string;      // "7:00 PM" or "19:00"
  endTime?: string;
  location?: string;
  address?: string;
  type: EventType;
  status?: EventStatus;
  canceled?: boolean; // legacy
  rsvpUrl?: string;
};

export type EventRecord = EventFrontmatter & {
  slug: string;       // filename without extension
  body: string;       // MDX body (description)
};

export function listEvents(): EventRecord[] {
  if (!fs.existsSync(EVENTS_DIR)) return [];
  const records: EventRecord[] = [];
  for (const file of fs.readdirSync(EVENTS_DIR)) {
    if (!file.endsWith(".mdx")) continue;
    const raw = fs.readFileSync(path.join(EVENTS_DIR, file), "utf8");
    const { data, content } = matter(raw);
    const fm = data as EventFrontmatter;
    if (!fm.title || !fm.date) continue; // skip malformed
    const slug = file.replace(/\.mdx$/, "");
    records.push({
      ...fm,
      slug,
      body: content.trim(),
      status: fm.canceled ? "canceled" : fm.status ?? "confirmed",
    });
  }
  // Oldest first by default.
  records.sort((a, b) => a.date.localeCompare(b.date));
  return records;
}

export function splitUpcomingPast(
  events: EventRecord[],
  reference: Date = new Date(),
) {
  const today = reference.toISOString().slice(0, 10);
  const upcoming: EventRecord[] = [];
  const past: EventRecord[] = [];
  for (const e of events) {
    if (e.date >= today) upcoming.push(e);
    else past.push(e);
  }
  past.reverse(); // most recent past first
  return { upcoming, past };
}

/**
 * Format a date string ("2026-04-18") as "Sat, Apr 18" in the Eastern
 * timezone — the intended display zone is configured via SITE_TIMEZONE
 * regardless of where the build runs.
 */
export function formatEventDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00-04:00`);
  return d.toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatTimeRange(time?: string, endTime?: string): string {
  if (!time) return "";
  if (!endTime) return time;
  return `${time} – ${endTime}`;
}

/**
 * FullCalendar-shaped event record for the calendar client component.
 * Stays pure (no Date objects) so it serializes cleanly across the
 * server → client boundary.
 */
export type CalendarEventInput = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  extendedProps: {
    location?: string;
    address?: string;
    type: EventType;
    status: EventStatus;
    body: string;
    timeLabel: string;
  };
};

export function toCalendarEvents(events: EventRecord[]): CalendarEventInput[] {
  return events.map((e) => {
    const hasTime = Boolean(e.time);
    return {
      id: e.slug,
      title: e.title,
      start: e.date,
      allDay: !hasTime,
      extendedProps: {
        location: e.location,
        address: e.address,
        type: e.type,
        status: e.status ?? "confirmed",
        body: e.body,
        timeLabel: formatTimeRange(e.time, e.endTime),
      },
    };
  });
}
