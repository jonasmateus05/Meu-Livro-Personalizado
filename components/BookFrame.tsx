"use client";

import { useEffect, useRef, useState } from "react";
import { fontFaceCssFromUrls } from "@/lib/book/fonts";
import { renderBookHtml, type BookInput } from "@/lib/book/template";

const PAGE_WIDTH_PX = 794; // 210 mm a 96 dpi
const PAGE_HEIGHT_PX = 1123;

/**
 * Mostra UMA página real do livro (o mesmo HTML usado no PDF), escalada para
 * a largura do container. Roda num iframe isolado (sandbox sem mesma origem).
 */
export default function BookFrame({
  input,
  page,
  title,
  className,
  eager = true,
}: {
  input: BookInput;
  page: number;
  title: string;
  className?: string;
  /** false = só renderiza quando entrar na tela. */
  eager?: boolean;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [visible, setVisible] = useState(eager);
  const [doc, setDoc] = useState("");

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / PAGE_WIDTH_PX));
    ro.observe(el);
    let io: IntersectionObserver | undefined;
    if (!eager) {
      io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: "300px" });
      io.observe(el);
    }
    return () => {
      ro.disconnect();
      io?.disconnect();
    };
  }, [eager]);

  useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => {
      const fontCss = fontFaceCssFromUrls(`${window.location.origin}/fonts`);
      setDoc(renderBookHtml(input, { fontCss, variant: page === 1 ? "cover" : "pages", pages: [page], bare: true }));
    }, 120);
    return () => clearTimeout(id);
  }, [visible, input.childName, input.ageGroup, input.style, page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`book-frame ${className ?? ""}`} ref={boxRef} style={{ aspectRatio: `${PAGE_WIDTH_PX} / ${PAGE_HEIGHT_PX}` }}>
      {doc && scale > 0 && (
        <iframe
          title={title}
          srcDoc={doc}
          sandbox="allow-scripts"
          style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX, transform: `scale(${scale})` }}
          tabIndex={-1}
          aria-hidden="true"
          loading="lazy"
        />
      )}
    </div>
  );
}
