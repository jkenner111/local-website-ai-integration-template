"use client";

import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import type { CalendarEventInput, EventStatus, EventType } from "@/lib/events";

type DisplayCategory = "meeting" | "event";

function categoryFor(t: EventType): DisplayCategory {
  return t === "community-event" ? "event" : "meeting";
}

// Two display categories collapsed from the three underlying types.
// Colors chosen to read on the white card background with dark text overlaid.
const CATEGORY_COLOR: Record<DisplayCategory, string> = {
  meeting: "#fcd34d", // warm amber (tailwind amber-300)
  event: "#bfdbfe",   // light blue (tailwind blue-200)
};
const EVENT_TEXT_COLOR = "#0f172a"; // slate-900, readable on both pills

type SelectedEvent = {
  title: string;
  dateLabel: string;
  timeLabel: string;
  location?: string;
  address?: string;
  type: EventType;
  status: EventStatus;
  body: string;
};

export function CalendarClient({ events }: { events: CalendarEventInput[] }) {
  const [selected, setSelected] = useState<SelectedEvent | null>(null);

  const fcEvents: EventInput[] = events.map((e) => {
    const color = CATEGORY_COLOR[categoryFor(e.extendedProps.type)];
    const extra =
      e.extendedProps.status === "canceled"
        ? ["site-event", "site-event-canceled"]
        : e.extendedProps.status === "tentative"
          ? ["site-event", "site-event-tentative"]
          : ["site-event"];
    return {
      id: e.id,
      title: e.title,
      start: e.start,
      end: e.end,
      allDay: e.allDay,
      backgroundColor: color,
      borderColor: color,
      textColor: EVENT_TEXT_COLOR,
      classNames: extra,
      extendedProps: e.extendedProps,
    };
  });

  const onEventClick = (arg: EventClickArg) => {
    const props = arg.event.extendedProps as {
      location?: string;
      address?: string;
      type: EventType;
      status: EventStatus;
      body: string;
      timeLabel: string;
    };
    const d = arg.event.start
      ? new Date(arg.event.start).toLocaleDateString("en-US", {
          timeZone: "America/New_York",
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";
    setSelected({
      title: arg.event.title,
      dateLabel: d,
      timeLabel: props.timeLabel,
      location: props.location,
      address: props.address,
      type: props.type,
      status: props.status,
      body: props.body,
    });
  };

  // Earliest event month as default so visitors land on content, not on
  // an empty month if they view the calendar mid-year before events begin.
  const initialDate = events.length > 0 ? events[0].start : undefined;

  return (
    <div className="site-calendar">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        initialDate={initialDate}
        events={fcEvents}
        eventClick={onEventClick}
        firstDay={1}
        eventDisplay="block"
        displayEventTime={false}
        height="auto"
        // Title on its own row (via CSS, see globals.css .fc-header-toolbar
        // stack rule); prev/next go in the right chunk, CSS drops them onto
        // a second centered row below the title. No "Today" button.
        headerToolbar={{
          left: "",
          center: "title",
          right: "prev,next",
        }}
        buttonText={{ prev: "Previous", next: "Next" }}
        buttonIcons={false}
        dayMaxEventRows={3}
        moreLinkText="more"
        fixedWeekCount={false}
      />
      <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm">
        <LegendSwatch color={CATEGORY_COLOR.meeting} label="Meetings" />
        <LegendSwatch color={CATEGORY_COLOR.event} label="Events" />
      </div>

      {selected && (
        <EventModal event={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block w-4 h-4 rounded-sm"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

function EventModal({
  event,
  onClose,
}: {
  event: SelectedEvent;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-event-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden />
      <div
        className="relative bg-white rounded-site-card shadow-lg max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 rounded-full hover:bg-site-bg-alt inline-flex items-center justify-center text-xl leading-none"
        >
          ×
        </button>
        <h2
          id="site-event-modal-title"
          className="font-site-heading text-2xl font-semibold text-site-primary pr-8"
        >
          {event.title}
          {event.status === "tentative" && (
            <span className="ml-2 text-sm font-normal text-site-text/60">
              (Tentative)
            </span>
          )}
          {event.status === "canceled" && (
            <span className="ml-2 text-sm font-normal text-red-700">
              (Canceled)
            </span>
          )}
        </h2>
        <dl className="mt-3 space-y-1 text-sm">
          <Row label="When">
            {event.dateLabel}
            {event.timeLabel && ` at ${event.timeLabel}`}
          </Row>
          {event.location && <Row label="Where">{event.location}</Row>}
          {event.address && (
            <Row label="Address">
              <a
                className="text-site-primary underline"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  event.address,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {event.address}
              </a>
            </Row>
          )}
          <Row label="Type">{humanizeType(event.type)}</Row>
        </dl>
        {event.body && (
          <p className="mt-4 font-site-body text-site-text whitespace-pre-line">
            {event.body}
          </p>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <dt className="font-semibold text-site-text/70 w-20 shrink-0">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function humanizeType(t: EventType): string {
  switch (t) {
    case "board-meeting": return "Board meeting";
    case "community-event": return "Community event";
    case "annual-meeting": return "Annual meeting";
  }
}
