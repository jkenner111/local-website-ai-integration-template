import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { ContentCard } from "./ContentCard";
import type { PageData } from "@/lib/pages";

// MDXRemote compiles at request/build time in a RSC, so remark plugins
// have to be passed here — next.config's createMDX plugins don't apply
// to next-mdx-remote.
const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
  },
};

export function PageRenderer({ page }: { page: PageData }) {
  const title = page.frontmatter.title?.trim();
  return (
    <article>
      <ContentCard>
        {title && page.slug !== "home" ? (
          <h1 className="font-site-heading text-3xl sm:text-4xl font-semibold text-site-primary mb-6">
            {title}
          </h1>
        ) : null}
        <div className="prose-site">
          <MDXRemote source={page.body} options={mdxOptions} />
        </div>
      </ContentCard>
    </article>
  );
}

export function ComingSoon({ slug }: { slug: string }) {
  return (
    <ContentCard>
      <h1 className="font-site-heading text-3xl font-semibold text-site-primary mb-4">
        Coming soon
      </h1>
      <p className="font-site-body">
        We&rsquo;re still migrating the content for{" "}
        <code className="bg-site-bg-alt px-1 rounded">/{slug}</code>. Check back
        shortly — or use the navigation above to browse another page.
      </p>
    </ContentCard>
  );
}
