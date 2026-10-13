import { NextResponse } from "next/server";
import { redeemDownload } from "@/lib/download";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { config, db, log, storage } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST (botão "Baixar PDF" da página /download/[token]): consome um download
 * e redireciona para uma URL assinada de curta duração do Supabase Storage.
 * GET não consome nada (evita que pré-visualizadores de link gastem downloads).
 */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!rateLimit(`dl:${clientIp(request)}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas." }, { status: 429 });
  }
  try {
    const result = await redeemDownload(await db(), storage(), token, config().download.signedUrlTtlSeconds);
    if (!result.ok) {
      return NextResponse.redirect(new URL(`/download/${encodeURIComponent(token)}?erro=${result.reason}`, request.url), 303);
    }
    return NextResponse.redirect(result.url, 303);
  } catch (error) {
    log("download_failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.redirect(new URL(`/download/${encodeURIComponent(token)}?erro=unavailable`, request.url), 303);
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return NextResponse.redirect(new URL(`/download/${encodeURIComponent(token)}`, request.url), 303);
}
