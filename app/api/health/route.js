import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Lightweight liveness/readiness probe for Nginx, Uptime Kuma, or a load balancer.
export async function GET() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const mem = process.memoryUsage();
    return Response.json(
      {
        status: "ok",
        db: "ok",
        dbLatencyMs: Date.now() - started,
        uptimeSec: Math.round(process.uptime()),
        rssMb: Math.round(mem.rss / 1024 / 1024),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return Response.json(
      { status: "degraded", db: "down", error: String(e?.message ?? e).slice(0, 200) },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
