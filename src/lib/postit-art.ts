/**
 * Dibujo del pósit en SVG (fondo, forma, papel). Lo usan la vista previa de la app y el
 * widget de Android, así ambos se ven idénticos. El widget de iOS replica esta misma
 * geometría en SwiftUI (targets/widget/PostitArt.swift).
 */
import type { Notebook, WidgetDesign } from '@/store/types';
import { FONTS } from '@/theme/fonts';
import { INKS, PASTELS, mix, paperFor, type PaperColors } from '@/theme/palette';

export type ArtColors = PaperColors & {
  board: string;
  boardOpacity: number;
  text: string;
};

export function resolveColors(
  design: Pick<WidgetDesign, 'color' | 'source' | 'board' | 'ink'> & { glass?: number },
  notebooks: Pick<Notebook, 'id' | 'color'>[]
): ArtColors {
  let base: PaperColors;
  if (design.color === 'auto') {
    const nb = design.source.startsWith('libreta:') ? notebooks.find((n) => `libreta:${n.id}` === design.source) : undefined;
    base = PASTELS[nb?.color ?? 'limon'];
  } else {
    base = paperFor(design.color);
  }
  const boards: Record<WidgetDesign['board'], [string, number]> = {
    completo: [base.fold, 1],
    blanco: ['#FFFFFF', 1],
    pastel: [mix(base.paper, '#FFFFFF', 0.55), 1],
    // Cristal: la opacidad sale de la transparencia elegida en el diseño (0 → 0.68, 1 → 0.08).
    cristal: ['#FFFFFF', Math.round((0.08 + (1 - (design.glass ?? 0.6)) * 0.6) * 100) / 100],
    oscuro: ['#1F1E1C', 1],
  };
  const [board, boardOpacity] = boards[design.board];
  return { ...base, board, boardOpacity, text: INKS[design.ink].color ?? base.ink };
}

export type Rect = { x: number; y: number; w: number; h: number };

export type PostitLayout = {
  width: number;
  height: number;
  body: Rect;
  content: Rect;
  fontSize: number;
  headerSize: number;
  rowHeight: number;
  headerHeight: number;
  maxRows: number;
  svg: string;
};

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Pequeño generador pseudoaleatorio determinista (el borde rasgado no "baila" entre renders). */
export function rand(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

export function layoutPostit(
  width: number,
  height: number,
  design: Pick<WidgetDesign, 'board' | 'shape' | 'paper' | 'font' | 'showHeader'>,
  colors: ArtColors,
  opts: { boardRadius?: number } = {}
): PostitLayout {
  const min = Math.min(width, height);
  const full = design.board === 'completo';
  const margin = full ? 0 : Math.round(min * 0.075);
  const body: Rect = { x: margin, y: margin, w: width - margin * 2, h: height - margin * 2 };

  const radius = design.shape === 'redondo' ? min * 0.11 : min * 0.022;
  const fold = design.shape === 'doblado' ? Math.round(min * 0.17) : 0;
  const tear = design.shape === 'rasgado' ? Math.max(3, min * 0.028) : 0;
  const tape = design.shape === 'cinta' ? { w: body.w * 0.36, h: Math.max(14, min * 0.1) } : null;

  const scale = FONTS[design.font].scale;
  const fontSize = r1(Math.min(15.5, Math.max(11.5, min * 0.083)) * scale);
  const headerSize = r1(fontSize * 1.14);
  const rowHeight = r1(fontSize * 1.72);
  const pad = Math.round(Math.max(10, min * 0.08));
  const top = body.y + pad + (tape ? tape.h * (full ? 0.75 : 0.45) : 0) + tear;
  const bottom = body.y + body.h - pad - (fold ? fold * 0.3 : 0);
  const content: Rect = { x: body.x + pad, y: top, w: body.w - pad * 2, h: Math.max(0, bottom - top) };
  const headerHeight = design.showHeader ? r1(headerSize * 1.75) : 0;
  const maxRows = Math.max(1, Math.floor((content.h - headerHeight + rowHeight * 0.15) / rowHeight));

  // --- Contorno del pósit ---
  const { x, y, w, h } = body;
  let d: string;
  if (tear) {
    const rnd = rand(Math.round(w * 31 + h));
    const n = Math.max(10, Math.round(w / 8));
    d = `M ${x} ${r1(y + tear)}`;
    for (let i = 1; i <= n; i++) {
      const xi = x + (w * i) / n;
      const yi = y + (i % 2 ? rnd() * tear * 0.5 : tear * (0.65 + rnd() * 0.35));
      d += ` L ${r1(xi)} ${r1(yi)}`;
    }
    d += ` L ${x + w} ${r1(y + h - (fold || radius))}`;
  } else {
    d = `M ${r1(x + radius)} ${y} H ${r1(x + w - radius)} Q ${x + w} ${y} ${x + w} ${r1(y + radius)} V ${r1(y + h - (fold || radius))}`;
  }
  d += fold ? ` L ${r1(x + w - fold)} ${y + h}` : ` Q ${x + w} ${y + h} ${r1(x + w - radius)} ${y + h}`;
  d += ` H ${r1(x + radius)} Q ${x} ${y + h} ${x} ${r1(y + h - radius)}`;
  d += tear ? ` L ${x} ${r1(y + tear)} Z` : ` V ${r1(y + radius)} Q ${x} ${y} ${r1(x + radius)} ${y} Z`;

  const parts: string[] = [];
  const br = opts.boardRadius ?? Math.round(min * 0.14);

  // Fondo del widget
  parts.push(
    `<rect x="0" y="0" width="${width}" height="${height}" rx="${br}" fill="${colors.board}" fill-opacity="${colors.boardOpacity}"${
      design.board === 'cristal' ? ` stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="1"` : ''
    }/>`
  );

  // Sombra suave (capas desplazadas; sin filtros para que funcione en todos los motores SVG)
  if (!full) {
    const shadowAlpha = design.board === 'oscuro' ? 0.22 : 0.05;
    [1, 2.5, 4.5].forEach((dy, i) => {
      parts.push(`<path d="${d}" fill="#000000" fill-opacity="${r1(shadowAlpha * (1 - i * 0.25) * 100) / 100}" transform="translate(0 ${dy})"/>`);
    });
  }

  // Papel
  parts.push(`<path d="${d}" fill="${colors.paper}"/>`);

  // Patrón del papel (recortado a la forma)
  if (design.paper !== 'liso') {
    const g: string[] = [];
    const step = r1(fontSize * 1.05);
    if (design.paper === 'rayas') {
      const start = content.y + headerHeight;
      for (let ly = start + rowHeight * 0.96; ly < y + h - 2; ly += rowHeight) {
        g.push(`<line x1="${x}" y1="${r1(ly)}" x2="${x + w}" y2="${r1(ly)}" stroke="${colors.line}" stroke-width="1"/>`);
      }
      if (design.showHeader) {
        const hy = r1(content.y + headerHeight - rowHeight * 0.32);
        g.push(`<line x1="${x}" y1="${hy}" x2="${x + w}" y2="${hy}" stroke="${colors.strong}" stroke-opacity="0.55" stroke-width="1.2"/>`);
      }
    } else if (design.paper === 'cuadricula') {
      for (let gx = x + step; gx < x + w; gx += step) g.push(`<line x1="${r1(gx)}" y1="${y}" x2="${r1(gx)}" y2="${y + h}" stroke="${colors.line}" stroke-opacity="0.7" stroke-width="0.7"/>`);
      for (let gy = y + step; gy < y + h; gy += step) g.push(`<line x1="${x}" y1="${r1(gy)}" x2="${x + w}" y2="${r1(gy)}" stroke="${colors.line}" stroke-opacity="0.7" stroke-width="0.7"/>`);
    } else {
      for (let gx = x + step / 2; gx < x + w; gx += step) {
        for (let gy = y + step / 2; gy < y + h; gy += step) g.push(`<circle cx="${r1(gx)}" cy="${r1(gy)}" r="1" fill="${colors.line}"/>`);
      }
    }
    parts.push(`<defs><clipPath id="paper"><path d="${d}"/></clipPath></defs><g clip-path="url(#paper)">${g.join('')}</g>`);
  }

  // Esquina doblada
  if (fold) {
    const fx = x + w - fold;
    const fy = y + h - fold;
    parts.push(`<path d="M ${fx} ${y + h} L ${x + w} ${fy} L ${r1(fx + fold * 0.08)} ${fy} Q ${fx} ${fy} ${fx} ${r1(fy + fold * 0.08)} Z" fill="${colors.fold}"/>`);
    parts.push(`<path d="M ${fx} ${y + h} L ${x + w} ${fy}" stroke="#000000" stroke-opacity="0.07" stroke-width="1.5"/>`);
  }

  // Cinta adhesiva
  if (tape) {
    const tx = x + w / 2 - tape.w / 2;
    const ty = full ? y + 4 : y - tape.h * 0.45;
    const tapeColor = mix(colors.strong, '#FFFFFF', 0.45);
    parts.push(
      `<g transform="rotate(-3 ${r1(x + w / 2)} ${r1(ty + tape.h / 2)})"><rect x="${r1(tx)}" y="${r1(ty)}" width="${r1(tape.w)}" height="${r1(tape.h)}" rx="2" fill="${tapeColor}" fill-opacity="0.82"/><rect x="${r1(tx)}" y="${r1(ty)}" width="${r1(tape.w)}" height="${r1(tape.h * 0.35)}" fill="#FFFFFF" fill-opacity="0.25"/></g>`
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`;
  return { width, height, body, content, fontSize, headerSize, rowHeight, headerHeight, maxRows, svg };
}

export const SOURCE_TITLES: Record<string, string> = {
  hoy: 'Hoy',
  proximos: 'Próximos',
  importantes: 'Importantes',
  todos: 'Notita',
};

export function sourceTitle(source: WidgetDesign['source'], notebooks: Pick<Notebook, 'id' | 'name' | 'emoji'>[]) {
  if (source.startsWith('libreta:')) {
    const nb = notebooks.find((n) => `libreta:${n.id}` === source);
    return nb ? `${nb.emoji} ${nb.name}` : 'Libreta';
  }
  return SOURCE_TITLES[source] ?? 'Notita';
}
