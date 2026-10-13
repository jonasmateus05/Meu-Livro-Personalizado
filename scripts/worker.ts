/**
 * Worker contínuo da fila (gera PDFs e envia e-mails).
 *
 *   npm run worker
 *
 * Rode em um servidor Node.js com Chromium (ex.: imagem Docker do Playwright).
 * Pode haver mais de um worker: a fila usa FOR UPDATE SKIP LOCKED.
 */
import os from "node:os";
import { closePgPool } from "../lib/db";
import { runJobs } from "../lib/jobs/runner";
import { purgeStaleData } from "../lib/personalizations";
import { handlerDeps, log } from "../lib/server";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 5000);
const PURGE_EVERY_MS = 6 * 60 * 60 * 1000;

let stopping = false;
process.on("SIGTERM", () => (stopping = true));
process.on("SIGINT", () => (stopping = true));

async function main() {
  const deps = await handlerDeps();
  const workerId = `${os.hostname()}-${process.pid}`;
  let lastPurge = 0;
  log("worker_started", { workerId });
  while (!stopping) {
    try {
      const summary = await runJobs(deps, { workerId, maxJobs: 5, deadlineMs: 120_000 });
      if (summary.processed) log("worker_batch", summary);
      if (Date.now() - lastPurge > PURGE_EVERY_MS) {
        lastPurge = Date.now();
        log("purge", await purgeStaleData(deps.sql));
      }
      if (summary.processed === 0) await new Promise((r) => setTimeout(r, POLL_MS));
    } catch (error) {
      log("worker_loop_error", { error: error instanceof Error ? error.message : String(error) });
      await new Promise((r) => setTimeout(r, POLL_MS * 2));
    }
  }
  await deps.renderer.close();
  await closePgPool();
  log("worker_stopped", { workerId });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
