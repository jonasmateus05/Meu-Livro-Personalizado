import { describe, expect, it } from "vitest";
import { asciiLetters, checkChildName, escapeHtml, fileSlug, fillTemplate, normalizeChildName } from "@/lib/names";
import { personalizationSchema } from "@/lib/validation";

describe("nome da criança — validação e normalização", () => {
  it("aceita nomes curtos", () => {
    expect(checkChildName("Lu")).toEqual({ ok: true, name: "Lu" });
    expect(checkChildName("Zé")).toEqual({ ok: true, name: "Zé" });
    expect(checkChildName("A")).toEqual({ ok: true, name: "A" });
  });

  it("aceita nomes longos até 40 caracteres e recusa acima disso", () => {
    const long = "Maria Eduarda Albuquerque de Bragança";
    expect(checkChildName(long)).toEqual({ ok: true, name: long });
    const forty = "Abcdefghij Abcdefghij Abcdefghij Abcdefg"; // 40
    expect([...forty].length).toBe(40);
    expect(checkChildName(forty).ok).toBe(true);
    expect(checkChildName(forty + "h").ok).toBe(false);
  });

  it("preserva acentos e caracteres especiais (ç, ñ, ł, hífen, apóstrofo)", () => {
    for (const n of ["João Ângelo", "Ana-Lívia", "D'Ávila", "Ñuño Łukasz", "Çeylin", "Heloísa Ãngela", "João P."]) {
      const r = checkChildName(n);
      expect(r.ok, n).toBe(true);
      if (r.ok) expect(r.name).toBe(n);
    }
  });

  it("normaliza NFD para NFC e espaços/invisíveis", () => {
    const nfd = "João"; // "João" com til combinante
    expect(normalizeChildName(`  ${nfd}​   Pedro `)).toBe("João Pedro");
    expect(normalizeChildName("Ana’s")).toBe("Ana's");
  });

  it("recusa HTML, números e emojis", () => {
    for (const n of ["<script>", "Ana2", "Ana 🙂", "", "   ", "--Ana", "Ana  --  Bia"]) {
      expect(checkChildName(n).ok, n).toBe(false);
    }
  });

  it("schema do formulário aplica as mesmas regras e o campo-isca", () => {
    expect(personalizationSchema.safeParse({ child_name: " Miguel ", age_group: "5-7", illustration_style: "colorful" }).data).toEqual({
      child_name: "Miguel",
      age_group: "5-7",
      illustration_style: "colorful",
    });
    expect(personalizationSchema.safeParse({ child_name: "Miguel", age_group: "11-12", illustration_style: "colorful" }).success).toBe(false);
    expect(personalizationSchema.safeParse({ child_name: "Miguel", age_group: "5-7", illustration_style: "colorful", website: "spam" }).success).toBe(false);
  });
});

describe("substituição segura no modelo", () => {
  it("escapa HTML do valor e do texto do modelo", () => {
    expect(fillTemplate("Olá, {nome} & amigos!", { nome: "<b>x</b>" })).toBe('Olá, <span class="nm">&lt;b&gt;x&lt;/b&gt;</span> &amp; amigos!');
    expect(escapeHtml(`"'&<>`)).toBe("&quot;&#39;&amp;&lt;&gt;");
  });

  it("falha com marcador desconhecido (evita '{nmoe}' impresso)", () => {
    expect(() => fillTemplate("Olá, {nmoe}", { nome: "Ana" })).toThrow(/Marcador desconhecido/);
  });

  it("preserva o nome com acentos dentro do texto", () => {
    expect(fillTemplate("{nome}, Deus ama você!", { nome: "Ana Lívia" })).toContain("Ana Lívia");
  });

  it("gera slugs e letras ASCII para arquivo e caça-palavras", () => {
    expect(fileSlug("João Ângelo D'Ávila")).toBe("joao-angelo-d-avila");
    expect(asciiLetters("Ñuño")).toBe("NUNO");
    expect(fileSlug("")).toBe("crianca");
  });
});
