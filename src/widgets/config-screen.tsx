import { Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';

import { PostitPreview } from '@/components/postit-preview';
import { SpikeWidgetPreview } from '@/components/special-widget-previews';
import { syncWidgets } from '@/lib/widget-sync';
import { useStore } from '@/store';
import { THEMES } from '@/theme';

import { PostitWidget } from './postit-widget';
import { kindForWidget } from './render';
import { SpikeWidget } from './spike-widget';

/** Pantalla que abre Android al colocar (o reconfigurar) un widget: elige el diseño de su tipo. */
export function WidgetConfigScreen({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
  const theme = THEMES[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const kind = kindForWidget(widgetInfo.widgetName);
  const all = useStore((s) => s.designs);
  const designs = all.filter((d) => d.kind === kind);
  const current = useStore((s) => s.widgetBindings[String(widgetInfo.widgetId)]);

  const choose = (designId: string) => {
    const store = useStore.getState();
    store.bindWidget(widgetInfo.widgetId, designId);
    const design = store.designs.find((d) => d.id === designId)!;
    const props = { design, state: useStore.getState(), width: widgetInfo.width, height: widgetInfo.height };
    renderWidget(kind === 'aguja' ? <SpikeWidget {...props} /> : <PostitWidget {...props} />);
    syncWidgets();
    setResult('ok');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, gap: 4 }}>
        <Text style={{ fontSize: 26, fontWeight: '700', color: theme.text }}>{kind === 'aguja' ? 'Elige la aguja' : 'Elige un pósit'}</Text>
        <Text style={{ fontSize: 14, color: theme.textSecondary }}>Puedes crear más diseños en la pestaña Widgets de Notita.</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {designs.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => choose(d.id)}
            style={{ width: '47%', alignItems: 'center', gap: 8, padding: 8, borderRadius: 20, borderWidth: 2, borderColor: d.id === current ? theme.tint : 'transparent' }}>
            {kind === 'aguja' ? <SpikeWidgetPreview design={d} size="small" scale={0.95} sample /> : <PostitPreview design={d} size="small" scale={0.95} />}
            <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
              {d.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable onPress={() => setResult('cancel')} style={{ margin: 16, height: 50, borderRadius: 16, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>Cancelar</Text>
      </Pressable>
    </View>
  );
}
