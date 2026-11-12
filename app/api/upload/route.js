import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "@/lib/guard";

const MAX = 5 * 1024 * 1024;

// Admin-only upload. Photos are public (/api/photo/*), CVs are session-gated (/api/cv/[id]).
export async function POST(req) {
  const user = await getSessionUser();
  if (user?.role !== "ADMIN") return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  const kind = form.get("kind") === "cv" ? "cv" : "photo";
  if (!file || typeof file === "string") return Response.json({ error: "file kosong" }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: "maks 5MB" }, { status: 413 });
  if (kind === "cv" && file.type !== "application/pdf") return Response.json({ error: "CV harus PDF" }, { status: 400 });
  if (kind === "photo" && !/^image\/(jpeg|png|webp)$/.test(file.type)) return Response.json({ error: "Foto harus JPG/PNG/WebP" }, { status: 400 });

  const ext = kind === "cv" ? ".pdf" : path.extname(file.name).toLowerCase() || ".jpg";
  const dir = path.join(process.cwd(), "uploads", kind);
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: kind === "cv" ? name : `/api/photo/${name}` });
}
