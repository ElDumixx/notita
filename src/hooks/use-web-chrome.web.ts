import { useEffect } from 'react';

import type { Theme } from '@/theme';
import { meshBackground } from '@/theme/glass';

/**
 * Web: la página que hay detrás de la app lleva el mismo fondo que ella. Así, lo que queda bajo la
 * barra de Safari (o bajo la barra de estado) se ve como parte de la app y no como una franja blanca,
 * y Safari tiñe sus barras con el color del tema elegido en Ajustes.
 */
export function useWebChrome(theme: Theme, glass: boolean) {
  useEffect(() => {
    const html = document.documentElement;
    html.style.backgroundColor = theme.bg;
    html.style.backgroundImage = glass ? meshBackground(theme) : 'none';
    html.style.colorScheme = theme.scheme;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', theme.bg));
  }, [theme, glass]);
}
