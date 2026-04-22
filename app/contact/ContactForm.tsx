"use client";

import { useState, type FormEvent } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export function ContactForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.kind === "sending") return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      subject: String(data.get("subject") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
      company: String(data.get("company") ?? ""),
    };

    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (res.ok && json.ok) {
        setStatus({ kind: "success" });
        form.reset();
      } else {
        setStatus({
          kind: "error",
          message:
            json.error ??
            "We couldn't send your message right now. Please try again.",
        });
      }
    } catch {
      setStatus({
        kind: "error",
        message: "Network error. Please check your connection and try again.",
      });
    }
  }

  if (status.kind === "success") {
    return (
      <div
        role="status"
        className="rounded border border-green-700/30 bg-green-50 p-4"
      >
        <p className="font-site-body text-green-900">
          Thanks — your message is on its way to the board. We&rsquo;ll follow
          up by email.
        </p>
        <button
          type="button"
          onClick={() => setStatus({ kind: "idle" })}
          className="mt-3 text-sm text-site-primary underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  const sending = status.kind === "sending";
  const inputCls =
    "border border-site-border rounded px-3 py-2 bg-white font-site-body";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 max-w-xl" noValidate>
      {/* Honeypot — visually hidden, tab-index removed. Real users leave blank. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden">
        <label>
          Company
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Name</span>
        <input
          type="text"
          name="name"
          required
          autoComplete="name"
          maxLength={100}
          disabled={sending}
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          maxLength={200}
          disabled={sending}
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Subject</span>
        <input
          type="text"
          name="subject"
          required
          maxLength={200}
          disabled={sending}
          className={inputCls}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Message</span>
        <textarea
          name="message"
          required
          rows={6}
          maxLength={5000}
          disabled={sending}
          className={`${inputCls} resize-y`}
        />
      </label>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={sending}
          className="bg-site-primary text-white px-4 py-2 rounded font-site-body hover:bg-site-link-hover disabled:opacity-60 self-start"
        >
          {sending ? "Sending…" : "Send message"}
        </button>
        {status.kind === "error" && (
          <p role="alert" className="text-red-700 text-sm">
            {status.message}
          </p>
        )}
      </div>
    </form>
  );
}
