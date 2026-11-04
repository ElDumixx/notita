import { requestPinWidget } from 'react-native-android-widget';

import { WIDGET_NAME } from '@/widgets/render';

export const canPinWidget = true;

/** Pide al launcher que coloque un widget de Notita (por defecto, un pósit) en la pantalla de inicio. */
export async function pinWidget(widgetName: string = WIDGET_NAME): Promise<boolean> {
  try {
    return await requestPinWidget({ widgetName });
  } catch {
    return false;
  }
}
