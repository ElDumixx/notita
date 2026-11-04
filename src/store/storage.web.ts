import type { StateStorage } from 'zustand/middleware';

// Web: localStorage. expo-sqlite en la web necesita cabeceras (COOP/COEP) que GitHub Pages no permite.
function local() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export const kv: StateStorage<void> = {
  getItem: (name) => local()?.getItem(name) ?? null,
  setItem: (name, value) => {
    try {
      local()?.setItem(name, value);
    } catch {
      // Navegación privada o almacenamiento lleno: la app sigue funcionando en memoria.
    }
  },
  removeItem: (name) => {
    local()?.removeItem(name);
  },
};
