import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "A Bíblia Infantil Personalizada — livro digital em PDF com o nome da criança",
  description:
    "Dez histórias bíblicas recontadas para a idade da criança, com orações, lições práticas e atividades. Produto digital em PDF, personalizado com o nome da criança e enviado por e-mail.",
  openGraph: {
    title: "A Bíblia Infantil Personalizada",
    description: "Livro digital (PDF) com o nome da criança: histórias bíblicas, orações e atividades.",
    images: ["/amostras/miguel-colorido-p01.jpg"],
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#5ab2f2",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
