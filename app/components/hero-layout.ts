// Pure layout logic for the landing-hero card shuffle (no DOM), so it can be checked over many seeds.
import { MAJOR, MINOR, CARD_BACK_SRC } from './tarot-art-data';

export type Rect = { l: number; t: number; r: number; b: number };
export type Geo = {
  stage: Rect;          // hero image box, viewport px at scrollY 0
  vw: number; vh: number;
  navBottom: number;    // bottom edge of the fixed header
  avoid: Rect[];        // e.g. the text column on desktop
  bp: 'sm' | 'md' | 'xl';
};
export type Placed = { cx: number; cy: number; w: number; h: number; rot: number; back: boolean; src: string; alt: string; overlap: number };

// Spot = preferred centre as a fraction of the stage box; the fit pass slides it along the line
// from the stage centre until every constraint holds.
type Spot = { x: number; y: number; mx: number; my: number; back: boolean; rot?: number };
const FIXED: Spot[] = [
  { x: 0.95, y: 0.2, mx: 0.8, my: 1.08, back: false },  // front: xl right-top · sm/md under the hero, right
  { x: 0.82, y: 1.0, mx: 0.2, my: 1.08, back: false },  // front: xl bottom-right (below the lower foot) · sm/md under, left
  { x: 0.6, y: 0.08, mx: 0.1, my: 0.26, back: true },   // back: xl tucks under the top edge (the text column is to the left) · sm/md top-left
  { x: 0.98, y: 0.66, mx: 0.5, my: 1.1, back: false },  // front: xl right-middle · md under, centre
];
// Desktop anchors traced from tingcc's preferred layout (fractions of the stage box, base rotation in deg).
const XL: Spot[] = [
  { x: 0.925, y: 0.2, mx: 0, my: 0, back: false, rot: 8 },    // front: top right (Chariot spot)
  { x: 0.92, y: 0.79, mx: 0, my: 0, back: false, rot: -8 },   // front: middle right
  { x: 0.58, y: 1.0, mx: 0, my: 0, back: false, rot: -5 },    // front: bottom centre, over the lower edge
  { x: 0.07, y: 0.08, mx: 0, my: 0, back: true, rot: 0 },     // back: top left, above the hero
  { x: 0.22, y: 1.02, mx: 0, my: 0, back: true, rot: -10 },   // back: bottom left, behind the watch
];
const EXTRA: Spot[] = [
  { x: 0.82, y: 0.06, mx: 0.5, my: 0, back: true },     // back, top-right (xl only)
  { x: 0.58, y: 0.94, mx: 0.3, my: 1, back: true },    // back, behind the legs (xl only)
];
// Never covered by a front card (fractions of the stage box): face, pocket watch, Alice, rabbit body/feet.
export const PROTECT: Rect[] = [
  { l: 0.28, t: 0.25, r: 0.48, b: 0.47 }, // face + glasses
  { l: 0.2, t: 0.6, r: 0.46, b: 0.97 },   // pocket watch + chain
  { l: 0.0, t: 0.4, r: 0.22, b: 0.62 },   // Alice
  { l: 0.3, t: 0.33, r: 0.78, b: 0.95 },  // body, coat tails
  { l: 0.78, t: 0.38, r: 0.88, b: 0.5 },  // raised foot
  { l: 0.6, t: 0.64, r: 0.84, b: 0.75 },  // lower foot
];
const SLUGS = [...MAJOR, ...MINOR];
export const MOTION_PAD = 18; // float ±6 + parallax 12
export const NAV_GAP = 24;
const MAX_OVERLAP = 0.3, XL_MAX_OVERLAP = 1, MIN_OVERLAP = 0.2, AIM = 0.25;

export function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const area = (r: Rect) => Math.max(0, r.r - r.l) * Math.max(0, r.b - r.t);
const inter = (a: Rect, b: Rect): Rect => ({ l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) });
const hits = (a: Rect, b: Rect) => area(inter(a, b)) > 0;
export function bbox(cx: number, cy: number, w: number, h: number, rot: number): Rect {
  const a = (Math.abs(rot) * Math.PI) / 180;
  const W = w * Math.cos(a) + h * Math.sin(a), H = w * Math.sin(a) + h * Math.cos(a);
  return { l: cx - W / 2, t: cy - H / 2, r: cx + W / 2, b: cy + H / 2 };
}
const grow = (r: Rect, p: number): Rect => ({ l: r.l - p, t: r.t - p, r: r.r + p, b: r.b + p });

export function makeLayout(seed: number, g: Geo, dbg?: Record<string, number>): Placed[] {
  const no = (k: string) => { if (dbg) dbg[k] = (dbg[k] ?? 0) + 1; };
  const rnd = mulberry32(seed);
  const extra = EXTRA[Math.floor(rnd() * EXTRA.length)];
  const spots = g.bp === 'xl' ? XL : [...FIXED, extra];
  const n = g.bp === 'xl' ? 5 : g.bp === 'md' ? 4 : 3;
  const nFaces = rnd() < 0.5 ? 2 : 3;
  const order = [0, 1, 2, 3, 4].sort(() => rnd() - 0.5).filter((i) => i < n);
  const faceSlots = new Set(order.slice(0, Math.min(nFaces, n)));
  // at least one sharp front card always shows a face
  const fronts = spots.slice(0, n).map((s, i) => (s.back ? -1 : i)).filter((i) => i >= 0);
  if (!fronts.some((i) => faceSlots.has(i))) faceSlots.add(fronts[Math.floor(rnd() * fronts.length)]);
  const pool = [...SLUGS];
  const S = g.stage, sw = S.r - S.l, sh = S.b - S.t, scx = S.l + sw / 2, scy = S.t + sh / 2;
  const maxOv = g.bp === 'xl' ? XL_MAX_OVERLAP : MAX_OVERLAP;
  // xl: fronts may cross props, feet and edges (as in the reference), never the face
  const protect = (g.bp === 'xl' ? PROTECT.slice(0, 1) : PROTECT).map((p) => ({ l: S.l + p.l * sw, t: S.t + p.t * sh, r: S.l + p.r * sw, b: S.t + p.b * sh }));
  const safe: Rect = { l: MOTION_PAD + 8, t: g.navBottom + NAV_GAP + MOTION_PAD, r: g.vw - MOTION_PAD - 8, b: g.vh - MOTION_PAD };
  const inSafe = (r: Rect) => r.l >= safe.l && r.t >= safe.t && r.r <= safe.r && r.b <= safe.b;
  const jit = 12;
  const out: Placed[] = [];

  spots.slice(0, n).forEach((s, i) => {
    const wFront = g.bp === 'xl' ? 150 : 90, wBack = wFront * 0.75; // back cards: 0.75× scale
    const rot = s.rot !== undefined ? s.rot - 8 + rnd() * 16 : -18 + rnd() * 36;
    const fx = g.bp === 'xl' ? s.x : s.mx, fy = g.bp === 'xl' ? s.y : s.my;
    const x0 = S.l + fx * sw + (rnd() * 2 - 1) * jit, y0 = S.t + fy * sh + (rnd() * 2 - 1) * jit;
    let dx = x0 - scx, dy = y0 - scy; const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    let src = CARD_BACK_SRC, alt = '';
    if (faceSlots.has(i)) { const slug = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; src = `/cards/${slug}.webp`; alt = slug; }
    const others = out.map((o) => bbox(o.cx, o.cy, o.w, o.h, o.rot));

    const tryFit = (back: boolean) => {
      const w = back ? wBack : wFront, h = w * 1.75;
      let best: { cx: number; cy: number; ov: number; score: number } | null = null;
      // slide along the radial line and along the outward normal of the nearest stage edge
      const ex = (x0 - S.l) / sw, ey = (y0 - S.t) / sh;
      const dEdge = [ex, 1 - ex, ey, 1 - ey], m = dEdge.indexOf(Math.min(...dEdge));
      const axis = [[-1, 0], [1, 0], [0, -1], [0, 1]][m];
      for (const [ux, uy] of [[dx, dy], axis]) for (let step = -60; step <= 60; step++) {
        const k = step * 4, cx = x0 + ux * k, cy = y0 + uy * k;
        const bb = bbox(cx, cy, w, h, rot);
        if (!inSafe(bb)) { no(`${i}${back ? 'b' : ''}:viewport`); continue; }
        if (g.avoid.some((a) => hits(bb, a))) { no(`${i}${back ? 'b' : ''}:text`); continue; }
        if (others.some((o) => area(inter(bb, o)) > 0.25 * area(bb))) { no(`${i}${back ? 'b' : ''}:cards`); continue; }
        const ov = area(inter(bb, S)) / area(bb);
        if (!back) {
          if (ov > maxOv) { no(`${i}:ov`); continue; }
          if (protect.some((p) => hits(bb, p))) { no(`${i}:protect`); continue; }
          const score = g.bp === 'xl' ? Math.abs(k) : (ov >= MIN_OVERLAP ? 0 : 1) + Math.abs(ov - AIM) + Math.abs(k) / 2000;
          if (!best || score < best.score) best = { cx, cy, ov, score };
        } else {
          const score = Math.abs(k);
          if (!best || score < best.score) best = { cx, cy, ov, score };
        }
      }
      if (!best && !back) {
        // front cards are never demoted: move outward / nudge anywhere legal in the viewport, closest to the target
        for (let cy = safe.t; cy <= safe.b; cy += 8) for (let cx = safe.l; cx <= safe.r; cx += 8) {
          const bb = bbox(cx, cy, w, h, rot);
          if (!inSafe(bb) || g.avoid.some((a) => hits(bb, a)) || others.some((o) => area(inter(bb, o)) > 0.25 * area(bb))) continue;
          const ov = area(inter(bb, S)) / area(bb);
          if (ov > maxOv || protect.some((p) => hits(bb, p))) continue;
          const score = (ov >= MIN_OVERLAP ? 0 : 1) + Math.abs(ov - AIM) + Math.hypot(cx - x0, cy - y0) / 2000;
          if (!best || score < best.score) best = { cx, cy, ov, score };
        }
      }
      if (!best && back) {
        // back cards may hide anywhere behind the hero: scan the stage for the closest legal spot
        for (let cy = S.t; cy <= S.b; cy += 24) for (let cx = S.l; cx <= S.r; cx += 24) {
          const bb = bbox(cx, cy, w, h, rot);
          if (!inSafe(bb) || g.avoid.some((a) => hits(bb, a)) || others.some((o) => area(inter(bb, o)) > 0.25 * area(bb))) continue;
          const score = Math.hypot(cx - x0, cy - y0);
          if (!best || score < best.score) best = { cx, cy, ov: area(inter(bb, S)) / area(bb), score };
        }
      }
      return best && { cx: best.cx, cy: best.cy, w, h, ov: best.ov };
    };
    const back = s.back, f = tryFit(back);
    if (!f) no(`${i}:DROPPED`);
    if (f) out.push({ cx: f.cx, cy: f.cy, w: f.w, h: f.h, rot, back, src, alt, overlap: f.ov });
  });
  return out;
}

/*
 * Desktop needs exactly 3 sharp fronts (≥1 face) + 2 blurred backs. Cards move outward/nudge first
 * (makeLayout); only if that can't work is the hero trimmed in 2% steps, keeping its left edge
 * (the 32px text gap) and vertical centre, which frees room on the right, top and bottom.
 */
export function fitLayout(seed: number, g: Geo, dbg?: Record<string, number>): { cards: Placed[]; scale: number } {
  const ok = (c: Placed[]) => {
    if (g.bp !== 'xl') return true;
    const f = c.filter((x) => !x.back);
    return f.length === 3 && c.length === 5 && f.some((x) => x.alt);
  };
  const S = g.stage, w = S.r - S.l, h = S.b - S.t, cy = (S.t + S.b) / 2;
  let last: Placed[] = [];
  for (let scale = 1; scale >= 0.95 - 1e-9; scale -= 0.01) {
    const stage = { l: S.l, r: S.l + w * scale, t: cy - (h * scale) / 2, b: cy + (h * scale) / 2 };
    last = makeLayout(seed, { ...g, stage }, dbg);
    if (ok(last)) return { cards: last, scale };
  }
  return { cards: last, scale: 0.95 };
}
