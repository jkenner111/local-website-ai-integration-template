import { headers } from "next/headers";
import Link from "next/link";
import { findUserByEmail } from "@/lib/users";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Site";

export const metadata = {
  title: `${siteName} Editor`,
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const email = h.get("x-admin-email");
  const user = email ? findUserByEmail(email) : null;

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-gray-900">
            Not authorized
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            {email ? (
              <>
                <code className="font-mono">{email}</code> is not on the admin
                list. Contact the site owner if you should have access.
              </>
            ) : (
              "No identity was passed through. Cloudflare Access may not be configured yet."
            )}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/admin" className="font-semibold">
            {siteName} Editor
          </Link>
          <div className="text-sm text-gray-600">
            {user.name}{" "}
            <span className="text-gray-400">({user.role})</span>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
