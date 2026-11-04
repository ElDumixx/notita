// Web: Safari no permite avisos locales con la app cerrada, así que aquí no se programa nada.
// Misma interfaz que notifications.ts para que el resto de la app no tenga que distinguir.
export { respectQuietHours } from './quiet-hours';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export const notificationsSupported = false;

export function configureNotifications() {}

export async function getPermission(): Promise<PermissionState> {
  return 'denied';
}

export async function requestPermission(): Promise<boolean> {
  return false;
}

export async function syncNotifications(): Promise<void> {}

export function useNotificationNavigation() {}
