import type { EventRecord } from "@/lib/events";
import { formatEventDate, formatTimeRange } from "@/lib/events";

function EventRow({ e }: { e: EventRecord }) {
  const parts: string[] = [];
  if (e.time) parts.push(formatTimeRange(e.time, e.endTime));
  if (e.location) parts.push(e.location);
  const tail = parts.length ? ` — ${parts.join(" · ")}` : "";
  const statusBadge =
    e.status === "tentative" ? " (Tentative)"
    : e.status === "canceled" ? " (Canceled)"
    : "";
  const canceled = e.status === "canceled";
  return (
    <tr>
      <td className="whitespace-nowrap align-top">{formatEventDate(e.date)}</td>
      <td className={canceled ? "line-through opacity-60" : ""}>
        <span className="font-medium">{e.title}</span>
        {tail}
        {statusBadge && (
          <span className="ml-2 text-xs text-site-text/60">{statusBadge}</span>
        )}
      </td>
    </tr>
  );
}

export function EventsTable({
  events,
  caption,
}: {
  events: EventRecord[];
  caption: string;
}) {
  if (events.length === 0) {
    return (
      <section>
        <h3>{caption}</h3>
        <p className="italic text-site-text/60">
          No events scheduled. Check back soon.
        </p>
      </section>
    );
  }
  return (
    <section>
      <h3>{caption}</h3>
      <table>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Event</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <EventRow key={e.slug} e={e} />
          ))}
        </tbody>
      </table>
    </section>
  );
}
