import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function fail(status: number, message: string, extra?: unknown) {
  return NextResponse.json({ error: message, details: extra ?? null }, { status });
}

export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    const routeName = fn.name || "anonymous-handler";
    logger.info("SSR route handler started", { route: routeName, inputCount: args.length });

    try {
      const response = await fn(...args);
      logger.success("SSR route handler succeeded", {
        route: routeName,
        status: response.status,
      });
      return response;
    } catch (error) {
      if (error instanceof HttpError) {
        logger.warn("SSR route handler rejected request", {
          route: routeName,
          status: error.status,
          message: error.message,
        });
        return fail(error.status, error.message);
      }
      if (error instanceof ZodError) {
        logger.warn("SSR route handler validation failed", {
          route: routeName,
          issues: error.flatten().fieldErrors,
        });
        return fail(422, "Some fields need fixing.", error.flatten().fieldErrors);
      }
      logger.error("SSR route handler crashed", {
        route: routeName,
        error,
      });
      return fail(500, "Something broke on our side. The error is in the server log.");
    }
  };
}

export function clientIp(req: Request): string | null {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
