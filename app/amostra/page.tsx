import type { Metadata } from "next";
import Link from "next/link";
import SampleViewer from "@/components/SampleViewer";

export const metadata: Metadata = { title: "Amostra — A Bíblia Infantil Personalizada", robots: { index: false } };

export default function SamplePage() {
  return (
    <main className="page-simple" style={{ maxWidth: 980 }}>
      <p><Link href="/">← Voltar</Link></p>
      <h1>Amostra do livro</h1>
      <p className="lead">
        Veja a capa, a carta de boas-vindas e a primeira história com o nome da sua criança. A amostra tem marca d’água;
        o livro completo tem 41 páginas (2 a 4 anos) ou 44 páginas (5 a 10 anos).
      </p>
      <SampleViewer />
      <p style={{ marginTop: 24 }}>
        <Link className="btn" href="/#personalizar">Personalizar e comprar</Link>
      </p>
    </main>
  );
}
