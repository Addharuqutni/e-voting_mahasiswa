import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSessionUser } from "@/lib/guard";
import { prisma } from "@/lib/db";

// CV is session-gated; never expose uploads/ through public/.
export async function GET(_req, { params }) {
  if (!(await getSessionUser())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const candidateId = Number(id);
  if (!Number.isInteger(candidateId)) return new Response("Not found", { status: 404 });
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId } });
  const name = candidate?.cvUrl ? path.basename(candidate.cvUrl) : "";
  if (!name) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(path.join(process.cwd(), "uploads", "cv", name));
    return new Response(buf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}"` } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
