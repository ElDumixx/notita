import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { MIN, nextOccurrence } from '@/lib/dates';
import { newId } from '@/lib/ids';

import { DEFAULT_SETTINGS, makeDesign, makeReminder, seedData } from './seed';
import { kv } from './storage';
import type { Anniversary, Notebook, Reminder, Settings, Trash, WidgetDesign } from './types';

export const STORE_KEY = 'notita-store';

type Data = {
  notebooks: Notebook[];
  reminders: Reminder[];
  designs: WidgetDesign[];
  anniversaries: Anniversary[];
  settings: Settings;
  /** Widgets de Android colocados: id del widget → id del diseño. */
  widgetBindings: Record<string, string>;
  seeded: boolean;
};

type Actions = {
  addNotebook: (n: Omit<Notebook, 'id' | 'createdAt'>) => string;
  updateNotebook: (id: string, patch: Partial<Notebook>) => void;
  /** Elimina la libreta. Si `moveTo` existe, sus recordatorios pasan allí; si no, se eliminan. */
  deleteNotebook: (id: string, moveTo?: string) => void;

  addReminder: (r: Partial<Reminder> & { notebookId: string; title: string }) => string;
  updateReminder: (id: string, patch: Partial<Reminder>) => void;
  deleteReminders: (ids: string[]) => void;
  undoDelete: () => void;
  clearTrash: () => void;
  toggleComplete: (id: string) => void;
  snooze: (id: string, minutes: number) => void;
  clearCompleted: (notebookId?: string) => void;

  addAnniversary: (a: Omit<Anniversary, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateAnniversary: (id: string, patch: Partial<Anniversary>) => void;
  deleteAnniversary: (id: string) => void;

  addDesign: (d?: Partial<WidgetDesign>) => string;
  updateDesign: (id: string, patch: Partial<WidgetDesign>) => void;
  deleteDesign: (id: string) => void;
  bindWidget: (widgetId: number, designId: string | null) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
};

export type State = Data & Actions & { trash: Trash };

function initialData(): Data {
  return {
    ...seedData(),
    anniversaries: [],
    settings: DEFAULT_SETTINGS,
    widgetBindings: {},
    seeded: true,
  };
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initialData(),
      trash: null,

      addNotebook: (n) => {
        const id = newId('n');
        set((s) => ({ notebooks: [...s.notebooks, { ...n, id, createdAt: Date.now() }] }));
        return id;
      },

      updateNotebook: (id, patch) =>
        set((s) => ({ notebooks: s.notebooks.map((n) => (n.id === id ? { ...n, ...patch, id } : n)) })),

      deleteNotebook: (id, moveTo) =>
        set((s) => {
          const notebook = s.notebooks.find((n) => n.id === id) ?? null;
          const removed = moveTo ? [] : s.reminders.filter((r) => r.notebookId === id);
          const reminders = moveTo
            ? s.reminders.map((r) => (r.notebookId === id ? { ...r, notebookId: moveTo, updatedAt: Date.now() } : r))
            : s.reminders.filter((r) => r.notebookId !== id);
          return {
            notebooks: s.notebooks.filter((n) => n.id !== id),
            reminders,
            // Los widgets que mostraban esta libreta pasan a mostrar "Hoy".
            designs: s.designs.map((d) => (d.source === `libreta:${id}` ? { ...d, source: 'hoy' as const } : d)),
            trash: { reminders: removed, notebook, at: Date.now() },
          };
        }),

      addReminder: (r) => {
        const reminder = makeReminder(r);
        set((s) => ({ reminders: [...s.reminders, reminder] }));
        return reminder.id;
      },

      updateReminder: (id, patch) =>
        set((s) => ({
          reminders: s.reminders.map((r) => (r.id === id ? { ...r, ...patch, id, updatedAt: Date.now() } : r)),
        })),

      deleteReminders: (ids) =>
        set((s) => {
          const set_ = new Set(ids);
          const removed = s.reminders.filter((r) => set_.has(r.id));
          if (removed.length === 0) return {};
          return {
            reminders: s.reminders.filter((r) => !set_.has(r.id)),
            trash: { reminders: removed, notebook: null, at: Date.now() },
          };
        }),

      undoDelete: () =>
        set((s) => {
          if (!s.trash) return {};
          const { reminders, notebook, anniversary } = s.trash;
          const ids = new Set(s.reminders.map((r) => r.id));
          return {
            notebooks: notebook && !s.notebooks.some((n) => n.id === notebook.id) ? [...s.notebooks, notebook] : s.notebooks,
            reminders: [...s.reminders, ...reminders.filter((r) => !ids.has(r.id))],
            anniversaries:
              anniversary && !s.anniversaries.some((a) => a.id === anniversary.id) ? [...s.anniversaries, anniversary] : s.anniversaries,
            trash: null,
          };
        }),

      clearTrash: () => set({ trash: null }),

      toggleComplete: (id) =>
        set((s) => ({
          reminders: s.reminders.map((r) => {
            if (r.id !== id) return r;
            const now = Date.now();
            if (r.completedAt) return { ...r, completedAt: null, updatedAt: now };
            if (r.repeat !== 'none' && r.dueAt != null) {
              // Los repetitivos avanzan a la siguiente vez en lugar de quedar hechos.
              return { ...r, dueAt: nextOccurrence(r.dueAt, r.repeat, Math.max(r.dueAt, now)), snoozeUntil: null, updatedAt: now };
            }
            return { ...r, completedAt: now, snoozeUntil: null, updatedAt: now };
          }),
        })),

      snooze: (id, minutes) =>
        set((s) => ({
          reminders: s.reminders.map((r) => (r.id === id ? { ...r, snoozeUntil: Date.now() + minutes * MIN } : r)),
        })),

      clearCompleted: (notebookId) => {
        const ids = get()
          .reminders.filter((r) => r.completedAt && (!notebookId || r.notebookId === notebookId))
          .map((r) => r.id);
        get().deleteReminders(ids);
      },

      addAnniversary: (a) => {
        const now = Date.now();
        const id = newId('a');
        set((s) => ({ anniversaries: [...s.anniversaries, { ...a, id, createdAt: now, updatedAt: now }] }));
        return id;
      },

      updateAnniversary: (id, patch) =>
        set((s) => ({
          anniversaries: s.anniversaries.map((a) => (a.id === id ? { ...a, ...patch, id, updatedAt: Date.now() } : a)),
        })),

      deleteAnniversary: (id) =>
        set((s) => {
          const anniversary = s.anniversaries.find((a) => a.id === id);
          if (!anniversary) return {};
          return {
            anniversaries: s.anniversaries.filter((a) => a.id !== id),
            trash: { reminders: [], notebook: null, anniversary, at: Date.now() },
          };
        }),

      addDesign: (d) => {
        const design = makeDesign({ name: `Pósit ${get().designs.length + 1}`, ...d });
        set((s) => ({ designs: [...s.designs, design] }));
        return design.id;
      },

      updateDesign: (id, patch) =>
        set((s) => ({ designs: s.designs.map((d) => (d.id === id ? { ...d, ...patch, id } : d)) })),

      deleteDesign: (id) =>
        set((s) => {
          const designs = s.designs.filter((d) => d.id !== id);
          return { designs: designs.length ? designs : [makeDesign()] };
        }),

      bindWidget: (widgetId, designId) =>
        set((s) => {
          const widgetBindings = { ...s.widgetBindings };
          if (designId) widgetBindings[String(widgetId)] = designId;
          else delete widgetBindings[String(widgetId)];
          return { widgetBindings };
        }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetAll: () => set({ ...initialData(), trash: null }),
    }),
    {
      name: STORE_KEY,
      version: 1,
      storage: createJSONStorage(() => kv),
      partialize: ({ notebooks, reminders, designs, anniversaries, settings, widgetBindings, seeded }) => ({
        notebooks,
        reminders,
        designs,
        anniversaries,
        settings,
        widgetBindings,
        seeded,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Data>;
        return {
          ...current,
          ...p,
          designs: (p.designs ?? current.designs).map((d) => ({ ...d, glass: d.glass ?? 0.6 })),
          anniversaries: p.anniversaries ?? [],
          settings: { ...DEFAULT_SETTINGS, ...p.settings },
        };
      },
    }
  )
);

/** Vuelve a leer el almacenamiento (p. ej. tras cambios hechos desde un widget en segundo plano). */
export function rehydrateStore() {
  return useStore.persist.rehydrate();
}
