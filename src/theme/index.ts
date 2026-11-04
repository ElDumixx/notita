import { useColorScheme } from 'react-native';

import { useStore } from '@/store';

import { PASTELS, type PastelKey } from './palette';

const light = {
  scheme: 'light' as 'light' | 'dark',
  bg: '#FAF8F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F0EB',
  separator: 'rgba(46,42,38,0.08)',
  text: '#2E2A26',
  textSecondary: '#7A736B',
  textTertiary: '#AFA89F',
  tint: '#7466E3',
  tintSoft: '#ECE9FF',
  onTint: '#FFFFFF',
  danger: '#D65A52',
  dangerSoft: '#FDE8E5',
  success: '#2F9E6A',
  shadow: 'rgba(60,45,30,0.07)',
  fill: 'rgba(70,58,46,0.06)',
};

const dark: typeof light = {
  scheme: 'dark',
  bg: '#121110',
  surface: '#1C1B19',
  surfaceAlt: '#272522',
  separator: 'rgba(255,255,255,0.08)',
  text: '#F3F0EB',
  textSecondary: '#A69F96',
  textTertiary: '#6F6962',
  tint: '#B2A8FF',
  tintSoft: '#2C2847',
  onTint: '#1A1630',
  danger: '#FF8B83',
  dangerSoft: '#3B2220',
  success: '#7FD8A8',
  shadow: 'rgba(0,0,0,0.35)',
  fill: 'rgba(255,255,255,0.07)',
};

export type Theme = typeof light;

export const THEMES = { light, dark };

function useNativeTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

// En la web no existe Appearance.setColorScheme: el tema elegido en Ajustes se aplica aquí.
function useWebTheme(): Theme {
  const system = useColorScheme();
  const pref = useStore((s) => s.settings.theme);
  return (pref === 'system' ? system : pref) === 'dark' ? dark : light;
}

export const useTheme: () => Theme = process.env.EXPO_OS === 'web' ? useWebTheme : useNativeTheme;

/** Colores de una libreta adaptados al modo claro/oscuro. */
export function notebookColors(color: PastelKey, theme: Theme) {
  const p = PASTELS[color];
  return theme.scheme === 'dark'
    ? { bg: p.dark.bg, ink: p.dark.ink, strong: p.strong }
    : { bg: p.paper, ink: p.ink, strong: p.strong };
}

/** Espaciado en múltiplos de 4 para mantener la simetría. */
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const RADIUS = { sm: 10, md: 16, lg: 22, xl: 28 } as const;
