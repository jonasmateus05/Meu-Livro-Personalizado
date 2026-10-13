import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-simple">
      <h1>Página não encontrada</h1>
      <p><Link href="/">Voltar à página inicial</Link></p>
    </main>
  );
}
