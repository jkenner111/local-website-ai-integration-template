import Image from "next/image";
import Link from "next/link";
import navigation from "@/content/navigation.json";
import { Nav, type NavItem } from "./Nav";

const navItems = navigation as NavItem[];
const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "My Community Site";
const siteTagline = process.env.NEXT_PUBLIC_SITE_TAGLINE ?? "";
const siteLogo = process.env.NEXT_PUBLIC_SITE_LOGO ?? "";

export function Header() {
  return (
    <header className="w-full bg-white/90 border-b border-site-border shadow-sm">
      {/* Branding row */}
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
        <div className="relative flex items-center gap-4 py-4 sm:py-5">
          <Link
            href="/"
            aria-label={`${siteName} — home`}
            className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1"
          >
            {siteLogo ? (
              <Image
                src={siteLogo}
                alt=""
                width={175}
                height={132}
                priority
                className="h-14 sm:h-20 w-auto shrink-0"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="font-site-title text-base sm:text-2xl leading-tight text-site-primary break-words">
                {siteName}
              </p>
              {siteTagline ? (
                <p className="font-site-body text-xs sm:text-sm text-site-text/70 mt-0.5">
                  {siteTagline}
                </p>
              ) : null}
            </div>
          </Link>
        </div>
      </div>

      {/* Primary nav row */}
      <div className="border-t border-site-border/60 relative">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <Nav items={navItems} />
        </div>
      </div>
    </header>
  );
}
