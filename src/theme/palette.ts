/**
 * Paleta pastel de Notita. Cada color tiene su "papel" (fondo), su "tinta" (texto legible
 * encima) y tonos auxiliares para pliegues, renglones y acentos.
 */

export type PastelKey = 'limon' | 'melocoton' | 'rosa' | 'lavanda' | 'cielo' | 'menta' | 'salvia' | 'arena';

export type PaperColors = {
  name: string;
  paper: string;
  ink: string;
  strong: string;
  fold: string;
  line: string;
};

export type Pastel = PaperColors & {
  dark: { bg: string; ink: string };
};

export const PASTELS: Record<PastelKey, Pastel> = {
  limon: { name: 'Limón', paper: '#FFF1A8', ink: '#5B4A0E', strong: '#EFC94C', fold: '#F3D97A', line: '#EAD27C', dark: { bg: '#38331F', ink: '#FBE7A0' } },
  melocoton: { name: 'Melocotón', paper: '#FFDDCA', ink: '#783A1C', strong: '#F2A27C', fold: '#F5BFA1', line: '#F0C3A8', dark: { bg: '#3B2A21', ink: '#FFD5C1' } },
  rosa: { name: 'Rosa', paper: '#FFDAE7', ink: '#7C2A4E', strong: '#EE8FB3', fold: '#F4B7CC', line: '#F1BED1', dark: { bg: '#3A2430', ink: '#FFD2E2' } },
  lavanda: { name: 'Lavanda', paper: '#E7E1FF', ink: '#46399A', strong: '#9C8DF0', fold: '#CFC4FA', line: '#D2C9F6', dark: { bg: '#2B2745', ink: '#DED7FF' } },
  cielo: { name: 'Cielo', paper: '#D7EBFF', ink: '#1E4D7B', strong: '#7EB5EE', fold: '#B3D3F5', line: '#B8D5F1', dark: { bg: '#1F2E3E', ink: '#D0E6FF' } },
  menta: { name: 'Menta', paper: '#D3F2E2', ink: '#1C5C3F', strong: '#6ECB98', fold: '#A9DFC2', line: '#ADDCC3', dark: { bg: '#1D3328', ink: '#C9EEDA' } },
  salvia: { name: 'Salvia', paper: '#E6EED2', ink: '#4A5923', strong: '#A6C06A', fold: '#CBD9A9', line: '#CBD7AD', dark: { bg: '#2B3221', ink: '#E1EBC8' } },
  arena: { name: 'Arena', paper: '#F3E8DA', ink: '#674F2E', strong: '#CBAB80', fold: '#DFCBB0', line: '#DBC9B2', dark: { bg: '#342D25', ink: '#EFE3D1' } },
};

export const PASTEL_KEYS = Object.keys(PASTELS) as PastelKey[];

/** Colores de pósit para widgets: los 8 pastel, blanco, o "auto" (el de la libreta). */
export type PostitColor = PastelKey | 'blanco' | 'auto';

export const WHITE_PAPER: PaperColors = {
  name: 'Blanco',
  paper: '#FFFFFF',
  ink: '#2E2A26',
  strong: '#BDB6AD',
  fold: '#E9E5DF',
  line: '#E4DFD8',
};

export const POSTIT_COLORS: PostitColor[] = ['auto', ...PASTEL_KEYS, 'blanco'];

export function paperFor(color: Exclude<PostitColor, 'auto'>): PaperColors {
  return color === 'blanco' ? WHITE_PAPER : PASTELS[color];
}

export type InkKey = 'auto' | 'grafito' | 'azul' | 'burdeos';

export const INKS: Record<InkKey, { name: string; color: string | null }> = {
  auto: { name: 'A juego', color: null },
  grafito: { name: 'Grafito', color: '#2F2B28' },
  azul: { name: 'Bolígrafo', color: '#24479A' },
  burdeos: { name: 'Burdeos', color: '#8A2D3E' },
};

export const INK_KEYS = Object.keys(INKS) as InkKey[];

/** Mezcla dos colores hex (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const c = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return `#${((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1).toUpperCase()}`;
}

/** Añade transparencia a un color hex (#RRGGBB → #RRGGBBAA). */
export function alpha(hex: string, a: number): string {
  return `${hex}${Math.round(a * 255).toString(16).padStart(2, '0').toUpperCase()}`;
}
