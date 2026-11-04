import type { ReactNode } from 'react';

/** En iOS y Android los márgenes seguros los da el sistema tal cual. En la web: web-safe-area.web.tsx. */
export function WebSafeArea({ children }: { children: ReactNode }) {
  return children;
}
