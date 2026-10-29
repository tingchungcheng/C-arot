'use client';
import { useLayoutEffect, useRef, useState } from 'react';

/** Stacked card title: primary name (serif 22/600, text) over the English name (italic serif 16, text-2, nowrap; drops to 14px if it would overflow). Fixed two-line height so neighbouring chips line up. */
export default function CardTitle({ primary, secondary }: { primary: string; secondary?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [small, setSmall] = useState(false);
  const [wrap, setWrap] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = '16px'; el.style.whiteSpace = 'nowrap';
      const s = el.scrollWidth > el.clientWidth;
      el.style.fontSize = '14px';
      const w = s && el.scrollWidth > el.clientWidth;
      el.style.fontSize = ''; el.style.whiteSpace = '';
      setSmall(s); setWrap(w);
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    return () => ro.disconnect();
  }, [secondary]);
  return (
    <p className="mt-1 min-h-[52px] flex flex-col items-center text-center">
      <span className="block font-[family-name:var(--font-display-zh)] text-[22px] font-semibold leading-[28px] text-text">{primary}</span>
      {secondary && secondary !== primary && (
        <span ref={ref} className={`block w-full mt-1 font-display italic leading-[20px] text-text-2 ${small ? 'text-[14px]' : 'text-[16px]'} ${wrap ? 'whitespace-normal' : 'whitespace-nowrap'}`}>{secondary}</span>
      )}
    </p>
  );
}
