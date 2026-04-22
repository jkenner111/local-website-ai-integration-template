const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "My Community Site";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="w-full bg-site-footer-bg text-white">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-6 text-center font-site-body text-sm">
        <p>
          © {year} {siteName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
