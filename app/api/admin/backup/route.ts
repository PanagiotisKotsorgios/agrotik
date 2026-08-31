import { spawn } from "node:child_process";
import { createSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

interface DatabaseConfig {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
  sslmode: string;
}

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return Response.json({ error: "Δεν έχεις δικαίωμα πρόσβασης στο backup." }, { status: 403 });
  }

  const config = databaseConfig();
  if (!config) {
    return Response.json(
      { error: "Λείπουν οι μεταβλητές σύνδεσης PostgreSQL από το Coolify." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  if (url.searchParams.get("check") === "1") {
    try {
      await verifyPgDump();
      return Response.json({ ok: true }, { headers: noStoreHeaders() });
    } catch {
      return Response.json(
        { error: "Το pg_dump δεν είναι διαθέσιμο στο production container." },
        { status: 503, headers: noStoreHeaders() },
      );
    }
  }

  const args = [
    "--host",
    config.host,
    "--port",
    config.port,
    "--username",
    config.user,
    "--dbname",
    config.database,
    "--format=custom",
    "--compress=6",
    "--encoding=UTF8",
    "--no-owner",
    "--no-privileges",
  ];
  const dump = spawn("pg_dump", args, {
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PGPASSWORD: config.password,
      PGSSLMODE: config.sslmode,
    },
  });

  let stderr = "";
  let settled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      dump.stdout.on("data", (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      dump.stderr.on("data", (chunk: Buffer) => {
        if (stderr.length < 12_000) stderr += chunk.toString("utf8");
      });
      dump.once("error", (error) => {
        if (settled) return;
        settled = true;
        console.error("[database backup] pg_dump failed to start:", error.message);
        controller.error(new Error("Αποτυχία εκκίνησης του backup."));
      });
      dump.once("close", (code) => {
        if (settled) return;
        settled = true;
        if (code === 0) {
          controller.close();
          return;
        }
        console.error("[database backup] pg_dump exited with code", code, stderr.trim());
        controller.error(new Error("Η δημιουργία του backup απέτυχε."));
      });
      request.signal.addEventListener(
        "abort",
        () => {
          if (!settled) dump.kill("SIGTERM");
        },
        { once: true },
      );
    },
    cancel() {
      if (!settled) dump.kill("SIGTERM");
    },
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return new Response(stream, {
    headers: {
      ...noStoreHeaders(),
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="agrotik-full-backup-${timestamp}.dump"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function isAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

function databaseConfig(): DatabaseConfig | null {
  const host = process.env.BACKUP_PGHOST || process.env.PGHOST;
  const database = process.env.BACKUP_PGDATABASE || process.env.PGDATABASE || "postgres";
  const user = process.env.BACKUP_PGUSER || process.env.PGUSER;
  const password = process.env.BACKUP_PGPASSWORD || process.env.PGPASSWORD;
  const configuredPort = process.env.BACKUP_PGPORT || process.env.PGPORT || "5432";
  // Supabase's transaction pooler commonly uses 6543. pg_dump needs the
  // session/direct endpoint, exposed on 5432 for the same pooler hostname.
  const port = process.env.BACKUP_PGPORT ? configuredPort : configuredPort === "6543" ? "5432" : configuredPort;
  if (!host || !user || !password) return null;
  return {
    host,
    port,
    database,
    user,
    password,
    sslmode: process.env.BACKUP_PGSSLMODE || process.env.PGSSLMODE || "require",
  };
}

function verifyPgDump(): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = spawn("pg_dump", ["--version"], { shell: false, stdio: "ignore" });
    command.once("error", reject);
    command.once("close", (code) => (code === 0 ? resolve() : reject(new Error("pg_dump unavailable"))));
  });
}

function noStoreHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  };
}
