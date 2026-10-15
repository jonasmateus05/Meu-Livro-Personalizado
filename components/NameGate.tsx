"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { checkChildName, CHILD_NAME_MAX } from "@/lib/names";

export const NAME_STORAGE_KEY = "livro:nome";

function Sparkle() {
  return (
    <svg viewBox="0 0 48 48" width="34" height="34" aria-hidden="true">
      <path d="M24 4c1.6 9.2 5.8 13.4 15 15-9.2 1.6-13.4 5.8-15 15-1.6-9.2-5.8-13.4-15-15 9.2-1.6 13.4-5.8 15-15Z" fill="currentColor" />
      <path d="M38 30c.7 3.6 2.4 5.3 6 6-3.6.7-5.3 2.4-6 6-.7-3.6-2.4-5.3-6-6 3.6-.7 5.3-2.4 6-6Z" fill="currentColor" opacity=".6" />
    </svg>
  );
}

/** Tela inicial: só o nome da criança. Envia para /oferta?nome=... */
export default function NameGate() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(NAME_STORAGE_KEY);
      if (saved) setName(saved);
    } catch {
      /* armazenamento indisponível: segue sem lembrar o nome */
    }
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const check = checkChildName(name);
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    setBusy(true);
    try {
      sessionStorage.setItem(NAME_STORAGE_KEY, check.name);
    } catch {
      /* ignora */
    }
    router.push(`/oferta?nome=${encodeURIComponent(check.name)}`);
  }

  return (
    <main className="gate">
      <form className="gate-box" onSubmit={submit} noValidate>
        <span className="gate-icon">
          <Sparkle />
        </span>
        <h1>Como se chama a criança que vai ganhar a própria Bíblia ilustrada?</h1>
        <p className="gate-sub">Digite o nome e veja como ele aparece na capa e nas histórias do livro.</p>
        <label htmlFor="gate-name" className="sr-only">
          Nome da criança
        </label>
        <input
          id="gate-name"
          className="input"
          type="text"
          autoComplete="off"
          autoCapitalize="words"
          maxLength={CHILD_NAME_MAX}
          placeholder="Ex.: Miguel"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          aria-invalid={!!error}
          aria-describedby="gate-error"
          autoFocus
        />
        <p id="gate-error" className="field-error" role="alert">
          {error}
        </p>
        <button className="btn btn-block" type="submit" disabled={busy}>
          {busy ? "Abrindo…" : "Ver o livro com esse nome"}
        </button>
        <p className="gate-trust">Prévia gratuita • Sem cadastro</p>
      </form>
    </main>
  );
}
