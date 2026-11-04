import { useState } from 'react';
import { useWindowDimensions, type LayoutChangeEvent } from 'react-native';

export type SizeClass = 'compact' | 'medium' | 'expanded';

/** Mismos cortes que Material: móvil < 600, tablet en vertical < 900, tablet grande u horizontal. */
export function sizeClassFor(width: number): SizeClass {
  return width >= 900 ? 'expanded' : width >= 600 ? 'medium' : 'compact';
}

/** Ancho máximo del contenido de una sola columna (listas y ajustes). */
export const READABLE_WIDTH = 720;

/** Ancho máximo de los formularios en hojas (en tablets la hoja puede ser muy ancha). */
export const SHEET_MAX_WIDTH = 640;

/**
 * Medidas para adaptar cada pantalla a móvil y tablet. Se mide el contenedor real: en iPad la
 * barra lateral, Split View o Stage Manager hacen la ventana más estrecha que la pantalla.
 */
export function useResponsive() {
  const window = useWindowDimensions();
  const [measured, setMeasured] = useState<number | null>(null);
  const width = measured ?? window.width;
  const size = sizeClassFor(width);
  // El margen coincide con el del título de la barra (iPad: 20 pt; Android: 16 dp), así todo queda alineado.
  const pad = size !== 'compact' && process.env.EXPO_OS === 'ios' ? 20 : 16;
  return {
    width,
    size,
    pad,
    /** Ancho útil dentro de los márgenes laterales. */
    inner: width - pad * 2,
    /** Hay sitio para dos paneles (calendario y día lado a lado). */
    twoPane: width >= 700,
    /** Columnas de las rejillas (libretas, diseños de widget…). */
    columns: size === 'expanded' ? 4 : size === 'medium' ? 3 : 2,
    onLayout: (e: LayoutChangeEvent) => {
      const w = Math.round(e.nativeEvent.layout.width);
      setMeasured((prev) => (prev === w ? prev : w));
    },
  };
}

/** Ancho exacto de cada celda para que todas las columnas midan lo mismo. */
export function cellWidth(inner: number, columns: number, gap: number) {
  return Math.floor((inner - gap * (columns - 1)) / columns);
}
