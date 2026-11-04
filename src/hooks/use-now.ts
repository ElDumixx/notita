import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Hora actual que se refresca cada minuto y al volver a la app (para "atrasado", "hoy", etc.). */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setNow(Date.now()));
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, []);
  return now;
}
