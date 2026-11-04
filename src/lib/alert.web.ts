import type { AlertButton } from 'react-native';

/**
 * Web: el Alert de React Native no hace nada, así que se usan los diálogos del navegador.
 * Con varias opciones, «Aceptar» ejecuta la última (la acción principal o destructiva).
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const text = message ? `${title}\n\n${message}` : title;
  const actions = (buttons ?? []).filter((b) => b.style !== 'cancel');
  if (actions.length === 0) {
    globalThis.alert?.(text);
    return;
  }
  const main = actions[actions.length - 1];
  if (globalThis.confirm?.(actions.length > 1 ? `${text}\n\n(Aceptar: ${main.text})` : text)) main.onPress?.();
}
