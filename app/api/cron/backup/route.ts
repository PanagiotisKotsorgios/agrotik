import { spawn } from "node:child_process";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

// Scheduled DB dump for an external cron caller (Coolify, GitHub
// Actions, cron-job.org). Auth is a shared secret from BACKUP_CRON_SECRET
// passed as the `X-Cron-Secret` header. Response streams the same dump
// format as /api/admin/backup so the caller can write it to their own
// off-site storage.

export async function GET(request: Request) {
  const configuredSecret = process.env.BACKUP_CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret");
  if (!configuredSecret) {
    log.warn({ event: "cron.backup.disabled", reason: "BACKUP_CRON_SECRET unset" });
    return Response.json({ error: "Scheduled backups are not configured." }, { status: 503 });
  }
  if (!providedSecret || !timingSafeEqual(providedSecret, configuredSecret)) {
    log.warn({ event: "cron.backup.unauthorized" });
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const host = process.env.BACKUP_PGHOST || process.env.PGHOST;
  const database = process.env.BACKUP_PGDATABASE || process.env.PGDATABASE || "postgres";
  const user = process.env.BACKUP_PGUSER || process.env.PGUSER;
  const password = process.env.BACKUP_PGPASSWORD || process.env.PGPASSWORD;
  const configuredPort = process.env.BACKUP_PGPORT || process.env.PGPORT || "5432";
  const port = process.env.BACKUP_PGPORT ? configuredPort : configuredPort === "6543" ? "5432" : configuredPort;
  const sslmode = process.env.BACKUP_PGSSLMODE || process.env.PGSSLMODE || "require";
  if (!host || !user || !password) {
    log.error("cron.backup.missing_env", new Error("PG env not set"));
    return Response.json({ error: "Missing PG connection env." }, { status: 503 });
  }

  const startedAt = Date.now();
  const dump = spawn(
    "pg_dump",
    ["--host", host, "--port", port, "--username", user, "--dbname", database, "--format=custom", "--compress=6", "--encoding=UTF8", "--no-owner", "--no-privileges"],
    { shell: false, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, PGPASSWORD: password, PGSSLMODE: sslmode } },
  );

  let stderr = "";
  let settled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      dump.stdout.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      dump.stderr.on("data", (chunk: Buffer) => { if (stderr.length < 12_000) stderr += chunk.toString("utf8"); });
      dump.once("error", (error) => {
        if (settled) return;
        settled = true;
        log.error("cron.backup.spawn_failed", error);
        controller.error(new Error("pg_dump failed to start"));
      });
      dump.once("close", (code) => {
        if (settled) return;
        settled = true;
        if (code === 0) {
          log.info({ event: "cron.backup.success", duration_ms: Date.now() - startedAt });
          controller.close();
        } else {
          log.error("cron.backup.exit_nonzero", new Error(stderr.trim()), { code });
          controller.error(new Error("pg_dump exited non-zero"));
        }
      });
      request.signal.addEventListener("abort", () => { if (!settled) dump.kill("SIGTERM"); }, { once: true });
    },
    cancel() { if (!settled) dump.kill("SIGTERM"); },
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return new Response(stream, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="agrotik-scheduled-${timestamp}.dump"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
