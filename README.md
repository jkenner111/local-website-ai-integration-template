# local-website-ai-integration-template

A Next.js 16 + MDX + self-hosted AI admin starter for small community, HOA,
or non-profit websites.

The use case: you want a modern, statically-rendered site for a neighborhood
association, condo board, volunteer org, or small business — and you want
non-technical admins to be able to edit content in plain English through an
AI chat portal, without learning git or a CMS. The AI runs against your own
local model, so content and prompts never leave your infrastructure.

> **Status: early/reference template.** This was extracted from a working
> production site. Expect to read the code and tune it for your needs rather
> than filling in env vars and getting a finished product.

---

## What's in the box

- **Next.js 16 App Router** (TypeScript, Turbopack, `output: "standalone"`
  for slim Docker images)
- **MDX content** via `next-mdx-remote`, with frontmatter + GFM tables
- **Events system** — one MDX file per event, rendered as a chronological
  list and a FullCalendar month grid
- **Tailwind v4** with a neutral design-token namespace (`site-primary`,
  `site-text`, etc.) you can restyle in one file
- **Contact form** wired to [Resend](https://resend.com) (honeypot + zod
  validation)
- **AI admin portal** (`/admin`) — chat UI with read-only tools over
  `content/`, gated behind Cloudflare Access
- **Self-hosted deploy pipeline** — GitLab push → webhook → Docker
  rebuild, no vendor lock-in

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind v4, `@theme` tokens |
| Content | MDX + gray-matter + remark-gfm |
| Calendar | FullCalendar |
| Email | Resend |
| AI (admin portal) | Any OpenAI-compatible endpoint — vLLM, llama.cpp, Ollama, the Anthropic API, etc. |
| Admin auth | Cloudflare Access (JWT verification) |
| Deploy | Docker Compose + GitLab webhook → rebuild |

Vercel also works out of the box (the standalone Next config doesn't
interfere). Cloudflare Access is only needed for the admin portal — the
public site works without it.

---

## Repository layout

```
.
├── app/
│   ├── layout.tsx            # Root layout, fonts, SiteChrome
│   ├── page.tsx              # Home (renders content/pages/home.mdx if present)
│   ├── [slug]/page.tsx       # Dynamic MDX page renderer
│   ├── events/page.tsx       # Chronological event list
│   ├── calendar/page.tsx     # FullCalendar month view
│   ├── contact/              # Contact form UI + submit handler
│   ├── admin/                # AI admin portal (chat)
│   └── api/
│       ├── contact/          # POST — send via Resend
│       └── admin/chat/       # POST — streaming agent responses
├── components/               # Header, Nav, Footer, ContentCard, PageRenderer, …
├── content/
│   ├── pages/                # One MDX file per page route
│   ├── events/               # One MDX file per event (YYYY-MM-DD-slug.mdx)
│   └── navigation.json       # Primary nav menu
├── lib/                      # agent, agent-tools, cf-access, events, pages, users
├── public/                   # Static assets
├── deploy/                   # Docker + webhook-listener + systemd + setup guide
├── proxy.ts                  # Next middleware — admin host routing + CF Access JWT
└── .env.example              # Documented environment variables
```

---

## Quick start (local dev)

```bash
git clone <this-repo>
cd local-website-ai-integration-template
npm install
cp .env.example .env.local
# Edit .env.local — at minimum set NEXT_PUBLIC_SITE_NAME
npm run dev
```

Dev server on `http://localhost:3000`. Edits to `content/` hot-reload.

---

## Customization checklist

1. **Branding** — set `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_TAGLINE`,
   `NEXT_PUBLIC_SITE_LOGO` in `.env.local`. Drop your logo in `public/images/`.
2. **Navigation** — edit `content/navigation.json`.
3. **Pages** — add MDX files to `content/pages/<slug>.mdx`. The slug becomes
   the URL path.
4. **Events** — add MDX files to `content/events/YYYY-MM-DD-<slug>.mdx`.
5. **Design tokens** — edit the `@theme` block in `app/globals.css`. Every
   `site-*` utility class resolves through these.
6. **Contact form recipients** — set `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`,
   `CONTACT_TO_EMAILS`.
7. **AI admin** — set `LLM_BASE_URL`, `LLM_MODEL`, and if you want the portal
   public, configure Cloudflare Access (see `lib/cf-access.ts` and
   `CF_ACCESS_*` env vars). The admin user allowlist lives in `lib/users.ts`.

---

## Deploying

**Self-hosted (recommended):** see `deploy/SELF_HOST_SETUP.md` for the
full walkthrough — Docker Compose, systemd-managed webhook listener, and
GitLab push-to-deploy.

**Vercel:** works without modification. You'll want to disable the
`/admin` route or move it to a separate deployment, since Cloudflare Access
can't gate Vercel-hosted paths.

---

## License

MIT. Do whatever you want with it; attribution appreciated but not required.
