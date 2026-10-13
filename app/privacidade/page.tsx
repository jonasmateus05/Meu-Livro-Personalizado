import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacidade e dados — A Bíblia Infantil Personalizada" };

export default function PrivacyPage() {
  return (
    <main className="page-simple">
      <p><Link href="/">← Voltar</Link></p>
      <h1>Privacidade e dados</h1>
      <p>Coletamos apenas o necessário para produzir e entregar o livro digital:</p>
      <ul>
        <li><b>Personalização:</b> nome da criança, faixa etária e estilo das ilustrações.</li>
        <li><b>Pedido:</b> identificador do pedido, status do pagamento, valor e o e-mail do comprador, recebidos da Cakto após a compra.</li>
      </ul>
      <p>Não coletamos CPF, telefone, endereço nem dados de cartão: o pagamento é processado pela Cakto.</p>
      <p>Os PDFs ficam em armazenamento privado e só podem ser baixados pelo link pessoal enviado por e-mail, que expira e tem limite de downloads. Em caso de reembolso ou contestação, o link é desativado.</p>
      <p>Personalizações que não foram pagas são apagadas automaticamente após 30 dias.</p>
      <p>Para solicitar acesso, correção ou exclusão dos seus dados, responda ao e-mail de entrega ou use o contato informado no checkout.</p>
    </main>
  );
}
