/**
 * Dibujo del widget «Importantes»: pósits clavados en una aguja (un pincho de notas), uno
 * encima de otro. El de delante es el recordatorio que toca; detrás asoman los siguientes,
 * cada uno un poco más abajo, girado a su manera y con el color de su libreta. Sin pósits
 * queda solo la aguja. El fondo, la forma y el papel salen del diseño elegido. Lo usan la vista
 * previa de la app y el widget de Android; el de iOS replica la geometría en SpikeWidget.swift.
 */
import type { WidgetDesign } from '@/store/types';
import { mix, paperFor, PASTELS } from '@/theme/palette';

import { rand, type Rect } from './postit-art';

const r1 = (n: number) => Math.round(n * 10) / 10;

export type SpikeNote = { id: string; paper: string; fold: string; line: string; strong: string };
export type SpikeStyle = Pick<WidgetDesign, 'board' | 'shape' | 'paper' | 'color' | 'glass'>;

export type SpikeLayout = {
  svg: string;
  /** Etiqueta (en la franja adhesiva, a la izquierda de la aguja). */
  label: Rect | null;
  /** Título del pósit de delante. */
  front: Rect | null;
  /** Círculo para marcarlo como hecho (la fecha va a su derecha). */
  check: Rect | null;
  /** Junto a la base: cuántos quedan detrás. */
  badge: { x: number; y: number } | null;
};

/** Cuántos pósits se dibujan detrás del de delante. */
export const SPIKE_BACK = 3;
const STEP = 9;
const TOP = 17;

function hash(s: string) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 2147483647;
  return h || 1;
}

/** Giro de cada pósit de detrás: distinto para cada recordatorio y alternando el lado. */
export function spikeTilt(id: string, index: number) {
  const rnd = rand(hash(id));
  const deg = 3 + rnd() * 4.5;
  return index % 2 ? -deg : deg;
}

/** Variación de anchura (±4) de cada pósit de detrás. */
export function spikeWidthJitter(id: string) {
  const rnd = rand(hash(id) + 11);
  rnd();
  return -4 + rnd() * 8;
}

export function spikeMetrics(w: number, h: number) {
  const wide = w > h * 1.5;
  const pad = wide ? Math.round(w * 0.1) : w > 250 ? 26 : 17;
  const pw = w - pad * 2;
  const ph = h - TOP - SPIKE_BACK * STEP - 32;
  return { cx: w / 2, x0: pad, y0: TOP, pw, ph, step: STEP, baseY: h - 13, baseRX: Math.min(48, Math.max(26, w * 0.16)), baseRY: 7 };
}

/** Tamaño del título del pósit de delante (la letra «A mano» es pequeña: las demás se reducen). */
export function spikeTitleSize(w: number, h: number, fontScale: number) {
  const wide = w > h * 1.5;
  const large = !wide && w > 250 && h > 250;
  const base = large ? 28 : wide ? 22 : 19;
  return Math.round((base * fontScale) / 1.28);
}

/** Líneas del título que caben enteras en el pósit de delante (así acaba en «…», no cortado). */
export function spikeTitleLines(w: number, h: number, frontH: number, titleSize: number) {
  const large = w <= h * 1.5 && w > 250 && h > 250;
  return Math.max(1, Math.min(large ? 7 : 2, Math.floor(frontH / Math.round(titleSize * 1.06))));
}

/** Esquinas, pliegue y borde rasgado de los pósits según la forma del diseño. */
export function spikeShape(shape: WidgetDesign['shape'], pw: number, ph: number) {
  return {
    radius: shape === 'redondo' ? Math.round(Math.min(pw, ph) * 0.09) : 3,
    fold: shape === 'doblado' ? Math.round(Math.min(pw, ph) * 0.16) : 0,
    tear: shape === 'rasgado' ? 3.5 : 0,
  };
}

/** Fondo del widget: [color de arriba, color de abajo, opacidad, ¿es oscuro?]. */
export function spikeBoard(style: SpikeStyle): { top: string; bottom: string; opacity: number; dark: boolean } {
  switch (style.board) {
    case 'oscuro':
      return { top: '#2C2926', bottom: '#1E1C1A', opacity: 1, dark: true };
    case 'pastel': {
      const base = style.color === 'auto' ? PASTELS.lavanda.paper : paperFor(style.color).paper;
      return { top: mix(base, '#FFFFFF', 0.35), bottom: mix(base, '#FFFFFF', 0.65), opacity: 1, dark: false };
    }
    case 'cristal': {
      const o = Math.round((0.08 + (1 - (style.glass ?? 0.6)) * 0.6) * 100) / 100;
      return { top: '#FFFFFF', bottom: '#FFFFFF', opacity: o, dark: false };
    }
    default:
      return { top: '#FBF8F3', bottom: '#F0E8DC', opacity: 1, dark: false };
  }
}

/** Contorno de un pósit (esquinas redondeadas, esquina doblada y borde de arriba rasgado). */
function outline(x: number, y: number, w: number, h: number, radius: number, fold: number, tear: number, seed: number) {
  let d: string;
  if (tear) {
    const rnd = rand(seed);
    const n = Math.max(8, Math.round(w / 8));
    d = `M ${r1(x)} ${r1(y + tear)}`;
    for (let i = 1; i <= n; i++) d += ` L ${r1(x + (w * i) / n)} ${r1(y + (i % 2 ? rnd() * tear * 0.5 : tear * (0.65 + rnd() * 0.35)))}`;
    d += ` L ${r1(x + w)} ${r1(y + h - (fold || radius))}`;
  } else {
    d = `M ${r1(x + radius)} ${r1(y)} H ${r1(x + w - radius)} Q ${r1(x + w)} ${r1(y)} ${r1(x + w)} ${r1(y + radius)} V ${r1(y + h - (fold || radius))}`;
  }
  d += fold ? ` L ${r1(x + w - fold)} ${r1(y + h)}` : ` Q ${r1(x + w)} ${r1(y + h)} ${r1(x + w - radius)} ${r1(y + h)}`;
  d += ` H ${r1(x + radius)} Q ${r1(x)} ${r1(y + h)} ${r1(x)} ${r1(y + h - radius)}`;
  d += tear ? ` L ${r1(x)} ${r1(y + tear)} Z` : ` V ${r1(y + radius)} Q ${r1(x)} ${r1(y)} ${r1(x + radius)} ${r1(y)} Z`;
  return d;
}

/** Renglones, cuadros o puntos del papel del pósit de delante. */
function pattern(paper: WidgetDesign['paper'], x: number, y: number, w: number, h: number, line: string, gap: number) {
  const g: string[] = [];
  if (paper === 'rayas') {
    for (let ly = y + 17 + gap; ly < y + h - 4; ly += gap) g.push(`<line x1="${r1(x)}" y1="${r1(ly)}" x2="${r1(x + w)}" y2="${r1(ly)}" stroke="${line}" stroke-width="1"/>`);
  } else if (paper === 'cuadricula') {
    for (let gx = x + 9; gx < x + w; gx += 9) g.push(`<line x1="${r1(gx)}" y1="${r1(y)}" x2="${r1(gx)}" y2="${r1(y + h)}" stroke="${line}" stroke-opacity="0.7" stroke-width="0.7"/>`);
    for (let gy = y + 9; gy < y + h; gy += 9) g.push(`<line x1="${r1(x)}" y1="${r1(gy)}" x2="${r1(x + w)}" y2="${r1(gy)}" stroke="${line}" stroke-opacity="0.7" stroke-width="0.7"/>`);
  } else if (paper === 'puntos') {
    for (let gx = x + 5; gx < x + w; gx += 10) for (let gy = y + 5; gy < y + h; gy += 10) g.push(`<circle cx="${r1(gx)}" cy="${r1(gy)}" r="1" fill="${line}"/>`);
  }
  return g.join('');
}

type PostOpts = { radius: number; fold: number; tear: number; patternXml?: string; clipId?: string };

function post(x: number, y: number, w: number, h: number, note: SpikeNote, o: PostOpts, pierce: { x: number; y: number }, deg: number) {
  const d = outline(x, y, w, h, o.radius, o.fold, o.tear, Math.round(w * 31 + h) + hash(note.id));
  const parts: string[] = [];
  parts.push(
    `<path d="${d}" fill="#000000" fill-opacity="0.07" transform="translate(0 1.8)"/>`,
    `<path d="${d}" fill="#000000" fill-opacity="0.05" transform="translate(0 0.7)"/>`,
    `<path d="${d}" fill="${note.paper}"/>`
  );
  if (o.patternXml && o.clipId) parts.push(`<defs><clipPath id="${o.clipId}"><path d="${d}"/></clipPath></defs><g clip-path="url(#${o.clipId})">${o.patternXml}</g>`);
  // Franja adhesiva arriba.
  parts.push(`<rect x="${r1(x)}" y="${r1(y + o.tear)}" width="${r1(w)}" height="${r1(Math.min(15, h * 0.13))}" rx="${Math.min(3, o.radius)}" fill="#000000" fill-opacity="0.035"/>`);
  if (o.fold) {
    const fx = x + w - o.fold;
    const fy = y + h - o.fold;
    parts.push(`<path d="M ${r1(fx)} ${r1(y + h)} L ${r1(x + w)} ${r1(fy)} L ${r1(fx + o.fold * 0.08)} ${r1(fy)} Q ${r1(fx)} ${r1(fy)} ${r1(fx)} ${r1(fy + o.fold * 0.08)} Z" fill="${note.fold}"/>`);
  }
  // Agujero por donde pasa la aguja.
  parts.push(
    `<circle cx="${r1(pierce.x)}" cy="${r1(pierce.y)}" r="3.6" fill="#000000" fill-opacity="0.08"/>`,
    `<circle cx="${r1(pierce.x)}" cy="${r1(pierce.y)}" r="2.2" fill="#3B3632" fill-opacity="0.6"/>`
  );
  return deg ? `<g transform="rotate(${r1(deg)} ${r1(pierce.x)} ${r1(pierce.y)})">${parts.join('')}</g>` : parts.join('');
}

export function spikeArt(w: number, h: number, notes: SpikeNote[], style: SpikeStyle, opts: { radius?: number; titleSize?: number } = {}): SpikeLayout {
  const radius = opts.radius ?? 22;
  const m = spikeMetrics(w, h);
  const { cx, x0, y0, pw, ph, step, baseY, baseRX, baseRY } = m;
  const empty = notes.length === 0;
  const board = spikeBoard(style);
  const shape = spikeShape(style.shape, pw, ph);
  // Sin pósits queda solo la aguja, entera.
  const tip = empty ? Math.round(h * 0.12) : 6;
  const parts: string[] = [];

  parts.push(
    `<defs>` +
      `<linearGradient id="desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${board.top}"/><stop offset="1" stop-color="${board.bottom}"/></linearGradient>` +
      `<linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8C939C"/><stop offset="0.5" stop-color="#E6E9ED"/><stop offset="1" stop-color="#969DA6"/></linearGradient>` +
      `<linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A7067"/><stop offset="1" stop-color="#3E3934"/></linearGradient>` +
      `</defs>`,
    `<rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" fill="url(#desk)" fill-opacity="${board.opacity}"${
      style.board === 'cristal' ? ` stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="1"` : ''
    }/>`
  );

  const shaft = (from: number, to: number) =>
    `<rect x="${r1(cx - 1.5)}" y="${r1(from)}" width="3" height="${r1(Math.max(0, to - from))}" fill="url(#steel)"/>`;
  const point = `<path d="M ${r1(cx - 1.5)} ${r1(tip + 9)} L ${r1(cx + 1.5)} ${r1(tip + 9)} L ${r1(cx)} ${r1(tip)} Z" fill="#AEB4BC"/>`;

  // Aguja entera (detrás de todo) y la base, en la que se clava.
  parts.push(shaft(tip + 8.5, baseY - 1), point);
  parts.push(
    `<ellipse cx="${r1(cx)}" cy="${r1(baseY + 3)}" rx="${r1(baseRX * 1.12)}" ry="${r1(baseRY * 1.3)}" fill="#000000" fill-opacity="${board.dark ? 0.3 : 0.1}"/>`,
    `<ellipse cx="${r1(cx)}" cy="${r1(baseY)}" rx="${r1(baseRX)}" ry="${baseRY}" fill="url(#base)"/>`,
    `<ellipse cx="${r1(cx)}" cy="${r1(baseY - 2)}" rx="${r1(baseRX * 0.84)}" ry="${r1(baseRY * 0.5)}" fill="#958A80" fill-opacity="0.55"/>`,
    `<ellipse cx="${r1(cx)}" cy="${r1(baseY - 2)}" rx="2.6" ry="1.2" fill="#2E2A26" fill-opacity="0.7"/>`
  );

  if (empty) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join('')}</svg>`;
    return { svg, label: null, front: null, check: null, badge: null };
  }

  // Los de detrás, del más bajo al más alto; cada uno girado sobre su agujero.
  const back = notes.slice(1, 1 + SPIKE_BACK);
  for (let i = back.length; i >= 1; i--) {
    const n = back[i - 1];
    const bw = pw + spikeWidthJitter(n.id);
    const y = y0 + i * step;
    parts.push(post(cx - bw / 2, y, bw, ph, n, { ...shape, fold: 0 }, { x: cx, y: y + 10 }, spikeTilt(n.id, i)));
  }

  // El de delante, recto para que se lea bien, con el papel del diseño.
  const front = notes[0];
  const gap = r1((opts.titleSize ?? 19) * 1.06);
  const patternXml = style.paper === 'liso' ? undefined : pattern(style.paper, x0, y0, pw, ph, front.line, gap);
  parts.push(post(x0, y0, pw, ph, front, { ...shape, patternXml, clipId: 'front' }, { x: cx, y: y0 + 10 }, 0));
  // La aguja asoma por el agujero del pósit de delante.
  parts.push(shaft(tip + 8.5, y0 + 10), point);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join('')}</svg>`;
  // Abajo a la izquierda el círculo para marcarlo como hecho (a la derecha queda la esquina doblada).
  const size = 20;
  const check = { x: x0 + 12, y: y0 + ph - 8 - size, w: size, h: size };
  return {
    svg,
    label: { x: x0 + 12, y: y0 + 2 + shape.tear, w: pw / 2 - 12 - 8, h: 13 },
    front: { x: x0 + 12, y: y0 + 17 + shape.tear, w: pw - 24, h: check.y - 3 - (y0 + 17 + shape.tear) },
    check,
    badge: notes.length > 1 ? { x: cx + baseRX + 8, y: baseY - 9 } : null,
  };
}
