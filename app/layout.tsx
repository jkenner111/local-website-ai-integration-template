import type { Metadata } from "next";
import { Noto_Sans, Poppins, Roboto } from "next/font/google";
import { SiteChrome } from "@/components/SiteChrome";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "My Community Site";
const siteDescription =
  process.env.NEXT_PUBLIC_SITE_DESCRIPTION ??
  "A small community website, powered by Next.js + MDX.";

export const metadata: Metadata = {
  title: siteName,
  description: siteDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${notoSans.variable} ${poppins.variable} ${roboto.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-site-body text-site-text">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
