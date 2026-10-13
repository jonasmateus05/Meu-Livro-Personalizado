"use client";

import { FormEvent, useState } from "react";

type AgeGroup = "2-4" | "5-7" | "8-10";
type Style = "colorful" | "watercolor";

export default function Home() {
  const [name, setName] = useState("Miguel");
  const [age, setAge] = useState<AgeGroup>("5-7");
  const [style, setStyle] = useState<Style>("colorful");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/personalizations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_name: name, age_group: age, illustration_style: style }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Falha ao salvar");
      setMessage(`Personalização salva. ID: ${result.personalization.id}. Checkout ainda precisa ser conectado após validar a correlação Cakto.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
    } finally { setBusy(false); }
  }

  return <main className="shell">
    <section className="hero">
      <div className="eyebrow">UM LIVRO FEITO PARA ELA OU ELE</div>
      <h1>A Bíblia Infantil de {name.trim() || "sua criança"}</h1>
      <p>Histórias bíblicas, ensinamentos e orações em uma edição personalizada com o nome da criança.</p>
      <div className="book-preview">
        <div className="sun">✦</div>
        <div className="cover-title">A Bíblia de<br/><strong>{name.trim() || "Sua Criança"}</strong></div>
        <div className="cover-subtitle">Histórias de fé, amor e oração</div>
        <div className="rainbow">🌈</div>
        <div className="animals">🦁 🐑 🕊️</div>
      </div>
    </section>
    <section className="form-card">
      <h2>Personalize o livro</h2>
      <p className="muted">Escolha os dados para preparar a edição da criança.</p>
      <form onSubmit={submit}>
        <label>Nome da criança<input required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Miguel" /></label>
        <label>Faixa etária<select value={age} onChange={e => setAge(e.target.value as AgeGroup)}><option value="2-4">2 a 4 anos</option><option value="5-7">5 a 7 anos</option><option value="8-10">8 a 10 anos</option></select></label>
        <label>Estilo das ilustrações<select value={style} onChange={e => setStyle(e.target.value as Style)}><option value="colorful">Coloridas e divertidas</option><option value="watercolor">Aquarela suave</option></select></label>
        <button disabled={busy}>{busy ? "Salvando…" : "Salvar personalização"}</button>
      </form>
      {message && <p className="notice" role="status">{message}</p>}
      <p className="fineprint">Protótipo técnico: este botão salva a personalização. Ainda não cobra nem libera um PDF.</p>
    </section>
  </main>;
}
