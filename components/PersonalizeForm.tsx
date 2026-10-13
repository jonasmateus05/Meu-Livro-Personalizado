"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { fontFaceCssFromUrls } from "@/lib/book/fonts";
import { renderBookHtml } from "@/lib/book/template";
import { checkChildName, CHILD_NAME_MAX } from "@/lib/names";
import { AGE_GROUP_LABELS, AGE_GROUPS, STYLE_LABELS, type AgeGroup, type IllustrationStyle } from "@/lib/validation";

const PAGE_WIDTH_PX = 794; // 210 mm a 96 dpi

/** Prévia real da capa: o mesmo HTML usado para gerar o PDF. */
function CoverPreview({ name, age, style }: { name: string; age: AgeGroup; style: IllustrationStyle }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [doc, setDoc] = useState("");

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / PAGE_WIDTH_PX));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      const check = checkChildName(name);
      const childName = check.ok ? check.name : "Sua criança";
      const fontCss = fontFaceCssFromUrls(`${window.location.origin}/fonts`);
      setDoc(renderBookHtml({ childName, ageGroup: age, style }, { fontCss, variant: "cover" }));
    }, 120);
    return () => clearTimeout(id);
  }, [name, age, style]);

  return (
    <div className="preview" aria-live="polite">
      <div className="preview-frame" ref={boxRef}>
        {doc && (
          <iframe
            title="Prévia da capa do livro"
            srcDoc={doc}
            sandbox="allow-scripts"
            style={{ transform: `scale(${scale})` }}
            tabIndex={-1}
            aria-hidden="true"
          />
        )}
      </div>
      <p className="preview-caption">Prévia da capa, atualizada enquanto você digita.</p>
    </div>
  );
}

export default function PersonalizeForm({ priceLabel }: { priceLabel?: string }) {
  const [name, setName] = useState("");
  const [age, setAge] = useState<AgeGroup>("5-7");
  const [style, setStyle] = useState<IllustrationStyle>("colorful");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const honeypot = useRef<HTMLInputElement>(null);

  const nameCheck = useMemo(() => checkChildName(name), [name]);
  const nameError = touched && !nameCheck.ok ? nameCheck.reason : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    setError("");
    if (!nameCheck.ok) return;
    setBusy(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_name: nameCheck.name,
          age_group: age,
          illustration_style: style,
          website: honeypot.current?.value ?? "",
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !result.checkoutUrl) throw new Error(result.error ?? "Não foi possível iniciar a compra.");
      window.location.assign(result.checkoutUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado. Tente novamente.");
      setBusy(false);
    }
  }

  return (
    <div className="buy">
      <form className="form-card" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="child-name">Nome da criança</label>
          <input
            id="child-name"
            type="text"
            autoComplete="off"
            maxLength={CHILD_NAME_MAX}
            placeholder="Ex.: Miguel"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={!!nameError}
            aria-describedby="child-name-help child-name-error"
            required
          />
          <span id="child-name-help" className="help">
            Escreva exatamente como deve aparecer no livro, com acentos (até {CHILD_NAME_MAX} caracteres).
          </span>
          <span id="child-name-error" className="error" role="alert">
            {nameError}
          </span>
        </div>

        <fieldset className="field">
          <legend>Faixa etária</legend>
          <div className="options">
            {AGE_GROUPS.map((g) => (
              <label key={g} className="option">
                <input type="radio" name="age" value={g} checked={age === g} onChange={() => setAge(g)} />
                <span>
                  {AGE_GROUP_LABELS[g]}
                  <small>{g === "2-4" ? "frases curtas" : g === "5-7" ? "leitura em família" : "mais detalhes"}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Estilo das ilustrações</legend>
          <div className="options two">
            {(Object.keys(STYLE_LABELS) as IllustrationStyle[]).map((s) => (
              <label key={s} className="option">
                <input type="radio" name="style" value={s} checked={style === s} onChange={() => setStyle(s)} />
                <span>{STYLE_LABELS[s]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="hp" aria-hidden="true">
          <label>
            Não preencha este campo
            <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        {priceLabel && <p className="price">{priceLabel}</p>}

        <p className="notice-digital">
          <span aria-hidden="true">📄</span>
          <span>
            <strong>Produto digital:</strong> você receberá um arquivo PDF por e-mail para ler na tela ou imprimir. Não
            enviamos livro impresso.
          </span>
        </p>

        <button className="btn" type="submit" disabled={busy} style={{ width: "100%", marginTop: 16 }}>
          {busy ? "Abrindo o checkout…" : "Continuar para o pagamento"}
        </button>
        {error && (
          <p className="status" role="alert">
            {error}
          </p>
        )}
        <p className="fine">
          O pagamento é feito no checkout seguro da Cakto. O livro é produzido depois da confirmação do pagamento e o link
          de download é enviado para o e-mail informado na compra.
        </p>
      </form>

      <CoverPreview name={name} age={age} style={style} />
    </div>
  );
}
