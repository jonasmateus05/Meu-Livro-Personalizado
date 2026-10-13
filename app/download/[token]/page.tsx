import type { Metadata } from "next";
import { describeDownload } from "@/lib/download";
import { db, log } from "@/lib/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Download do livro", robots: { index: false, follow: false }, referrer: "no-referrer" };

const MESSAGES: Record<string, string> = {
  invalid: "Este link não é válido. Confira se copiou o endereço completo do e-mail.",
  expired: "Este link expirou. Responda ao e-mail de entrega para pedir um novo link.",
  revoked: "Este link foi desativado.",
  limit: "O limite de downloads deste link foi atingido. Responda ao e-mail de entrega para pedir um novo link.",
  unavailable: "O arquivo está temporariamente indisponível. Tente novamente em alguns minutos.",
};

export default async function DownloadPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { token } = await params;
  const { erro } = await searchParams;
  let info: Awaited<ReturnType<typeof describeDownload>>;
  try {
    info = await describeDownload(await db(), token);
  } catch (error) {
    log("download_page_error", { error: error instanceof Error ? error.message : String(error) });
    info = { ok: false, reason: "unavailable" };
  }
  const problem = erro && MESSAGES[erro] ? MESSAGES[erro] : !info.ok ? MESSAGES[info.reason] : null;

  return (
    <main className="page-simple">
      {info.ok && !problem ? (
        <>
          <h1>O livro de {info.childName} está pronto!</h1>
          <p className="lead">Toque no botão para baixar o PDF.</p>
          <form method="post" action={`/api/download/${encodeURIComponent(token)}`}>
            <button className="btn" type="submit">Baixar PDF</button>
          </form>
          <h2 style={{ fontSize: "1.3rem", marginTop: 32 }}>Dicas</h2>
          <ul>
            <li>No celular, o arquivo vai para a pasta Downloads ou abre no leitor de PDF. Use “Compartilhar” → “Salvar em Arquivos” para guardar.</li>
            <li>Para imprimir, use papel A4.</li>
            <li>
              Este link é pessoal: vale até {info.expiresAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} e ainda
              permite {info.remaining} download(s).
            </li>
          </ul>
        </>
      ) : (
        <>
          <h1>Não foi possível abrir o download</h1>
          <p className="lead">{problem ?? MESSAGES.unavailable}</p>
        </>
      )}
    </main>
  );
}
