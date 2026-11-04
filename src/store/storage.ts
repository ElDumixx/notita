import { Storage } from 'expo-sqlite/kv-store';
import type { StateStorage } from 'zustand/middleware';

/** Almacenamiento síncrono: el estado está disponible desde el primer render (y en los widgets de Android). */
export const kv: StateStorage<void> = {
  getItem: (name) => Storage.getItemSync(name),
  setItem: (name, value) => Storage.setItemSync(name, value),
  removeItem: (name) => {
    Storage.removeItemSync(name);
  },
};
