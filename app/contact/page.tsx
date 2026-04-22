import type { Metadata } from "next";
import { ContentCard } from "@/components/ContentCard";
import { ContactForm } from "./ContactForm";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "My Community Site";

export const metadata: Metadata = {
  title: `Contact — ${siteName}`,
  description: `Send a message to ${siteName}.`,
};

export default function ContactPage() {
  return (
    <article>
      <ContentCard>
        <h1 className="font-site-heading text-3xl sm:text-4xl font-semibold text-site-primary mb-4">
          Contact the Board
        </h1>
        <p className="font-site-body mb-6">
          Questions, concerns, or ideas? Drop us a note. Messages go to the
          board and we&rsquo;ll get back to you by email.
        </p>
        <ContactForm />
      </ContentCard>
    </article>
  );
}
