'use no memo';
// El widget de Android se construye llamando a estas funciones fuera de React: sin React Compiler.

import type { WidgetInfo } from 'react-native-android-widget';

import { useStore } from '@/store';

import { AnniversaryWidget } from './anniversary-widget';
import { PostitWidget } from './postit-widget';
import { SpikeWidget } from './spike-widget';

export const WIDGET_NAME = 'Postit';
export const ANNIVERSARY_WIDGET = 'Aniversarios';
export const SPIKE_WIDGET = 'Importantes';
export const WIDGET_NAMES = [WIDGET_NAME, ANNIVERSARY_WIDGET, SPIKE_WIDGET] as const;

export function designForWidget(widgetId: number) {
  const { designs, widgetBindings } = useStore.getState();
  return designs.find((d) => d.id === widgetBindings[String(widgetId)]) ?? designs[0];
}

export function renderPostitWidget(info: WidgetInfo) {
  const state = useStore.getState();
  return <PostitWidget design={designForWidget(info.widgetId)} state={state} width={info.width} height={info.height} />;
}

/** Dibuja cualquiera de los widgets de Notita según su nombre. */
export function renderWidget(info: WidgetInfo) {
  const state = useStore.getState();
  if (info.widgetName === ANNIVERSARY_WIDGET) return <AnniversaryWidget state={state} width={info.width} height={info.height} />;
  if (info.widgetName === SPIKE_WIDGET) return <SpikeWidget state={state} width={info.width} height={info.height} />;
  return renderPostitWidget(info);
}
