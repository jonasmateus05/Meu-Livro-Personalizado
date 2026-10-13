import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

// Based on Cakto's documented single-purchase sample payload. Verify this contract
// against a real test event from your own Cakto dashboard before production.
export async function POST(request: Request) {
  const secret = process.env.CAKTO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("cakto_webhook_secret_missing");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let payload: any;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Cakto's published example includes `secret` in the JSON body.
  if (typeof payload?.secret !== "string" || payload.secret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventType = payload?.event;
  const data = payload?.data;
  if (typeof eventType !== "string" || !data?.id) {
    return NextResponse.json({ error: "Missing event/order ID" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const eventKey = createHash("sha256")
    .update(`${eventType}:${String(data.id)}:${String(data.status ?? "")}:${String(data.paidAt ?? "")}`)
    .digest("hex");

  // Store a minimal event record for audit/idempotency. Do not log full customer payloads.
  const { error: eventError } = await db.from("webhook_events").upsert({
    provider_event_key: eventKey,
    event_type: eventType,
    provider_order_id: String(data.id),
    payload_summary: {
      status: data.status ?? null,
      product_id: data.product?.id ?? null,
      offer_id: data.offer?.id ?? null,
      email_present: Boolean(data.customer?.email),
    },
  }, { onConflict: "provider_event_key", ignoreDuplicates: true });

  if (eventError) {
    console.error("cakto_event_persist_failed", eventError.message);
    return NextResponse.json({ error: "Could not persist event" }, { status: 500 });
  }

  // Restrict this endpoint to the product configured for this integration.
  const expectedProductId = process.env.CAKTO_PRODUCT_ID;
  if (expectedProductId && String(data.product?.id ?? "") !== expectedProductId) {
    return NextResponse.json({ error: "Unexpected product" }, { status: 422 });
  }

  // The documented Cakto sample payload does not include our personalization UUID.
  // Therefore, do NOT auto-match by customer email or child's name. Record approved
  // orders as unmatched until a real test proves a reliable correlation field/API.
  if (eventType === "purchase_approved" && data.status === "paid") {
    const { error: orderError } = await db.from("orders").upsert({
      provider: "cakto",
      provider_order_id: String(data.id),
      provider_ref_id: data.refId ? String(data.refId) : null,
      customer_email: data.customer?.email ? String(data.customer.email).trim().toLowerCase() : null,
      provider_product_id: data.product?.id ? String(data.product.id) : null,
      provider_offer_id: data.offer?.id ? String(data.offer.id) : null,
      amount: typeof data.amount === "number" ? data.amount : null,
      payment_method: data.paymentMethod ? String(data.paymentMethod) : null,
      paid_at: data.paidAt ?? null,
      status: "paid_unmatched",
    }, { onConflict: "provider,provider_order_id" });

    if (orderError) {
      console.error("cakto_order_persist_failed", orderError.message);
      return NextResponse.json({ error: "Could not persist order" }, { status: 500 });
    }
  } else if (["refund", "chargeback", "purchase_refused"].includes(eventType)) {
    const status = eventType === "refund" ? "refunded" : eventType === "chargeback" ? "chargeback" : "refused";
    const { error } = await db.from("orders")
      .update({ status })
      .eq("provider", "cakto")
      .eq("provider_order_id", String(data.id));
    if (error) {
      console.error("cakto_order_status_update_failed", error.message);
      return NextResponse.json({ error: "Could not update order" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true, correlation: "manual_or_verified_mapping_required" });
}
