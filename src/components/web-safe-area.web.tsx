import { useEffect, useState, type ReactNode } from 'react';
import { SafeAreaInsetsContext, useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';

const same = (a: EdgeInsets, b: EdgeInsets) => a.top === b.top && a.bottom === b.bottom && a.left === b.left && a.right === b.right;

/**
 * Web: márgenes seguros leídos directamente de `env(safe-area-inset-*)`. Con la app instalada en la
 * pantalla de inicio del iPhone, iOS da a la página una altura menor que la de la pantalla (le resta
 * la barra de estado) y la librería, que recorta los márgenes con esa altura, calcula mal el de abajo.
 * Al abrir la app iOS a veces los da a 0 durante un instante, así que se vuelven a medir después.
 */
export function WebSafeArea({ children }: { children: ReactNode }) {
  const base = useSafeAreaInsets();
  const [insets, setInsets] = useState<EdgeInsets | null>(null);

  useEffect(() => {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
    document.body.appendChild(probe);
    const update = () => {
      const s = getComputedStyle(probe);
      const next = { top: parseFloat(s.paddingTop) || 0, bottom: parseFloat(s.paddingBottom) || 0, left: parseFloat(s.paddingLeft) || 0, right: parseFloat(s.paddingRight) || 0 };
      setInsets((prev) => (prev && same(prev, next) ? prev : next));
    };
    update();
    const timers = [150, 500, 1200].map((ms) => setTimeout(update, ms));
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('visibilitychange', update);
      probe.remove();
    };
  }, []);

  return <SafeAreaInsetsContext value={insets ?? base}>{children}</SafeAreaInsetsContext>;
}
