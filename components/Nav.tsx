"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type NavItem = {
  title: string;
  href: string;
  children?: NavItem[];
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Nav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu when the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <nav aria-label="Primary" className="w-full">
      <div className="flex items-center justify-between md:justify-center">
        <button
          type="button"
          aria-controls="primary-menu"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex flex-col justify-center items-center gap-[5px] w-10 h-10 text-site-text"
        >
          <span
            className={`block h-0.5 w-6 bg-current transition-transform ${
              open ? "translate-y-[7px] rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-current transition-opacity ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-current transition-transform ${
              open ? "-translate-y-[7px] -rotate-45" : ""
            }`}
          />
        </button>

        <ul
          id="primary-menu"
          className={`
            ${open ? "flex" : "hidden"} md:flex
            absolute md:static left-0 right-0 top-full md:top-auto
            flex-col md:flex-row md:items-center md:justify-center
            gap-0 md:gap-8
            bg-white/95 md:bg-transparent
            border-t border-site-border md:border-0
            shadow-md md:shadow-none
            z-50
          `}
        >
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href} className="border-b border-site-border/50 md:border-0">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`
                    block px-6 py-3 md:p-0
                    font-site-body text-base
                    text-site-text hover:text-site-link-hover
                    transition-colors
                    ${active ? "font-semibold text-site-link-hover" : ""}
                  `}
                >
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
