/**
 * Dibujo del widget «Importantes»: pósits clavados en una aguja (un pincho de notas), uno
 * encima de otro. El de delante es el recordatorio que toca; detrás asoman los siguientes,
 * cada uno un poco más abajo y girado a su manera. Lo usan la vista previa de la app y el
 * widget de Android; el de iOS replica la geometría en targets/widget/SpikeWidget.swift.
 */
import { rand, type Rect } from './postit-art';

const r1 = (n: number) => Math.round(n * 10) / 10;

export type SpikeNote = { id: string; paper: string; fold: string };

export type SpikeLayout = {
  svg: string;
  /** Etiqueta (en la franja adhesiva, a la izquierda de la aguja). */
  label: Rect | null;
  /** Título del pósit de delante. */
  front: Rect | null;
  /** Círculo para marcarlo como hecho (la fecha va a su derecha). */
  check: Rect | null;
  /** Mensaje de la aguja vacía. */
  empty: Rect | null;
  /** Junto a la base: cuántos quedan detrás. */
  badge: { x: number; y: number } | null;
};

/** Cuántos pósits se dibujan detrás del de delante. */
export const SPIKE_BACK = 3;
const STEP = 7;
const TOP = 17;

function hash(s: string) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 2147483647;
  return h || 1;
}

/** Giro de cada pósit de detrás: distinto para cada recordatorio y alternando el lado. */
export function spikeTilt(id: string, index: number) {
  const rnd = rand(hash(id));
  const deg = 2.5 + rnd() * 4.5;
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

function post(x: number, y: number, w: number, h: number, paper: string, fold: string | null, pierce: { x: number; y: number }, deg: number) {
  const parts: string[] = [];
  const f = fold ? Math.round(Math.min(w, h) * 0.16) : 0;
  const shape = f
    ? `M ${r1(x + 3)} ${r1(y)} H ${r1(x + w - 3)} Q ${r1(x + w)} ${r1(y)} ${r1(x + w)} ${r1(y + 3)} V ${r1(y + h - f)} L ${r1(x + w - f)} ${r1(y + h)} H ${r1(x + 3)} Q ${r1(x)} ${r1(y + h)} ${r1(x)} ${r1(y + h - 3)} V ${r1(y + 3)} Q ${r1(x)} ${r1(y)} ${r1(x + 3)} ${r1(y)} Z`
    : null;
  const body = (fill: string, extra = '', dy = 0) =>
    shape
      ? `<path d="${shape}" fill="${fill}"${extra}${dy ? ` transform="translate(0 ${dy})"` : ''}/>`
      : `<rect x="${r1(x)}" y="${r1(y + dy)}" width="${r1(w)}" height="${r1(h)}" rx="3" fill="${fill}"${extra}/>`;
  parts.push(body('#000000', ' fill-opacity="0.07"', 1.8), body('#000000', ' fill-opacity="0.05"', 0.7), body(paper));
  // Franja adhesiva arriba.
  parts.push(`<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(Math.min(15, h * 0.13))}" rx="3" fill="#000000" fill-opacity="0.035"/>`);
  if (f) {
    const fx = x + w - f;
    const fy = y + h - f;
    parts.push(`<path d="M ${r1(fx)} ${r1(y + h)} L ${r1(x + w)} ${r1(fy)} L ${r1(fx + f * 0.08)} ${r1(fy)} Q ${r1(fx)} ${r1(fy)} ${r1(fx)} ${r1(fy + f * 0.08)} Z" fill="${fold}"/>`);
  }
  // Agujero por donde pasa la aguja.
  parts.push(
    `<circle cx="${r1(pierce.x)}" cy="${r1(pierce.y)}" r="3.6" fill="#000000" fill-opacity="0.08"/>`,
    `<circle cx="${r1(pierce.x)}" cy="${r1(pierce.y)}" r="2.2" fill="#3B3632" fill-opacity="0.6"/>`
  );
  return deg ? `<g transform="rotate(${r1(deg)} ${r1(pierce.x)} ${r1(pierce.y)})">${parts.join('')}</g>` : parts.join('');
}

export function spikeArt(w: number, h: number, notes: SpikeNote[], opts: { radius?: number; dark?: boolean } = {}): SpikeLayout {
  const dark = !!opts.dark;
  const radius = opts.radius ?? 22;
  const m = spikeMetrics(w, h);
  const { cx, x0, y0, pw, ph, step, baseY, baseRX, baseRY } = m;
  const empty = notes.length === 0;
  // Sin pósits la aguja es más corta y el mensaje va encima.
  const tip = empty ? Math.round(h * 0.44) : 6;
  const parts: string[] = [];

  const bg = dark ? ['#2C2926', '#1E1C1A'] : ['#FBF8F3', '#F0E8DC'];
  parts.push(
    `<defs>` +
      `<linearGradient id="desk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>` +
      `<linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8C939C"/><stop offset="0.5" stop-color="#E6E9ED"/><stop offset="1" stop-color="#969DA6"/></linearGradient>` +
      `<linearGradient id="base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A7067"/><stop offset="1" stop-color="#3E3934"/></linearGradient>` +
      `</defs>`,
    `<rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" fill="url(#desk)"/>`
  );

  const shaft = (from: number, to: number) =>
    `<rect x="${r1(cx - 1.5)}" y="${r1(from)}" width="3" height="${r1(Math.max(0, to - from))}" fill="url(#steel)"/>`;
  const point = `<path d="M ${r1(cx - 1.5)} ${r1(tip + 9)} L ${r1(cx + 1.5)} ${r1(tip + 9)} L ${r1(cx)} ${r1(tip)} Z" fill="#AEB4BC"/>`;

  // Aguja entera (detrás de todo) y la base, en la que se clava.
  parts.push(shaft(tip + 8.5, baseY - 1), point);
  parts.push(
    `<ellipse cx="${r1(cx)}" cy="${r1(baseY + 3)}" rx="${r1(baseRX * 1.12)}" ry="${r1(baseRY * 1.3)}" fill="#000000" fill-opacity="${dark ? 0.3 : 0.1}"/>`,
    `<ellipse cx="${r1(cx)}" cy="${r1(baseY)}" rx="${r1(baseRX)}" ry="${baseRY}" fill="url(#base)"/>`,
    `<ellipse cx="${r1(cx)}" cy="${r1(baseY - 2)}" rx="${r1(baseRX * 0.84)}" ry="${r1(baseRY * 0.5)}" fill="#958A80" fill-opacity="0.55"/>`,
    `<ellipse cx="${r1(cx)}" cy="${r1(baseY - 2)}" rx="2.6" ry="1.2" fill="#2E2A26" fill-opacity="0.7"/>`
  );

  if (empty) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join('')}</svg>`;
    return { svg, label: null, front: null, check: null, empty: { x: 14, y: 10, w: w - 28, h: tip - 14 }, badge: null };
  }

  // Los de detrás, del más bajo al más alto; cada uno girado sobre su agujero.
  const back = notes.slice(1, 1 + SPIKE_BACK);
  for (let i = back.length; i >= 1; i--) {
    const n = back[i - 1];
    const bw = pw + spikeWidthJitter(n.id);
    const y = y0 + i * step;
    parts.push(post(cx - bw / 2, y, bw, ph, n.paper, null, { x: cx, y: y + 10 }, spikeTilt(n.id, i)));
  }

  // El de delante, recto para que se lea bien.
  const front = notes[0];
  parts.push(post(x0, y0, pw, ph, front.paper, front.fold, { x: cx, y: y0 + 10 }, 0));
  // La aguja asoma por el agujero del pósit de delante.
  parts.push(shaft(tip + 8.5, y0 + 10), point);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join('')}</svg>`;
  // Abajo a la izquierda el círculo para marcarlo como hecho (a la derecha queda la esquina doblada).
  const size = 20;
  const check = { x: x0 + 12, y: y0 + ph - 8 - size, w: size, h: size };
  return {
    svg,
    label: { x: x0 + 12, y: y0 + 2, w: pw / 2 - 12 - 8, h: 13 },
    front: { x: x0 + 12, y: y0 + 17, w: pw - 24, h: check.y - 3 - (y0 + 17) },
    check,
    empty: null,
    badge: notes.length > 1 ? { x: cx + baseRX + 8, y: baseY - 9 } : null,
  };
}
