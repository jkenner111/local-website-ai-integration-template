import { tool } from "ai";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_ROOT = path.resolve(process.cwd(), "content");

function safeContentPath(requested: string): string | null {
  const full = path.resolve(CONTENT_ROOT, requested);
  if (full !== CONTENT_ROOT && !full.startsWith(CONTENT_ROOT + path.sep)) {
    return null;
  }
  return full;
}

export const agentTools = {
  list_events: tool({
    description:
      "List all events in content/events/ with date, title, type, location, and file path. Use this when the user asks about upcoming or past events.",
    inputSchema: z.object({}),
    execute: async () => {
      const dir = path.join(CONTENT_ROOT, "events");
      const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".mdx"));
      return files
        .map((f) => {
          const raw = fs.readFileSync(path.join(dir, f), "utf-8");
          const { data } = matter(raw);
          return {
            path: `events/${f}`,
            date: data.date ?? null,
            title: data.title ?? null,
            type: data.type ?? null,
            location: data.location ?? null,
          };
        })
        .sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")));
    },
  }),

  list_pages: tool({
    description:
      "List all MDX pages under content/pages/ with slug and title. Use this when the user asks what pages exist or wants to find a specific page.",
    inputSchema: z.object({}),
    execute: async () => {
      const dir = path.join(CONTENT_ROOT, "pages");
      const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".mdx"));
      return files.map((f) => {
        const raw = fs.readFileSync(path.join(dir, f), "utf-8");
        const { data } = matter(raw);
        return {
          slug: f.replace(/\.mdx$/, ""),
          path: `pages/${f}`,
          title: data.title ?? null,
        };
      });
    },
  }),

  read_file: tool({
    description:
      "Read a file under content/. Path must be relative to content/ root (e.g. 'pages/home.mdx' or 'events/2026-03-11-march-meeting.mdx'). Returns raw MDX including frontmatter.",
    inputSchema: z.object({
      path: z
        .string()
        .describe(
          "Path relative to content/. Must stay inside content/. Examples: 'pages/home.mdx', 'events/2026-04-08-board-meeting.mdx', 'navigation.json'.",
        ),
    }),
    execute: async ({ path: requested }) => {
      const full = safeContentPath(requested);
      if (!full) {
        return { error: "Path escapes content/ root. Refused." };
      }
      if (!fs.existsSync(full)) {
        return { error: `File not found: ${requested}` };
      }
      const raw = fs.readFileSync(full, "utf-8");
      return { path: requested, content: raw };
    },
  }),

  list_navigation: tool({
    description:
      "Return the site's top-level navigation menu from content/navigation.json.",
    inputSchema: z.object({}),
    execute: async () => {
      const file = path.join(CONTENT_ROOT, "navigation.json");
      const raw = fs.readFileSync(file, "utf-8");
      return JSON.parse(raw);
    },
  }),
};
