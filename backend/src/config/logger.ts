import pino from "pino";
import { env } from "./env";

const isDevelopment = env.NODE_ENV === "development";

function resolvePrettyTransport(): pino.TransportSingleOptions | undefined {
  if (!isDevelopment) {
    return undefined;
  }

  try {
    return {
      target: require.resolve("pino-pretty"),
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
        singleLine: true,
        messageFormat: "{msg}"
      }
    };
  } catch {
    return undefined;
  }
}

const prettyTransport = resolvePrettyTransport();

if (isDevelopment && !prettyTransport) {
  console.warn("[logger] pino-pretty not found. Falling back to standard JSON logs.");
}

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport: prettyTransport
});
