/**
 * Dibujo del widget de aniversarios (globos, banderines y confeti) en SVG. Lo usan la vista
 * previa de la app y el widget de Android; el widget de iOS lo replica en SwiftUI
 * (targets/widget/AnniversaryWidget.swift) con la misma geometría.
 */
import { rand, type Rect } from './postit-art';

const r1 = (n: number) => Math.round(n * 10) / 10;

export const CONFETTI = ['#F37FA6', '#9C8DF0', '#5CC48E', '#F5C542', '#6FAEEB', '#F29A6E'];

const BALLOONS = [
  { fill: '#F589B0', knot: '#DE6A93' },
  { fill: '#A897F4', knot: '#8877E3' },
  { fill: '#F7CC55', knot: '#E2B030' },
];

export type FestiveSize = 'small' | 'medium' | 'large';

export function festiveSize(w: number, h: number): FestiveSize {
  if (w > h * 1.5) return 'medium';
  return w > 250 && h > 250 ? 'large' : 'small';
}

export type FestiveLayout = {
  size: FestiveSize;
  svg: string;
  /** Zona del texto principal (la próxima celebración). */
  hero: Rect;
  /** Tarjeta con la lista de las siguientes (mediano y grande). */
  list: Rect | null;
};

/** Globo con brillo, nudo y cordel; el cordel acaba en `to`. */
function balloon(cx: number, cy: number, r: number, color: (typeof BALLOONS)[number], rot: number, to: { x: number; y: number }) {
  const ry = r * 1.2;
  const a = (rot * Math.PI) / 180;
  // El nudo gira con el globo: el cordel sale de donde queda.
  const kx = cx - (ry + 3) * Math.sin(a);
  const ky = cy + (ry + 3) * Math.cos(a);
  const midY = (ky + to.y) / 2;
  const string = `<path d="M ${r1(kx)} ${r1(ky)} C ${r1(kx - r * 0.6)} ${r1(midY)} ${r1(to.x + r * 0.6)} ${r1(midY)} ${r1(to.x)} ${r1(to.y)}" fill="none" stroke="#B9AFC9" stroke-width="1"/>`;
  const sx = cx - r * 0.38;
  const sy = cy - ry * 0.38;
  const body =
    `<g transform="rotate(${rot} ${r1(cx)} ${r1(cy)})">` +
    `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(r)}" ry="${r1(ry)}" fill="${color.fill}"/>` +
    `<path d="M ${r1(cx - 3)} ${r1(cy + ry + 3.5)} L ${r1(cx + 3)} ${r1(cy + ry + 3.5)} L ${r1(cx)} ${r1(cy + ry - 1)} Z" fill="${color.knot}"/>` +
    `<ellipse cx="${r1(sx)}" cy="${r1(sy)}" rx="${r1(r * 0.2)}" ry="${r1(ry * 0.3)}" fill="#FFFFFF" fill-opacity="0.5" transform="rotate(-28 ${r1(sx)} ${r1(sy)})"/>` +
    `</g>`;
  return string + body;
}

/** Banderines colgando de una cuerda (curva cuadrática). */
function bunting(x0: number, y0: number, x1: number, y1: number, sag: number, flag: number) {
  const qx = (x0 + x1) / 2;
  const qy = (y0 + y1) / 2 + sag;
  const at = (t: number) => ({
    x: (1 - t) ** 2 * x0 + 2 * (1 - t) * t * qx + t * t * x1,
    y: (1 - t) ** 2 * y0 + 2 * (1 - t) * t * qy + t * t * y1,
  });
  const n = Math.max(4, Math.floor(Math.hypot(x1 - x0, y1 - y0) / (flag * 2)));
  let s = `<path d="M ${r1(x0)} ${r1(y0)} Q ${r1(qx)} ${r1(qy)} ${r1(x1)} ${r1(y1)}" fill="none" stroke="#C9BFD6" stroke-width="1.2"/>`;
  for (let i = 0; i < n; i++) {
    const p = at((i + 0.15) / n);
    const q = at((i + 0.85) / n);
    const m = at((i + 0.5) / n);
    s += `<path d="M ${r1(p.x)} ${r1(p.y)} L ${r1(q.x)} ${r1(q.y)} L ${r1(m.x)} ${r1(m.y + flag * 1.15)} Z" fill="${CONFETTI[i % CONFETTI.length]}"/>`;
  }
  return s;
}

/** Confeti repartido al azar (siempre el mismo para un tamaño) que esquiva las zonas de texto. */
function confetti(area: Rect, count: number, seed: number, avoid: Rect[]) {
  const rnd = rand(seed);
  const out: string[] = [];
  for (let tries = 0; out.length < count && tries < count * 8; tries++) {
    const x = area.x + rnd() * area.w;
    const y = area.y + rnd() * area.h;
    const kind = rnd();
    const color = CONFETTI[Math.floor(rnd() * CONFETTI.length)];
    const rot = Math.round(rnd() * 180);
    if (avoid.some((r) => x > r.x - 4 && x < r.x + r.w + 4 && y > r.y - 4 && y < r.y + r.h + 4)) continue;
    if (kind < 0.5) {
      out.push(`<rect x="${r1(x - 1.6)}" y="${r1(y - 3.5)}" width="3.2" height="7" rx="1" fill="${color}" transform="rotate(${rot} ${r1(x)} ${r1(y)})"/>`);
    } else if (kind < 0.82) {
      out.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(1.5 + rnd() * 1.3)}" fill="${color}"/>`);
    } else {
      out.push(`<path d="M ${r1(x - 4)} ${r1(y)} q 2 -3 4 0 t 4 0" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" transform="rotate(${rot} ${r1(x)} ${r1(y)})"/>`);
    }
  }
  return out.join('');
}

export function festiveArt(w: number, h: number, opts: { radius?: number; dark?: boolean; party?: boolean } = {}): FestiveLayout {
  const size = festiveSize(w, h);
  const dark = !!opts.dark;
  const radius = opts.radius ?? 22;
  const parts: string[] = [];

  const stops = dark ? ['#3A2433', '#2A2645', '#3A3122'] : ['#FFE4EE', '#F1E9FF', '#FFF4D8'];
  parts.push(
    `<defs><linearGradient id="fest" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${stops[0]}"/><stop offset="0.55" stop-color="${stops[1]}"/><stop offset="1" stop-color="${stops[2]}"/></linearGradient></defs>`,
    `<rect x="0" y="0" width="${w}" height="${h}" rx="${radius}" fill="url(#fest)"/>`
  );

  let hero: Rect;
  let list: Rect | null = null;
  // Zona de la escena (globos y banderines) y punto donde se juntan los cordeles.
  let scene: Rect;
  let r: number;

  if (size === 'medium') {
    hero = { x: 16, y: Math.round(h * 0.4), w: Math.round(w * 0.45) - 16, h: Math.round(h * 0.6) - 14 };
    list = { x: Math.round(w * 0.47), y: 12, w: Math.round(w * 0.53) - 12, h: h - 24 };
    scene = { x: 0, y: 0, w: Math.round(w * 0.46), h: Math.round(h * 0.42) };
    r = Math.min(w, h) * 0.1;
  } else if (size === 'large') {
    hero = { x: 18, y: Math.round(h * 0.25), w: Math.round(w * 0.62), h: Math.round(h * 0.21) };
    list = { x: 12, y: Math.round(h * 0.5), w: w - 24, h: Math.round(h * 0.5) - 12 };
    scene = { x: 0, y: 0, w, h: Math.round(h * 0.47) };
    r = Math.min(w, h) * 0.075;
  } else {
    hero = { x: 14, y: Math.round(h * 0.47), w: w - 28, h: Math.round(h * 0.53) - 12 };
    scene = { x: 0, y: 0, w, h: Math.round(h * 0.44) };
    r = Math.min(w, h) * 0.105;
  }

  // Banderines arriba a la izquierda de la escena.
  const flag = Math.max(8, Math.round(r * 0.62));
  parts.push(bunting(-2, 7, scene.w * (size === 'small' ? 0.52 : 0.6), 5, flag * 1.25, flag));

  // Confeti por toda la tarjeta (más el día de la celebración), sin tapar textos.
  const avoid = [hero, ...(list ? [list] : [])];
  const count = Math.round((w * h) / (opts.party ? 520 : 900));
  parts.push(confetti({ x: 4, y: 4, w: w - 8, h: h - 8 }, count, Math.round(w * 7 + h), avoid));

  // Racimo de tres globos arriba a la derecha de la escena.
  const right = scene.x + scene.w;
  const tie = { x: right - r * 2.3, y: scene.y + scene.h + r * 0.05 };
  parts.push(
    balloon(right - r * 3.4, scene.y + r * 2.0, r * 0.82, BALLOONS[1], -12, tie),
    balloon(right - r * 1.35, scene.y + r * 2.6, r * 0.78, BALLOONS[2], 10, tie),
    balloon(right - r * 2.35, scene.y + r * 1.55, r, BALLOONS[0], 0, tie)
  );
  // Lacito donde se juntan los cordeles.
  parts.push(
    `<path d="M ${r1(tie.x)} ${r1(tie.y)} l -4 -3 l 0 6 Z M ${r1(tie.x)} ${r1(tie.y)} l 4 -3 l 0 6 Z" fill="#F37FA6"/>`
  );

  if (list) {
    parts.push(
      `<rect x="${list.x}" y="${list.y}" width="${list.w}" height="${list.h}" rx="16" fill="${dark ? '#000000' : '#FFFFFF'}" fill-opacity="${dark ? 0.28 : 0.62}"/>`
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${parts.join('')}</svg>`;
  return { size, svg, hero, list };
}
