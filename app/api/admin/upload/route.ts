import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { findUserByEmail } from "@/lib/users";

export const maxDuration = 60;

const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? "/app/data/uploads";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 10;

const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
]);

type UploadedFile = {
  originalName: string;
  storedName: string;
  path: string;
  size: number;
  type: string;
};

function safeExtension(name: string): string | null {
  const ext = path.extname(name).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) ? ext : null;
}

function makeStoredName(ext: string, userSlug: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = randomBytes(4).toString("hex");
  return `${ts}-${userSlug}-${rand}${ext}`;
}

export async function POST(req: Request) {
  const h = await headers();
  const email = h.get("x-admin-email");
  const user = email ? findUserByEmail(email) : null;
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const files = form.getAll("files").filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return Response.json({ error: "No files provided" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return Response.json(
      { error: `Too many files (max ${MAX_FILES} per request)` },
      { status: 400 },
    );
  }

  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const userSlug = user.email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase();
  const accepted: UploadedFile[] = [];
  const rejected: { name: string; reason: string }[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      rejected.push({ name: file.name, reason: "Over 10MB" });
      continue;
    }
    const ext = safeExtension(file.name);
    if (!ext) {
      rejected.push({ name: file.name, reason: "Unsupported file type" });
      continue;
    }
    const storedName = makeStoredName(ext, userSlug);
    const abs = path.join(UPLOADS_DIR, storedName);
    const bytes = new Uint8Array(await file.arrayBuffer());
    await fs.writeFile(abs, bytes);
    accepted.push({
      originalName: file.name,
      storedName,
      path: `uploads/${storedName}`,
      size: file.size,
      type: file.type || "application/octet-stream",
    });
  }

  return Response.json({ accepted, rejected });
}
