import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { create } from 'zustand';

type Action = { key: string; label: string; run: () => void };

const useActionStore = create<{ action: Action | null }>(() => ({ action: null }));

/** Acción "+" de la pantalla que se ve ahora (la barra flotante la muestra a su derecha). */
export function useTabBarAction() {
  return useActionStore((s) => s.action);
}

let counter = 0;

/** La pantalla enfocada pone su botón "+" junto a la barra de pestañas (Android y web). */
export function useRegisterTabBarAction(label: string, onPress: () => void) {
  const latest = useRef(onPress);
  useEffect(() => {
    latest.current = onPress;
  });
  useFocusEffect(
    useCallback(() => {
      const key = `a${++counter}`;
      useActionStore.setState({ action: { key, label, run: () => latest.current() } });
      return () => useActionStore.setState((s) => (s.action?.key === key ? { action: null } : s));
    }, [label])
  );
}
