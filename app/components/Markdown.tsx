import { Fragment, type ReactNode } from 'react';

/** Remove developer-only notes (demo mode / API key hints) before showing AI text to users. */
export function stripDevNotes(text: string) {
  return text
    .split('\n')
    .filter((l) => !/^\s*\[?演示模式\]?/.test(l) && !/OpenAI|API\s*密钥|API key/i.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith('**')) out.push(<strong key={k++} className="text-text font-bold">{t.slice(2, -2)}</strong>);
    else if (t.startsWith('`')) out.push(<code key={k++} className="text-gold">{t.slice(1, -1)}</code>);
    else out.push(<em key={k++}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

/** Minimal, dependency-free markdown renderer: headings, paragraphs, ordered/unordered lists, bold/italic, hr. */
export default function Markdown({ text, className = '' }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, '').replace(/([。！？.!?”"])[ \t]*>[ \t]+/g, '$1\n> ').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0, key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const lvl = h[1].length;
      blocks.push(lvl <= 2
        ? <h3 key={key++} className="font-[family-name:var(--font-display-zh)] font-bold text-[19px] text-text mt-5 first:mt-0 mb-2">{inline(h[2])}</h3>
        : <h4 key={key++} className="font-bold text-[16px] text-text mt-4 first:mt-0 mb-1">{inline(h[2])}</h4>);
      i++; continue;
    }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { blocks.push(<hr key={key++} className="border-border my-4" />); i++; continue; }
    if (/^\s*([-*•]|\d+[.)、])\s+/.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)、])\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*•]|\d+[.)、])\s+/, '')); i++; }
      const L = ordered ? 'ol' : 'ul';
      blocks.push(<L key={key++} className={`${ordered ? 'list-decimal' : 'list-disc'} pl-6 my-3 space-y-1 marker:text-primary`}>{items.map((t, j) => <li key={j}>{inline(t)}</li>)}</L>);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4})\s|^\s*([-*•]|\d+[.)、])\s+/.test(lines[i])) { para.push(lines[i]); i++; }
    blocks.push(<p key={key++} className="my-3 first:mt-0">{para.map((t, j) => <Fragment key={j}>{j > 0 && <br />}{inline(t)}</Fragment>)}</p>);
  }
  return <div className={className}>{blocks}</div>;
}
