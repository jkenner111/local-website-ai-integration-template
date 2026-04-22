import type { ReactNode } from "react";

/**
 * Soft white card that sits on top of the site background gradient.
 * Values match the legacy WordPress site's `.entry-content` card.
 */
export function ContentCard({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white/92 rounded-site-card px-7 py-6 shadow-[0_2px_12px_rgba(60,100,130,0.10)]">
      {children}
    </div>
  );
}
