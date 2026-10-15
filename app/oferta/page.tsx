import type { Metadata } from "next";
import Offer from "@/components/oferta/Offer";
import OfferFallback from "@/components/oferta/OfferFallback";
import { priceFromEnv } from "@/lib/funnel";
import { checkChildName } from "@/lib/names";

export const metadata: Metadata = {
  title: "O livro bíblico personalizado da sua criança",
  robots: { index: false },
};

export default async function OfertaPage({ searchParams }: { searchParams: Promise<{ nome?: string | string[] }> }) {
  const { nome } = await searchParams;
  const raw = Array.isArray(nome) ? nome[0] : nome;
  const check = raw ? checkChildName(raw) : null;
  // Sem nome válido na URL: tenta o nome guardado na sessão; senão volta para "/".
  if (!check?.ok) return <OfferFallback />;
  const price = priceFromEnv(process.env.NEXT_PUBLIC_PRICE, process.env.NEXT_PUBLIC_PRICE_ORIGINAL);
  return <Offer initialName={check.name} price={price} />;
}
