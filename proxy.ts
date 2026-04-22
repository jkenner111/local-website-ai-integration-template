import { NextResponse, type NextRequest } from "next/server";
import { verifyAccessJwt, devBypassIdentity } from "@/lib/cf-access";

export const config = {
  // Match everything except Next internals and common static assets.
  // Still broad so we can enforce the admin-hostname redirect on "/".
  matcher: [
    "/((?!_next|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|woff2?)).*)",
  ],
};

const ADMIN_EMAIL_HEADER = "x-admin-email";
// Comma-separated list of hostnames that should only serve the admin UI.
// Example: ADMIN_HOSTS="admin.example.com,admin.example.org"
const ADMIN_HOSTS = new Set(
  (process.env.ADMIN_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
);

function isAdminPath(path: string) {
  return path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/admin/");
}

export async function proxy(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const path = req.nextUrl.pathname;
  const isAdminHost = ADMIN_HOSTS.has(host);
  const adminPath = isAdminPath(path);
  const isApiPath = path.startsWith("/api/");

  // On the admin hostname, anything that isn't an admin page or API gets
  // bounced to /admin — public routes shouldn't serve from admin.*.
  if (isAdminHost && !adminPath && !isApiPath) {
    return NextResponse.redirect(new URL("/admin", req.url));
  }

  // Admin pages and admin APIs (on either hostname) require a valid identity.
  if (adminPath) {
    const dev = devBypassIdentity();
    if (dev) return forwardWithEmail(req, dev.email);

    const token =
      req.headers.get("cf-access-jwt-assertion") ||
      req.cookies.get("CF_Authorization")?.value;
    if (!token) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const identity = await verifyAccessJwt(token);
    if (!identity) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    return forwardWithEmail(req, identity.email);
  }

  return NextResponse.next();
}

function forwardWithEmail(req: NextRequest, email: string) {
  const headers = new Headers(req.headers);
  headers.set(ADMIN_EMAIL_HEADER, email);
  return NextResponse.next({ request: { headers } });
}
