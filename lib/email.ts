import { escapeHtml } from "./names";

/**
 * E-mail de entrega do livro. Produção: Resend (com Idempotency-Key, que o
 * Resend usa para não enviar duas vezes o mesmo e-mail em novas tentativas).
 */

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

export interface Mailer {
  send(message: OutgoingEmail): Promise<{ id: string }>;
}

export class ResendMailer implements Mailer {
  constructor(private readonly apiKey: string, private readonly from: string, private readonly replyTo?: string) {}

  async send(message: OutgoingEmail) {
    const { Resend } = await import("resend");
    const resend = new Resend(this.apiKey);
    const { data, error } = await resend.emails.send(
      {
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(this.replyTo ? { replyTo: this.replyTo } : {}),
      },
      { idempotencyKey: message.idempotencyKey },
    );
    if (error || !data?.id) throw new Error(`resend_failed: ${error?.name ?? ""} ${error?.message ?? "sem id"}`.trim());
    return { id: data.id };
  }
}

export function bookReadyEmail(params: { childName: string; downloadUrl: string; expiresAt: Date; maxDownloads: number }) {
  const name = escapeHtml(params.childName);
  const url = escapeHtml(params.downloadUrl);
  const until = params.expiresAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const subject = `O livro de ${params.childName} está pronto!`;
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f6f3ff;font-family:Arial,Helvetica,sans-serif;color:#2d2340">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;padding:28px" cellpadding="0" cellspacing="0"><tr><td>
<h1 style="margin:0 0 12px;font-size:24px;color:#5b3fb8">O livro de ${name} está pronto! 📖</h1>
<p style="font-size:16px;line-height:1.6;margin:0 0 16px">Olá! O pagamento foi confirmado e o livro bíblico personalizado de <strong>${name}</strong> já foi gerado.</p>
<p style="text-align:center;margin:24px 0"><a href="${url}" style="background:#5b3fb8;color:#ffffff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:12px;display:inline-block">Acessar o livro (PDF)</a></p>
<p style="font-size:15px;line-height:1.6;margin:0 0 8px"><strong>Como baixar:</strong></p>
<ol style="font-size:15px;line-height:1.6;margin:0 0 16px;padding-left:20px">
<li>Clique no botão acima. Uma página segura será aberta.</li>
<li>Toque em <strong>Baixar PDF</strong>. No celular, o arquivo vai para a pasta <em>Downloads</em> ou abre no leitor de PDF; use “Compartilhar” → “Salvar em Arquivos” se quiser guardá-lo.</li>
<li>Para imprimir, use papel A4.</li>
</ol>
<p style="font-size:14px;line-height:1.6;color:#655c78;margin:0 0 8px">O link é pessoal, vale até ${until} e permite até ${params.maxDownloads} downloads. Não o compartilhe publicamente.</p>
<p style="font-size:13px;line-height:1.6;color:#655c78;margin:16px 0 0">Se o botão não funcionar, copie este endereço no navegador:<br><span style="word-break:break-all">${url}</span></p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `O livro de ${params.childName} está pronto!

O pagamento foi confirmado e o livro bíblico personalizado de ${params.childName} já foi gerado.

Acesse o PDF: ${params.downloadUrl}

Como baixar:
1. Abra o link acima. Uma página segura será aberta.
2. Toque em "Baixar PDF". No celular, o arquivo vai para Downloads ou abre no leitor de PDF.
3. Para imprimir, use papel A4.

O link é pessoal, vale até ${until} e permite até ${params.maxDownloads} downloads. Não o compartilhe publicamente.`;
  return { subject, html, text };
}
