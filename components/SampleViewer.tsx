"use client";

import { useEffect, useState } from "react";
import { fontFaceCssFromUrls } from "@/lib/book/fonts";
import { renderBookHtml } from "@/lib/book/template";
import { checkChildName, CHILD_NAME_MAX } from "@/lib/names";
import { AGE_GROUP_LABELS, AGE_GROUPS, STYLE_LABELS, type AgeGroup, type IllustrationStyle } from "@/lib/validation";

/** Amostra (capa, boas-vindas e a primeira história) gerada no navegador com marca d'água. */
export default function SampleViewer() {
  const [name, setName] = useState("Miguel");
  const [age, setAge] = useState<AgeGroup>("5-7");
  const [style, setStyle] = useState<IllustrationStyle>("colorful");
  const [doc, setDoc] = useState("");
  const check = checkChildName(name);

  useEffect(() => {
    const id = setTimeout(() => {
      const c = checkChildName(name);
      const fontCss = fontFaceCssFromUrls(`${window.location.origin}/fonts`);
      setDoc(renderBookHtml({ childName: c.ok ? c.name : "Sua criança", ageGroup: age, style }, { fontCss, variant: "sample" }));
    }, 250);
    return () => clearTimeout(id);
  }, [name, age, style]);

  return (
    <div>
      <div className="form-card" style={{ marginBottom: 20 }}>
        <div className="field">
          <label htmlFor="sample-name">Nome da criança</label>
          <input id="sample-name" type="text" maxLength={CHILD_NAME_MAX} value={name} onChange={(e) => setName(e.target.value)} />
          {!check.ok && <span className="error">{check.reason}</span>}
        </div>
        <div className="grid cols-2">
          <div className="field">
            <label htmlFor="sample-age">Faixa etária</label>
            <select id="sample-age" value={age} onChange={(e) => setAge(e.target.value as AgeGroup)} style={{ minHeight: 48, borderRadius: 12, padding: 10, font: "inherit" }}>
              {AGE_GROUPS.map((g) => (
                <option key={g} value={g}>{AGE_GROUP_LABELS[g]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sample-style">Estilo</label>
            <select id="sample-style" value={style} onChange={(e) => setStyle(e.target.value as IllustrationStyle)} style={{ minHeight: 48, borderRadius: 12, padding: 10, font: "inherit" }}>
              {(Object.keys(STYLE_LABELS) as IllustrationStyle[]).map((s) => (
                <option key={s} value={s}>{STYLE_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {doc && <iframe className="sample-frame" title="Amostra do livro" srcDoc={doc} sandbox="allow-scripts" />}
    </div>
  );
}
