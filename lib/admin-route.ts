import { NextResponse } from "next/server";
import { AdminActionError } from "./orders";
import { PermanentJobError } from "./jobs/handlers";
import { bearerOk, config, log } from "./server";

/** Envolve rotas administrativas: exige ADMIN_API_TOKEN e padroniza erros. */
export function adminRoute<C>(fn: (request: Request, ctx: C) => Promise<Response>) {
  return async (request: Request, ctx: C) => {
    if (!bearerOk(request, config().adminApiToken)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    try {
      return await fn(request, ctx);
    } catch (error) {
      if (error instanceof AdminActionError) return NextResponse.json({ error: error.message }, { status: error.httpStatus });
      if (error instanceof PermanentJobError) return NextResponse.json({ error: error.message }, { status: 409 });
      log("admin_route_error", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }
  };
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
