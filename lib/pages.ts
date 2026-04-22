import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const PAGES_DIR = path.join(process.cwd(), "content", "pages");

export type PageFrontmatter = {
  title?: string;
  slug?: string;
  type?: string;
  lastUpdated?: string;
  originalUrl?: string;
  status?: string;
};

export type PageData = {
  slug: string;
  frontmatter: PageFrontmatter;
  body: string;
};

export function listPageSlugs(): string[] {
  if (!fs.existsSync(PAGES_DIR)) return [];
  return fs
    .readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

export function loadPage(slug: string): PageData | null {
  const filePath = path.join(PAGES_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(raw);
  return {
    slug,
    frontmatter: data as PageFrontmatter,
    body: content,
  };
}
