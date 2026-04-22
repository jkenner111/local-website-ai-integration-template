import { NextRequest } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.email("Enter a valid email address"),
  subject: z.string().min(1, "Subject is required").max(200),
  message: z.string().min(1, "Message is required").max(5000),
  // Honeypot — real submitters leave this blank; bots tend to fill every field.
  // Accept anything; non-empty values are silently swallowed below.
  company: z.string().optional(),
});

// Lazy-init: Resend's constructor throws if the key is missing, which would
// blow up `next build` when RESEND_API_KEY isn't available at build time.
function getResend() {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

// This route is always dynamic — no build-time prerender.
export const dynamic = "force-dynamic";

function envList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(request: NextRequest) {
  const resend = getResend();
  if (!resend) {
    return Response.json(
      { ok: false, error: "Email is not configured on the server." },
      { status: 500 },
    );
  }

  const recipients = envList("CONTACT_TO_EMAILS");
  if (recipients.length === 0) {
    return Response.json(
      { ok: false, error: "No contact recipients configured." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = ContactSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return Response.json(
      { ok: false, error: first?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  // Honeypot hit — pretend success so bots don't probe for the validation path.
  if (parsed.data.company && parsed.data.company.length > 0) {
    return Response.json({ ok: true }, { status: 200 });
  }

  const { name, email, subject, message } = parsed.data;
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? "onboarding@resend.dev";
  const fromName =
    process.env.CONTACT_FROM_NAME ??
    process.env.NEXT_PUBLIC_SITE_NAME ??
    "Website Contact Form";
  const subjectPrefix = process.env.CONTACT_SUBJECT_PREFIX ?? "";

  const plain = `From: ${name} <${email}>\nSubject: ${subject}\n\n${message}`;
  const html = `
    <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
    <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    <hr/>
    <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
  `;

  const { error } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: recipients,
    replyTo: email,
    subject: subjectPrefix ? `${subjectPrefix} ${subject}` : subject,
    text: plain,
    html,
  });

  if (error) {
    console.error("Resend error:", error);
    return Response.json(
      { ok: false, error: "We couldn't send your message right now. Please try again in a moment." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true }, { status: 200 });
}
