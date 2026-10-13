import type { Mailer, OutgoingEmail } from "@/lib/email";
import type { BookStorage } from "@/lib/storage";
import type { PdfRenderer } from "@/lib/book/pdf";

export class MemoryStorage implements BookStorage {
  files = new Map<string, Uint8Array>();
  signed: { path: string; name: string }[] = [];
  async upload(path: string, bytes: Uint8Array) {
    this.files.set(path, bytes);
  }
  async signedUrl(path: string, _ttl: number, name: string) {
    if (!this.files.has(path)) throw new Error("arquivo inexistente");
    this.signed.push({ path, name });
    return `https://storage.test/signed/${encodeURIComponent(path)}?download=${encodeURIComponent(name)}`;
  }
  async exists(path: string) {
    return this.files.has(path);
  }
}

export class FakeMailer implements Mailer {
  sent: OutgoingEmail[] = [];
  attempts: OutgoingEmail[] = [];
  failNext = 0;
  async send(message: OutgoingEmail) {
    this.attempts.push(message);
    if (this.failNext > 0) {
      this.failNext--;
      throw new Error("resend_failed: simulated outage");
    }
    this.sent.push(message);
    return { id: `msg_${this.sent.length}` };
  }
}

/** Renderizador que falha N vezes antes de delegar ao real. */
export class FlakyRenderer implements PdfRenderer {
  failures = 0;
  calls = 0;
  constructor(private readonly inner: PdfRenderer, public failTimes = 0) {}
  async render(html: string, opts: { expectedName: string; expectedPages: number }) {
    this.calls++;
    if (this.failures < this.failTimes) {
      this.failures++;
      throw new Error("chromium crashed (simulated)");
    }
    return this.inner.render(html, opts);
  }
  async close() {
    await this.inner.close();
  }
}
