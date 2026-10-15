"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { NAME_STORAGE_KEY } from "@/components/NameGate";
import { checkChildName } from "@/lib/names";

/** /oferta sem nome: usa o nome da sessão, se houver; senão volta para "/". */
export default function OfferFallback() {
  const router = useRouter();
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(NAME_STORAGE_KEY);
    } catch {
      /* ignora */
    }
    const check = saved ? checkChildName(saved) : null;
    router.replace(check?.ok ? `/oferta?nome=${encodeURIComponent(check.name)}` : "/");
  }, [router]);
  return (
    <main className="gate">
      <p className="gate-sub">Carregando…</p>
    </main>
  );
}
