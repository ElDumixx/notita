import { ExtensionStorage } from '@bacons/apple-targets';

import { useStore } from '@/store';

import { buildSnapshot } from './widget-data';

export const APP_GROUP = 'group.com.paulbumb.notita';

const storage = new ExtensionStorage(APP_GROUP);

export async function syncWidgets(): Promise<void> {
  storage.set('snapshot', JSON.stringify(buildSnapshot(useStore.getState())));
  ExtensionStorage.reloadWidget();
}

/** El widget de iOS deja aquí los recordatorios marcados como hechos con su botón. */
export function applyWidgetActions(): void {
  const raw = storage.get('completedFromWidget');
  if (!raw) return;
  storage.remove('completedFromWidget');
  let ids: string[] = [];
  try {
    ids = JSON.parse(raw);
  } catch {
    return;
  }
  const store = useStore.getState();
  for (const id of ids) {
    const r = store.reminders.find((x) => x.id === id);
    if (r && !r.completedAt) store.toggleComplete(id);
  }
}
