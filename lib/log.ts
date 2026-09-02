// Minimal structured logger. Emits one JSON line per event so a log
// aggregator (Grafana Loki, Datadog, or a Vector/Fluent-bit sidecar)
// can parse without custom rules. Keep the shape stable — downstream
// dashboards depend on `level`, `event`, `at`.

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogFields {
  event: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, fields: LogFields) {
  const record = {
    at: new Date().toISOString(),
    level,
    ...fields,
  };
  const line = JSON.stringify(record);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (fields: LogFields) => emit("debug", fields),
  info: (fields: LogFields) => emit("info", fields),
  warn: (fields: LogFields) => emit("warn", fields),
  error: (event: string, error: unknown, extra?: Record<string, unknown>) =>
    emit("error", {
      event,
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
      ...(extra ?? {}),
    }),
};
