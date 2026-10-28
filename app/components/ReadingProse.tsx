import { Fragment, type ReactNode } from 'react';
import Icon, { type IconName } from './Icon';

const sectionIcon = (h: string): IconName => (h.startsWith('过去') ? 'past' : h.startsWith('现在') ? 'present' : h.startsWith('未来') ? 'future' : 'crystal_ball');

function inline(s: string, cursor?: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g;
  let last = 0, m: RegExpExecArray | null, k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(m[0].startsWith('**') ? <strong key={k++}>{m[0].slice(2, -2)}</strong> : <em key={k++}>{m[0].slice(1, -1)}</em>);
    last = m.index + m[0].length;
  }
  // hide a dangling "**" while a bold run is still streaming in
  if (last < s.length) out.push(s.slice(last).replace(/\*\*?$/, ''));
  if (cursor) out.push(<Fragment key="cursor">{cursor}</Fragment>);
  return out;
}

/** Body of one section: paragraphs, > quotes, lists, reflection line. `cursor` is appended after the last glyph. */
function Body({ md, cursor }: { md: string; cursor?: ReactNode }) {
  const lines = md.replace(/([。！？.!?”"])[ \t]*>[ \t]+/g, '$1\n> ').split('\n');
  type B = { kind: 'p' | 'q' | 'ul' | 'ol' | 'r'; lines: string[] };
  const blocks: B[] = [];
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (!l.trim()) { blocks.push({ kind: 'p', lines: [] }); continue; }
    const kind: B['kind'] = /^\s*>/.test(l) ? 'q' : /^\s*[-*•]\s+/.test(l) ? 'ul' : /^\s*\d+[.)、]\s+/.test(l) ? 'ol' : /^反思问题[::]/.test(l) ? 'r' : 'p';
    const text = l.replace(/^\s*>\s?/, '').replace(/^\s*([-*•]|\d+[.)、])\s+/, '');
    const prev = blocks[blocks.length - 1];
    if (prev && prev.kind === kind && prev.lines.length && kind !== 'r') prev.lines.push(text);
    else blocks.push({ kind, lines: [text] });
  }
  const real = blocks.filter((b) => b.lines.length);
  return (
    <>
      {real.map((b, i) => {
        const c = i === real.length - 1 ? cursor : undefined;
        if (b.kind === 'ul' || b.kind === 'ol') {
          const L = b.kind;
          return <L key={i}>{b.lines.map((t, j) => <li key={j}>{inline(t, j === b.lines.length - 1 ? c : undefined)}</li>)}</L>;
        }
        if (b.kind === 'q') return <blockquote key={i}>{inline(b.lines.join(' '), c)}</blockquote>;
        return <p key={i} className={b.kind === 'r' ? 'rd-reflect' : undefined}>{b.lines.map((t, j) => <Fragment key={j}>{j > 0 && <br />}{inline(t, j === b.lines.length - 1 ? c : undefined)}</Fragment>)}</p>;
      })}
      {!real.length && cursor}
    </>
  );
}

export function splitSections(md: string) {
  const parts = md.replace(/\r/g, '').split(/^##\s+/m);
  const pre = parts[0].trim();
  const secs = parts.slice(1).map((s) => {
    const nl = s.indexOf('\n');
    const head = (nl < 0 ? s : s.slice(0, nl)).trim();
    const [title, sub] = head.split('|').map((x) => x.trim());
    return { title, sub, body: nl < 0 ? '' : s.slice(nl + 1).trim() };
  });
  return { pre, secs };
}

export function Section({ title, sub, body, cursor }: { title: string; sub?: string; body: string; cursor?: ReactNode }) {
  return (
    <section className="rd-section">
      <h2 className="rd-h"><Icon name={sectionIcon(title)} size={22} className="text-gold self-center" />{title}{sub && <span className="rd-sub">{sub}</span>}</h2>
      <Body md={body} cursor={cursor} />
    </section>
  );
}
