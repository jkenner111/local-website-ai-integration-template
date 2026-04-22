import { loadPage } from "@/lib/pages";
import { PageRenderer } from "@/components/PageRenderer";

export const dynamic = "force-dynamic";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "My Community Site";

export default function Home() {
  const page = loadPage("home");
  if (!page) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-site-heading font-semibold text-site-text">
            {siteName}
          </h1>
          <p className="mt-3 font-site-body text-site-text/80">
            Site coming soon.
          </p>
        </div>
      </div>
    );
  }
  return <PageRenderer page={page} />;
}
