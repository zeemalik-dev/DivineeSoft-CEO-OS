export type LogLevel = "info" | "warn" | "error" | "success";

export type LoggerLike = {
  info: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
  error: (message: string, meta?: unknown) => void;
  success: (message: string, meta?: unknown) => void;
};

const LOG_LEVELS: Record<LogLevel, number> = {
  info: 10,
  warn: 20,
  error: 30,
  success: 10,
};

function getMinLevel() {
  const configured = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  if (configured === "warn") return LOG_LEVELS.warn;
  if (configured === "error") return LOG_LEVELS.error;
  return LOG_LEVELS.info;
}

function formatMeta(meta: unknown) {
  if (meta === undefined) return undefined;
  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
    };
  }
  return meta;
}

function emit(level: LogLevel, scope: string, message: string, meta?: unknown) {
  if (process.env.NODE_ENV === "test") return;
  const minLevel = getMinLevel();
  if (LOG_LEVELS[level] < minLevel) return;

  const payload = {
    timestamp: new Date().toISOString(),
    level: level === "success" ? "SUCCESS" : level.toUpperCase(),
    scope,
    message,
    ...(meta !== undefined ? { meta: formatMeta(meta) } : {}),
  };

  switch (level) {
    case "info":
      console.info("[SSR]", payload);
      break;
    case "warn":
      console.warn("[SSR]", payload);
      break;
    case "error":
      console.error("[SSR]", payload);
      break;
    case "success":
      console.info("[SSR]", payload);
      break;
    default:
      console.log("[SSR]", payload);
  }
}

export function createLogger(scope: string): LoggerLike {
  return {
    info: (message, meta) => emit("info", scope, message, meta),
    warn: (message, meta) => emit("warn", scope, message, meta),
    error: (message, meta) => emit("error", scope, message, meta),
    success: (message, meta) => emit("success", scope, message, meta),
  };
}

const defaultLogger = createLogger("app");

export const logger = {
  info: defaultLogger.info,
  warn: defaultLogger.warn,
  error: defaultLogger.error,
  success: defaultLogger.success,
};

export default logger;
