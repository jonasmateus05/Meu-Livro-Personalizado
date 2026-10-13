import { NextResponse } from "next/server";
import { adminRoute } from "@/lib/admin-route";
import { db } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["unmatched", "needs_review", "awaiting_release", "queued", "generating", "generated", "emailing", "delivered", "failed", "revoked", "not_started"];

/** GET /api/admin/orders?status=unmatched — lista pedidos para conferência/reconciliação. */
export const GET = adminRoute(async (request: Request) => {
  const status = new URL(request.url).searchParams.get("status");
  if (status && !STATUSES.includes(status)) return NextResponse.json({ error: "status inválido" }, { status: 400 });
  const sql = await db();
  const orders = await sql.query(
    `select o.id, o.provider_order_id, o.payment_status, o.fulfillment_status, o.review_reason, o.match_method,
            o.customer_email, o.amount_cents, o.paid_at, o.created_at,
            p.checkout_ref, p.child_name, p.age_group, p.illustration_style
       from public.orders o left join public.personalizations p on p.id = o.personalization_id
      where ($1::text is null or o.fulfillment_status = $1)
      order by o.created_at desc limit 200`,
    [status],
  );
  const pending = status === "unmatched" || status === "needs_review"
    ? await sql.query(
        `select checkout_ref, child_name, age_group, illustration_style, created_at
           from public.personalizations where status = 'pending_payment'
          order by created_at desc limit 200`,
      )
    : undefined;
  return NextResponse.json({ orders, pendingPersonalizations: pending });
});
