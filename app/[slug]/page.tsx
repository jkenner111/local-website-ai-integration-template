import type { Metadata } from "next";
import { notFound } from "next/navigation";
import navigation from "@/content/navigation.json";
import { listPageSlugs, loadPage } from "@/lib/pages";
import { ComingSoon, PageRenderer } from "@/components/PageRenderer";

// Re-render on every request so MDX edits (including those pushed by the
// upcoming admin portal) appear without a container rebuild. When the admin
// portal is wired up, switch to `revalidate = 3600` + `revalidatePath()` from
// the mutation handler for better cache behavior.
export const dynamic = "force-dynamic";

type Params = { slug: string };

// Reserved slugs — routed by other files in app/, not by this catch-all.
// `events`, `calendar`, and `neighborhood-directory` have their own
// app/<slug>/page.tsx and must not be statically generated here.
const RESERVED = new Set<string>([
  "home",
  "events",
  "calendar",
]);

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "My Community Site";

function navSlugs(): string[] {
  type NavNode = { href: string; children?: NavNode[] };
  const out: string[] = [];
  const walk = (nodes: NavNode[]) => {
    for (const n of nodes) {
      const s = n.href.replace(/^\//, "").replace(/\/$/, "");
      if (s) out.push(s);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(navigation as NavNode[]);
  return out;
}

export function generateStaticParams(): Params[] {
  const fromDisk = listPageSlugs();
  const fromNav = navSlugs();
  const all = new Set<string>([...fromDisk, ...fromNav]);
  return Array.from(all)
    .filter((slug) => !RESERVED.has(slug))
    .map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = loadPage(slug);
  const title = page?.frontmatter.title?.trim();
  return {
    title: title ? `${title} — ${siteName}` : siteName,
  };
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  if (RESERVED.has(slug)) notFound();

  const page = loadPage(slug);
  if (!page) {
    // Nav references a page we haven't migrated yet — show coming-soon
    // rather than a broken link.
    if (navSlugs().includes(slug)) {
      return <ComingSoon slug={slug} />;
    }
    notFound();
  }
  return <PageRenderer page={page} />;
}
