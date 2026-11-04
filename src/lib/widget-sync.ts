// Plataformas sin widgets (web): no hace nada. Ver widget-sync.ios.ts y widget-sync.android.ts.

export async function syncWidgets(): Promise<void> {}

/** Aplica acciones hechas desde el widget mientras la app estaba cerrada. */
export function applyWidgetActions(): void {}
