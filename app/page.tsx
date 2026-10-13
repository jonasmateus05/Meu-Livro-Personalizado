import Image from "next/image";
import Link from "next/link";
import PersonalizeForm from "@/components/PersonalizeForm";
import { STORIES } from "@/lib/book/stories";

// Preço exibido somente se configurado (o valor real é o do checkout da Cakto).
const PRICE_LABEL = process.env.NEXT_PUBLIC_PRICE_LABEL?.trim() || undefined;

const GALLERY = [
  { src: "/amostras/miguel-colorido-p01.jpg", alt: "Capa do livro com o nome Miguel", caption: "Capa com o nome da criança" },
  { src: "/amostras/miguel-colorido-p03.jpg", alt: "Página de boas-vindas personalizada para Miguel", caption: "Carta de boas-vindas" },
  { src: "/amostras/miguel-colorido-p09.jpg", alt: "Abertura da história de Noé com ilustração da arca", caption: "Abertura de cada história" },
  { src: "/amostras/miguel-colorido-p10.jpg", alt: "Página com a história de Noé recontada para 5 a 7 anos", caption: "História recontada (5 a 7 anos)" },
  { src: "/amostras/miguel-colorido-p11.jpg", alt: "Página com lição, prática, oração e perguntas da história de Noé", caption: "Lição, oração e perguntas" },
  { src: "/amostras/miguel-colorido-p36.jpg", alt: "Página para colorir com a arca de Noé", caption: "Páginas para colorir" },
  { src: "/amostras/ana-livia-aquarela-p01.jpg", alt: "Capa em estilo aquarela com o nome Ana Lívia", caption: "Estilo aquarela" },
  { src: "/amostras/ana-livia-aquarela-p07.jpg", alt: "História da criação em frases curtas para 2 a 4 anos", caption: "Texto para 2 a 4 anos" },
];

const FAQ = [
  {
    q: "É um livro impresso?",
    a: "Não. É um produto digital: um arquivo PDF em tamanho A4, enviado por e-mail. Você pode ler no celular, tablet ou computador e imprimir em casa ou numa gráfica, para uso pessoal e familiar.",
  },
  {
    q: "Quando recebo o livro?",
    a: "O PDF é produzido depois que a Cakto confirma o pagamento. Em seguida, enviamos um link seguro para o e-mail usado na compra. O tempo de confirmação depende do meio de pagamento escolhido no checkout.",
  },
  {
    q: "As histórias são fiéis à Bíblia?",
    a: "As dez histórias seguem os acontecimentos dos textos bíblicos indicados e são recontadas com palavras simples para a idade escolhida. Elas não são citações literais: ao lado de cada título há a referência bíblica para a família ler o texto completo.",
  },
  {
    q: "Posso usar nomes com acento ou nomes compostos?",
    a: "Sim. Acentos, cedilha, hífen e apóstrofo são preservados (ex.: “Ana Lívia”, “João Pedro”, “D'Ávila”). Use até 40 caracteres e confira a prévia da capa antes de pagar.",
  },
  {
    q: "Posso comprar livros para mais de uma criança?",
    a: "Sim. Faça uma personalização e uma compra para cada criança, mesmo usando o mesmo e-mail. Cada compra gera um livro separado.",
  },
  {
    q: "As ilustrações são de quem?",
    a: "Todas as ilustrações e textos foram criados especialmente para este livro. As fontes usadas têm licença aberta (SIL Open Font License).",
  },
  {
    q: "E se eu precisar de reembolso?",
    a: "As condições de reembolso são as informadas no checkout. Quando um pagamento é reembolsado ou contestado, o link de download daquele pedido é desativado.",
  },
  {
    q: "Quais dados vocês guardam?",
    a: "Apenas o necessário para produzir e entregar o livro: nome da criança, faixa etária e estilo escolhidos, e o e-mail do comprador informado pela Cakto. Dados de pagamento ficam com a Cakto.",
  },
];

export default function Home() {
  return (
    <>
      <a className="skip" href="#personalizar">
        Pular para a personalização
      </a>
      <header className="topbar">
        <div className="wrap">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              ✦
            </span>
            A Bíblia Infantil Personalizada
          </Link>
          <a className="btn" href="#personalizar">
            Personalizar
          </a>
        </div>
      </header>

      <main id="conteudo">
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <span className="kicker">Livro digital em PDF</span>
              <h1>Uma Bíblia infantil com o nome da sua criança</h1>
              <p className="lead">
                Dez histórias bíblicas recontadas para a idade dela, com uma oração e uma lição prática em cada história,
                atividades para colorir e brincar e uma oração antes de dormir.
              </p>
              <ul className="checks">
                <li>O nome da criança na capa e ao longo das páginas</li>
                <li>Linguagem pensada para 2 a 4, 5 a 7 ou 8 a 10 anos</li>
                <li>Ilustrações originais em estilo colorido ou aquarela</li>
              </ul>
              <div className="hero-actions">
                <a className="btn" href="#personalizar">
                  Criar o livro
                </a>
                <a className="btn ghost" href="#por-dentro">
                  Ver páginas
                </a>
              </div>
              <p className="notice-digital">
                <span aria-hidden="true">📄</span>
                <span>
                  <strong>Atenção:</strong> este é um produto digital. Você recebe um PDF por e-mail, não um livro
                  impresso.
                </span>
              </p>
            </div>
            <div className="hero-mock" aria-hidden="true">
              <Image className="back" src="/amostras/miguel-colorido-p10.jpg" alt="" width={794} height={1123} priority />
              <Image className="front" src="/amostras/miguel-colorido-p01.jpg" alt="" width={794} height={1123} priority />
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="dentro-titulo">
          <div className="wrap">
            <div className="center">
              <span className="kicker">O que vem no livro</span>
              <h2 id="dentro-titulo">Histórias, orações e atividades para viver a fé em família</h2>
              <p className="lead">Cada história tem três páginas: a abertura ilustrada, o texto e uma página para pensar, praticar e orar.</p>
            </div>
            <div className="grid cols-3" style={{ marginTop: 28 }}>
              <div className="card">
                <div className="icon" aria-hidden="true">📖</div>
                <h3>10 histórias bíblicas</h3>
                <p>Da criação do mundo a Jesus abençoando as crianças, sempre com a referência bíblica indicada.</p>
              </div>
              <div className="card">
                <div className="icon" aria-hidden="true">🙏</div>
                <h3>Oração e lição prática</h3>
                <p>Uma oração simples, uma ideia para aprender e um desafio para praticar depois de cada história.</p>
              </div>
              <div className="card">
                <div className="icon" aria-hidden="true">🖍️</div>
                <h3>Atividades educativas</h3>
                <p>Páginas para colorir, desenho em família e, conforme a idade, contar e circular, caça-palavras, ligar pares e caderno de gratidão.</p>
              </div>
            </div>
            <h3 style={{ marginTop: 40 }}>As dez histórias</h3>
            <ol className="stories">
              {STORIES.map((s) => (
                <li key={s.id}>
                  <b>{s.title}</b>
                  <small>Recontada a partir de {s.reference}</small>
                </li>
              ))}
            </ol>
            <p className="fine">E ainda: página “Este livro pertence a”, carta de boas-vindas com o nome da criança, orientações para a família e uma oração antes de dormir.</p>
          </div>
        </section>

        <section className="section sky" id="por-dentro" aria-labelledby="galeria-titulo">
          <div className="wrap">
            <div className="center">
              <span className="kicker">Veja por dentro</span>
              <h2 id="galeria-titulo">Páginas reais geradas pelo sistema</h2>
              <p className="lead">Estas imagens foram geradas pelo mesmo modelo usado no seu PDF, com os nomes “Miguel” e “Ana Lívia” como exemplo.</p>
            </div>
            <div className="gallery" style={{ marginTop: 28 }}>
              {GALLERY.map((g) => (
                <figure key={g.src}>
                  <Image src={g.src} alt={g.alt} width={794} height={1123} loading="lazy" sizes="(min-width: 720px) 25vw, 50vw" />
                  <figcaption>{g.caption}</figcaption>
                </figure>
              ))}
            </div>
            <p className="center" style={{ marginTop: 24 }}>
              <Link className="btn ghost" href="/amostra">
                Ver uma amostra com o nome da sua criança
              </Link>
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="idades-titulo">
          <div className="wrap">
            <div className="center">
              <span className="kicker">Para cada idade</span>
              <h2 id="idades-titulo">O texto acompanha a fase da criança</h2>
            </div>
            <div className="grid cols-3" style={{ marginTop: 28 }}>
              <div className="card">
                <h3>2 a 4 anos</h3>
                <p>Frases curtas, letra grande, perguntas para apontar na figura e atividade de contar e circular.</p>
              </div>
              <div className="card">
                <h3>5 a 7 anos</h3>
                <p>Histórias com começo, meio e fim para ler em família, perguntas para conversar, caça-palavras e ligar pares.</p>
              </div>
              <div className="card">
                <h3>8 a 10 anos</h3>
                <p>Mais detalhes dos textos bíblicos, desafios práticos para a semana, perguntas de reflexão e caderno de gratidão.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section alt" aria-labelledby="como-titulo">
          <div className="wrap">
            <div className="center">
              <span className="kicker">Como funciona</span>
              <h2 id="como-titulo">Do nome ao PDF no seu e-mail</h2>
            </div>
            <ol className="steps" style={{ marginTop: 28 }}>
              <li>
                <h3>Personalize</h3>
                <p>Digite o nome, escolha a faixa etária e o estilo. A capa aparece na hora.</p>
              </li>
              <li>
                <h3>Pague na Cakto</h3>
                <p>Você é levado ao checkout seguro da Cakto para concluir o pagamento.</p>
              </li>
              <li>
                <h3>Produzimos o PDF</h3>
                <p>Com o pagamento confirmado, o livro é gerado e conferido automaticamente.</p>
              </li>
              <li>
                <h3>Receba por e-mail</h3>
                <p>Você recebe um link seguro e pessoal para baixar o PDF.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="section" id="personalizar" aria-labelledby="form-titulo">
          <div className="wrap">
            <div className="center" style={{ marginBottom: 28 }}>
              <span className="kicker">Personalize agora</span>
              <h2 id="form-titulo">Monte o livro da sua criança</h2>
              <p className="lead">Confira a capa com o nome exatamente como deve sair no livro.</p>
            </div>
            <PersonalizeForm priceLabel={PRICE_LABEL} />
          </div>
        </section>

        <section className="section alt" aria-labelledby="faq-titulo">
          <div className="wrap">
            <h2 id="faq-titulo" className="center">
              Perguntas frequentes
            </h2>
            <div className="faq" style={{ marginTop: 24 }}>
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="wrap">
          <p>A Bíblia Infantil Personalizada — produto digital (PDF). Pagamento processado pela Cakto.</p>
          <p>
            <Link href="/privacidade">Privacidade e dados</Link>
          </p>
        </div>
      </footer>
    </>
  );
}
