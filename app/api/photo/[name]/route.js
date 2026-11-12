import { readFile } from "node:fs/promises";
import path from "node:path";

// Candidate photos are public; CVs are not (see /api/cv/[id]).
export async function GET(_req, { params }) {
  const { name } = await params;
  const file = path.basename(name);
  try {
    const buf = await readFile(path.join(process.cwd(), "uploads", "photo", file));
    const type = file.endsWith(".png") ? "image/png" : file.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return new Response(buf, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=604800" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
