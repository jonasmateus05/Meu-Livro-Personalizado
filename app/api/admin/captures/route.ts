import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/admin-route";
import { db } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — últimas capturas de payload (com dados pessoais mascarados). */
export const GET = adminRoute(async () => {
  const sql = await db();
  const captures = await sql.query(
    `select id, event_type, received_at, header_names, redacted_payload
       from public.webhook_captures order by received_at desc limit 20`,
  );
  return NextResponse.json({ captures });
});
