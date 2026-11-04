/**
 * Estilo cristal (Liquid Glass). En iOS 26+ se usa el material nativo; en Android y en iOS
 * anteriores se imita con capas translúcidas, brillo en el borde y un reflejo superior.
 * `transparency` (0–1) lo elige el usuario en Ajustes.
 */
import { useStore } from '@/store';

import { useTheme, type Theme } from '.';
import { alpha } from './palette';

export type GlassLook = {
  enabled: boolean;
  /** Transparencia elegida: 0 = casi opaco, 1 = muy transparente. */
  transparency: number;
  /** Opacidad del velo que se pone sobre el Liquid Glass nativo para hacerlo más opaco. */
  veil: number;
  /** Relleno translúcido (Android / iOS anterior) a partir de un color base hex. */
  fill: (base?: string) => string;
  rim: string;
  sheen: string;
  shadow: string;
};

// En Android el cristal se imita con capas: se deja más translúcido para que se note el fondo.
const ANDROID = process.env.EXPO_OS === 'android';

export function glassLook(theme: Theme, enabled: boolean, transparency: number): GlassLook {
  const t = Math.min(1, Math.max(0, transparency));
  const dark = theme.scheme === 'dark';
  return {
    enabled,
    transparency: t,
    veil: (1 - t) * 0.85,
    fill: (base = theme.surface) => alpha(base, ANDROID ? 0.8 - t * 0.66 : 0.94 - t * 0.68),
    rim: dark ? `rgba(255,255,255,${(0.1 + t * 0.08).toFixed(2)})` : `rgba(255,255,255,${(0.6 + t * 0.3).toFixed(2)})`,
    sheen: dark
      ? 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 42%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 48%)',
    shadow: dark ? '0 10px 28px rgba(0,0,0,0.35)' : '0 10px 28px rgba(90,70,160,0.10)',
  };
}

export function useGlass(): GlassLook {
  const theme = useTheme();
  const glass = useStore((s) => s.settings.glass);
  return glassLook(theme, glass.enabled, glass.transparency);
}

/** Fondo en "malla" pastel: manchas suaves que dan algo que refractar al cristal, sin ruido. */
export function meshBackground(theme: Theme) {
  const blobs =
    theme.scheme === 'dark'
      ? [
          ['10% 4%', '116,96,220', 0.32],
          ['95% 24%', '190,80,130', 0.2],
          ['8% 72%', '50,140,105', 0.2],
          ['92% 96%', '170,135,40', 0.18],
        ]
      : [
          ['10% 4%', '205,194,255', 0.9],
          ['95% 24%', '255,206,224', 0.8],
          ['8% 72%', '196,236,216', 0.8],
          ['92% 96%', '255,232,160', 0.75],
        ];
  return blobs.map(([at, rgb, a]) => `radial-gradient(circle at ${at}, rgba(${rgb},${a}) 0%, rgba(${rgb},0) 52%)`).join(', ');
}
