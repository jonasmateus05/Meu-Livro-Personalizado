import { NextResponse } from "next/server";
import { runJobs } from "@/lib/jobs/runner";
import { bearerOk, config, handlerDeps, log } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Executa um lote da fila. Protegido por CRON_SECRET (Authorization: Bearer).
 * Útil com Vercel Cron ou outro agendador. Requer Chromium disponível no
 * ambiente — em hospedagens serverless sem Chromium, use o worker contínuo
 * (`npm run worker`) num servidor Node/Docker. Ver docs/DEPLOY.md.
 */
async function handle(request: Request) {
  if (!bearerOk(request, config().cronSecret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const deps = await handlerDeps();
  try {
    const summary = await runJobs(deps, { workerId: `cron-${process.pid}`, maxJobs: 5, deadlineMs: 240_000 });
    log("jobs_run", summary);
    return NextResponse.json(summary);
  } finally {
    await deps.renderer.close();
  }
}

export const GET = handle;
export const POST = handle;
