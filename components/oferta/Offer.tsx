"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import BookFrame from "@/components/BookFrame";
import { NAME_STORAGE_KEY } from "@/components/NameGate";
import { illustrationSvg, type IllustrationId } from "@/lib/book/illustrations";
import { STORIES } from "@/lib/book/stories";
import type { BookInput } from "@/lib/book/template";
import { FAQ, showcasePages, TESTIMONIALS, type Price } from "@/lib/funnel";
import { checkChildName, CHILD_NAME_MAX, fillTemplateText } from "@/lib/names";
import { AGE_GROUP_LABELS, AGE_GROUPS, STYLE_LABELS, type AgeGroup, type IllustrationStyle } from "@/lib/validation";

/* --------------------------------------------------------------------------
 * Funil /oferta — toda a página usa o nome da criança.
 * Textos e ilustrações próprios. Sem depoimentos, bônus ou preços inventados.
 * ------------------------------------------------------------------------ */

const N = ({ children }: { children: ReactNode }) => <strong className="nm">{children}</strong>;

function CtaButton({ name, pulse = true }: { name: string; pulse?: boolean }) {
  return (
    <a href="#personalizar" className={`btn btn-pill${pulse ? " breathe" : ""}`}>
      Quero o livro de {name}
    </a>
  );
}

function Trust() {
  return (
    <p className="trust-line">
      <span>🔒 Pagamento seguro pela Cakto</span>
      <span>📄 Produto 100% digital (PDF)</span>
      <span>↩︎ 7 dias de garantia</span>
    </p>
  );
}

/* ---------- a) Hero com o livro aberto (páginas reais) ---------- */
function Hero({ input }: { input: BookInput }) {
  const name = input.childName;
  return (
    <section className="band band-fade hero-offer">
      <div className="wrap-text center">
        <p className="kicker">Livro bíblico infantil personalizado</p>
        <h1>
          Já pensou na carinha de <N>{name}</N> ao encontrar o próprio nome nas histórias da Bíblia?
        </h1>
        <p className="lead">
          Dez histórias bíblicas recontadas para a idade de <N>{name}</N>, com oração, lição prática e atividades — feitas com o
          nome de <N>{name}</N> do começo ao fim.
        </p>
      </div>
      <div className="spread" aria-label={`Prévia do livro aberto de ${name}`}>
        <div className="spread-page left">
          <BookFrame input={input} page={1} title={`Capa do livro de ${name}`} />
        </div>
        <div className="spread-page right">
          <BookFrame input={input} page={3} title={`Carta de boas-vindas para ${name}`} />
        </div>
      </div>
      <div className="center">
        <CtaButton name={name} />
        <p className="small muted">Produto digital em PDF • Enviado por e-mail após a confirmação do pagamento</p>
      </div>
    </section>
  );
}

/* ---------- b) Dor / identificação ---------- */
function Pain({ name }: { name: string }) {
  return (
    <section className="band">
      <div className="wrap-text prose">
        <h2>
          Você quer que <N>{name}</N> cresça conhecendo a Deus.
        </h2>
        <p>Mas, no meio da correria, o momento de fé em família acaba ficando para depois.</p>
        <p>As histórias bíblicas chegam por vídeos e desenhos que passam rápido. A criança assiste, mas não se sente parte delas.</p>
        <div className="quote-card">
          Quando uma história chama a criança pelo nome, ela deixa de apenas ouvir e passa a se sentir dentro do que está sendo
          contado.
        </div>
        <p>
          Sem isso, fica difícil transformar a leitura bíblica num hábito que <N>{name}</N> espere com alegria.
        </p>
        <p className="punch">É aqui que este livro entra.</p>
      </div>
    </section>
  );
}

/* ---------- c) Virada ---------- */
function Turn({ input }: { input: BookInput }) {
  const name = input.childName;
  const noah = STORIES.find((s) => s.id === "noe")!;
  const lesson = fillTemplateText(noah.lesson[input.ageGroup], { nome: name });
  const parts = lesson.split(name);
  return (
    <section className="band band-blue">
      <div className="wrap-text">
        <h2 className="center">
          Um livro em que a Bíblia fala com <N>{name}</N> pelo nome
        </h2>
        <div className="card">
          <p>
            Cada uma das 10 histórias foi recontada com palavras simples para a idade de <N>{name}</N>. Depois de cada história, uma
            página convida a pensar, praticar e orar — e o nome de <N>{name}</N> aparece ali, na lição e na oração.
          </p>
          <p className="muted small">As histórias não são citações literais: cada uma indica o trecho da Bíblia para a família ler junto.</p>
        </div>
        <figure className="card card-rose">
          <figcaption className="small muted">Trecho real do livro (história de Noé, {AGE_GROUP_LABELS[input.ageGroup]}):</figcaption>
          <blockquote>
            “
            {parts.map((p, i) => (
              <span key={i}>
                {p}
                {i < parts.length - 1 && <N>{name}</N>}
              </span>
            ))}
            ”
          </blockquote>
        </figure>
      </div>
    </section>
  );
}

/* ---------- d) Carrossel com páginas reais ---------- */
function Showcase({ input }: { input: BookInput }) {
  const slides = useMemo(() => showcasePages(input), [input]);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function go(delta: number) {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(slides.length - 1, index + delta));
    const slide = track.children[next] as HTMLElement | undefined;
    slide?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setIndex(Number((e.target as HTMLElement).dataset.i));
      },
      { root: track, threshold: 0.6 },
    );
    Array.from(track.children).forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [slides]);

  return (
    <section className="band band-fade" aria-labelledby="dentro">
      <div className="wrap-text center">
        <h2 id="dentro">
          Veja por dentro do livro de <N>{input.childName}</N>
        </h2>
        <p className="lead">Estas são páginas reais do livro, montadas agora com o nome que você digitou.</p>
      </div>
      <div className="carousel">
        <button className="car-arrow prev" onClick={() => go(-1)} disabled={index === 0} aria-label="Página anterior">
          ‹
        </button>
        <div className="car-track" ref={trackRef} tabIndex={0} aria-label="Páginas do livro">
          {slides.map((s, i) => (
            <figure className="car-slide" key={`${s.page}-${i}`} data-i={i}>
              <BookFrame input={input} page={s.page} title={s.caption} eager={i < 2} />
              <figcaption>{s.caption}</figcaption>
            </figure>
          ))}
        </div>
        <button className="car-arrow next" onClick={() => go(1)} disabled={index === slides.length - 1} aria-label="Próxima página">
          ›
        </button>
      </div>
      <div className="car-dots" aria-hidden="true">
        {slides.map((_, i) => (
          <span key={i} className={i === index ? "on" : ""} />
        ))}
      </div>
      <p className="center small muted">
        Quer ver uma história inteira? <Link href="/amostra">Abra a amostra com marca d’água</Link>.
      </p>
    </section>
  );
}

/* ---------- e) O que vem no livro ---------- */
const INSIDE: { art: IllustrationId; title: string; text: string }[] = [
  { art: "creation", title: "10 histórias bíblicas", text: "Da criação do mundo a Jesus abençoando as crianças." },
  { art: "children", title: "Uma oração por história", text: "Orações curtas, com o nome da criança, para orar em família." },
  { art: "ark", title: "Lições para o dia a dia", text: "Uma ideia para aprender e um desafio prático depois de cada história." },
  { art: "loaves", title: "Perguntas para conversar", text: "Para a família falar sobre a história depois da leitura." },
  { art: "nativity", title: "Atividades educativas", text: "Colorir, desenhar e, conforme a idade, caça-palavras, ligar pares ou contar." },
  { art: "storm", title: "Oração antes de dormir", text: "Uma oração especial para fechar o dia com a criança." },
  { art: "david", title: "Linguagem para a idade", text: "Versões diferentes para 2–4, 5–7 e 8–10 anos." },
  { art: "daniel", title: "Referência bíblica", text: "Cada história indica o trecho da Bíblia para ler junto." },
  { art: "cover", title: "“Este livro pertence a…”", text: "Página com o nome e espaço para foto ou desenho." },
  { art: "sea", title: "PDF para ler e imprimir", text: "Arquivo A4 para a tela ou para imprimir em casa." },
];

function Inside({ input }: { input: BookInput }) {
  const arts = useMemo(
    () => Object.fromEntries(INSIDE.map((c, i) => [c.art, illustrationSvg(c.art, input.style === "watercolor" ? "watercolor" : "colorful", { uid: `in${i}` })])),
    [input.style],
  );
  return (
    <section className="band">
      <div className="wrap-text center">
        <h2>
          O que vem no livro de <N>{input.childName}</N>
        </h2>
        <p className="lead">Tudo é produzido com o nome escolhido, na faixa etária e no estilo que você definir logo abaixo.</p>
      </div>
      <div className="wrap-wide inside-grid">
        {INSIDE.map((c) => (
          <article className="inside-card" key={c.title}>
            <div className="inside-art" dangerouslySetInnerHTML={{ __html: arts[c.art] }} />
            <h3>{c.title}</h3>
            <p>{c.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Depoimentos (só com depoimentos reais) ---------- */
function Testimonials() {
  if (TESTIMONIALS.length === 0) return null;
  return (
    <section className="band band-fade">
      <div className="wrap-wide">
        <h2 className="center">O que as famílias dizem</h2>
        <div className="testi-grid">
          {TESTIMONIALS.map((t) => (
            <figure className="card" key={t.author}>
              <blockquote>“{t.text}”</blockquote>
              <figcaption className="small muted">
                {t.author}
                {t.detail ? ` — ${t.detail}` : ""}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- f + g) Personalização + oferta ---------- */
function Checkout({
  name,
  setName,
  age,
  setAge,
  style,
  setStyle,
  price,
}: {
  name: string;
  setName: (v: string) => void;
  age: AgeGroup;
  setAge: (v: AgeGroup) => void;
  style: IllustrationStyle;
  setStyle: (v: IllustrationStyle) => void;
  price: Price;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const honeypot = useRef<HTMLInputElement>(null);
  const check = checkChildName(name);
  const display = check.ok ? check.name : "sua criança";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!check.ok) {
      setError(check.reason);
      document.getElementById("child-name")?.focus();
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_name: check.name, age_group: age, illustration_style: style, website: honeypot.current?.value ?? "" }),
      });
      const result = (await response.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !result.checkoutUrl) throw new Error(result.error ?? "Não foi possível iniciar a compra.");
      window.location.assign(result.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado. Tente novamente.");
      setBusy(false);
    }
  }

  return (
    <section className="band band-blue" id="personalizar" aria-labelledby="monte">
      <div className="wrap-text center">
        <h2 id="monte">
          Monte o livro de <N>{display}</N>
        </h2>
        <p className="lead">Confira o nome, escolha a idade e o estilo das ilustrações. A capa muda na hora.</p>
      </div>
      <form className="wrap-wide checkout" onSubmit={submit} noValidate>
        <div className="card checkout-form">
          <div className="field">
            <label htmlFor="child-name">Nome da criança</label>
            <input
              id="child-name"
              className="input"
              type="text"
              autoComplete="off"
              maxLength={CHILD_NAME_MAX}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!check.ok}
              aria-describedby="child-name-help"
            />
            <span id="child-name-help" className={check.ok ? "help" : "field-error"}>
              {check.ok ? "Exatamente como deve sair no livro, com acentos." : check.reason}
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
        </div>

        <div className="checkout-preview">
          <BookFrame input={{ childName: display === "sua criança" ? "Sua criança" : display, ageGroup: age, style }} page={1} title="Prévia da capa" className="preview-cover" />
          <p className="small muted center">Prévia da capa, atualizada na hora.</p>
        </div>

        <div className="card offer-card">
          <p className="offer-title">
            Livro bíblico personalizado de <N>{display}</N>
          </p>
          <ul className="checklist">
            <li>10 histórias bíblicas para {AGE_GROUP_LABELS[age]}</li>
            <li>Oração, lição prática e perguntas em cada história</li>
            <li>Atividades para colorir e brincar</li>
            <li>Oração antes de dormir</li>
            <li>Ilustrações no estilo {STYLE_LABELS[style].toLowerCase()}</li>
            <li>PDF A4 enviado por e-mail</li>
          </ul>
          <div className="price-box">
            {price.original && (
              <p className="price-old">
                de <s>{price.original}</s> por
              </p>
            )}
            {price.current ? (
              <p className="price-now">{price.current}</p>
            ) : (
              <p className="price-pending">O valor aparece no checkout seguro da Cakto.</p>
            )}
            <p className="small muted">pagamento único • sem assinatura</p>
          </div>
          <button className="btn btn-pill btn-block breathe" type="submit" disabled={busy}>
            {busy ? "Abrindo o checkout…" : `Quero o livro de ${display}`}
          </button>
          {error && (
            <p className="status-error" role="alert">
              {error}
            </p>
          )}
          <Trust />
          <p className="notice-digital">
            <strong>Produto digital:</strong> você recebe um arquivo PDF por e-mail. Não enviamos livro impresso.
          </p>
        </div>
      </form>
    </section>
  );
}

/* ---------- h) Garantia ---------- */
function Guarantee() {
  return (
    <section className="band">
      <div className="wrap-text">
        <div className="card guarantee">
          <div className="seal" aria-hidden="true">
            <span>7</span>
            <small>dias</small>
          </div>
          <div>
            <h2>Garantia de 7 dias</h2>
            <p>
              Se você se arrepender, pode desistir da compra em até 7 dias, com reembolso integral, como prevê o direito de
              arrependimento (art. 49 do Código de Defesa do Consumidor). Basta pedir pela Cakto ou responder ao e-mail de entrega.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- i) FAQ ---------- */
function Faq() {
  return (
    <section className="band band-fade" aria-labelledby="faq">
      <div className="wrap-text">
        <h2 id="faq" className="center">
          Perguntas frequentes
        </h2>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- j) CTA final ---------- */
function FinalCta({ name }: { name: string }) {
  return (
    <section className="band band-blue">
      <div className="wrap-text center">
        <h2>
          Que <N>{name}</N> cresça sabendo que Deus conhece o seu nome.
        </h2>
        <p className="lead">Um presente para ler junto hoje e guardar por muitos anos.</p>
        <CtaButton name={name} />
        <Trust />
      </div>
    </section>
  );
}

export default function Offer({ initialName, price }: { initialName: string; price: Price }) {
  const [name, setName] = useState(initialName);
  const [age, setAge] = useState<AgeGroup>("5-7");
  const [style, setStyle] = useState<IllustrationStyle>("colorful");
  const check = checkChildName(name);
  // O restante da página usa o último nome válido digitado.
  const [validName, setValidName] = useState(initialName);

  useEffect(() => {
    if (!check.ok) return;
    const id = setTimeout(() => {
      setValidName(check.name);
      try {
        sessionStorage.setItem(NAME_STORAGE_KEY, check.name);
      } catch {
        /* ignora */
      }
      const url = new URL(window.location.href);
      if (url.searchParams.get("nome") !== check.name) {
        url.searchParams.set("nome", check.name);
        window.history.replaceState(null, "", url.toString());
      }
    }, 300);
    return () => clearTimeout(id);
  }, [check.ok, check.ok ? check.name : ""]); // eslint-disable-line react-hooks/exhaustive-deps

  const input = useMemo<BookInput>(() => ({ childName: validName, ageGroup: age, style }), [validName, age, style]);

  return (
    <>
      <main>
        <Hero input={input} />
        <Pain name={validName} />
        <Turn input={input} />
        <Showcase input={input} />
        <Inside input={input} />
        <Testimonials />
        <Checkout name={name} setName={setName} age={age} setAge={setAge} style={style} setStyle={setStyle} price={price} />
        <Guarantee />
        <Faq />
        <FinalCta name={validName} />
      </main>
      <footer className="site-footer">
        <p>Livro bíblico infantil personalizado — produto digital (PDF). Pagamento processado pela Cakto.</p>
        <p>
          <Link href="/privacidade">Privacidade e dados</Link> · <Link href="/">Trocar o nome</Link>
        </p>
      </footer>
    </>
  );
}
