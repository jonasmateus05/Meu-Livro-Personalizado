import { NextResponse } from "next/server";
import { personalizationSchema } from "@/lib/validation";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let input: unknown;
  try { input = await request.json(); }
  catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const parsed = personalizationSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    const { data, error } = await db.from("personalizations")
      .insert({
        child_name: parsed.data.child_name,
        age_group: parsed.data.age_group,
        illustration_style: parsed.data.illustration_style,
        status: "pending_payment",
      })
      .select("id, child_name, age_group, illustration_style, status")
      .single();

    if (error) throw error;
    // This ID is stored before redirecting to Cakto. Do not assume it returns in the webhook.
    return NextResponse.json({ personalization: data }, { status: 201 });
  } catch (error) {
    console.error("personalization_create_failed", error);
    return NextResponse.json({ error: "Não foi possível salvar a personalização" }, { status: 500 });
  }
}
