import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Pedido recebido — A Bíblia Infantil Personalizada", robots: { index: false } };

/**
 * Página de retorno pós-checkout (configure na Cakto, se desejar).
 * Não confirma pagamento: a confirmação vem apenas do webhook da Cakto.
 */
export default function ThanksPage() {
  return (
    <main className="page-simple">
      <h1>Obrigado pela compra!</h1>
      <p className="lead">
        Assim que a Cakto confirmar o pagamento, o livro será produzido e você receberá um e-mail com o link seguro para
        baixar o PDF.
      </p>
      <ul>
        <li>Confira também a caixa de spam ou promoções.</li>
        <li>O e-mail será enviado para o endereço informado no checkout.</li>
        <li>O tempo de confirmação depende do meio de pagamento escolhido.</li>
      </ul>
      <p><Link className="btn ghost" href="/">Voltar à página inicial</Link></p>
    </main>
  );
}
