import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { create } from 'zustand';

type Header = { key: string; title: string; back: boolean; large: boolean };

const useHeaderStore = create<{ header: Header | null; compact: boolean }>(() => ({ header: null, compact: false }));

/** Título (y botón de volver) de la pantalla que se ve ahora: lo muestra la barra de arriba en Android. */
export const useScreenHeader = () => useHeaderStore((s) => s.header);
/** ¿El título grande ya se ha ido hacia arriba con el scroll? Entonces la barra muestra el pequeño. */
export const useHeaderCompact = () => useHeaderStore((s) => s.compact);

// Lo que mide el título grande: pasado este scroll, ya no se ve.
const LARGE_TITLE = 44;

let counter = 0;

/** La pantalla enfocada publica su título para la barra de arriba. */
export function useRegisterScreenHeader(title: string, back: boolean, large: boolean) {
  useFocusEffect(
    useCallback(() => {
      const key = `h${++counter}`;
      useHeaderStore.setState({ header: { key, title, back, large } });
      return () => useHeaderStore.setState((s) => (s.header?.key === key ? { header: null } : s));
    }, [title, back, large])
  );
}

/**
 * Props para el ScrollView de una pestaña (solo Android): avisan cuando el título grande se esconde
 * bajo la barra de arriba, como el título grande de iOS. Solo cambia el estado al cruzar el umbral.
 */
export function useHeaderScroll() {
  const y = useRef(0);
  useFocusEffect(
    useCallback(() => {
      useHeaderStore.setState({ compact: y.current > LARGE_TITLE });
    }, [])
  );
  if (process.env.EXPO_OS !== 'android') return undefined;
  return {
    scrollEventThrottle: 16,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      y.current = e.nativeEvent.contentOffset.y;
      const compact = y.current > LARGE_TITLE;
      if (useHeaderStore.getState().compact !== compact) useHeaderStore.setState({ compact });
    },
  };
}
