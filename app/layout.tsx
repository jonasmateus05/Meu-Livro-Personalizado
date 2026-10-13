import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "A Bíblia Infantil Personalizada",
  description: "Histórias bíblicas e orações personalizadas para crianças.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
