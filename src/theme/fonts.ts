export type FontKey = 'comic' | 'mano' | 'sans' | 'redonda' | 'serif' | 'maquina' | 'rotulador';

export type FontOption = {
  name: string;
  /** Nombre PostScript (iOS) y de archivo (Android) de la fuente incluida; null = fuente del sistema. */
  regular: string | null;
  bold: string | null;
  /** Algunas fuentes manuscritas son pequeñas: se compensan con este factor. */
  scale: number;
};

export const FONTS: Record<FontKey, FontOption> = {
  comic: { name: 'Cómic', regular: 'ComicNeue-Regular', bold: 'ComicNeue-Bold', scale: 1 },
  mano: { name: 'A mano', regular: 'Caveat-Medium', bold: 'Caveat-Bold', scale: 1.28 },
  sans: { name: 'Sans Serif', regular: null, bold: null, scale: 1 },
  redonda: { name: 'Redondeada', regular: 'Nunito-Medium', bold: 'Nunito-ExtraBold', scale: 1 },
  serif: { name: 'Serif', regular: 'Lora-Medium', bold: 'Lora-Bold', scale: 1 },
  maquina: { name: 'Máquina', regular: 'CourierPrime-Regular', bold: 'CourierPrime-Bold', scale: 0.98 },
  rotulador: { name: 'Rotulador', regular: 'PermanentMarker-Regular', bold: 'PermanentMarker-Regular', scale: 0.92 },
};

export const FONT_KEYS = Object.keys(FONTS) as FontKey[];

/** Estilo de texto de React Native para una fuente de pósit. */
export function fontStyle(key: FontKey, weight: 'regular' | 'bold') {
  const f = FONTS[key];
  if (!f.regular) return { fontWeight: weight === 'bold' ? ('700' as const) : ('500' as const) };
  return { fontFamily: (weight === 'bold' ? f.bold : f.regular) ?? undefined };
}
