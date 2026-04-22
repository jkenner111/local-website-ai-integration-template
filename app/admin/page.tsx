import { headers } from "next/headers";
import { findUserByEmail } from "@/lib/users";
import { AdminChat } from "./AdminChat";

export default async function AdminHome() {
  const h = await headers();
  const email = h.get("x-admin-email");
  const user = email ? findUserByEmail(email) : null;
  const firstName = user?.name.split(" ")[0] ?? "there";

  return (
    <div>
      <h1 className="text-3xl font-semibold">Hi, {firstName}.</h1>
      <p className="mt-3 max-w-xl text-gray-600">
        Tell me what you&rsquo;d like to know about the site. I can read pages,
        events, and the navigation. Editing is coming soon.
      </p>

      <AdminChat />
    </div>
  );
}
