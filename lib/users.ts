import fs from "node:fs";
import path from "node:path";

export type UserRole = "owner" | "editor";

export type AdminUser = {
  email: string;
  name: string;
  role: UserRole;
};

const usersPath =
  process.env.USERS_JSON_PATH ?? path.resolve("/app/data/users.json");

function isAdminUser(value: unknown): value is AdminUser {
  if (!value || typeof value !== "object") return false;
  const u = value as Record<string, unknown>;
  return (
    typeof u.email === "string" &&
    typeof u.name === "string" &&
    (u.role === "owner" || u.role === "editor")
  );
}

export function loadUsers(): AdminUser[] {
  try {
    const raw = fs.readFileSync(usersPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isAdminUser);
  } catch {
    return [];
  }
}

export function findUserByEmail(email: string): AdminUser | null {
  const normalized = email.toLowerCase();
  return (
    loadUsers().find((u) => u.email.toLowerCase() === normalized) ?? null
  );
}
