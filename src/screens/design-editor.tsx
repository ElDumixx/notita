import { Host, Slider } from '@expo/ui';
import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, Switch, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SvgXml } from 'react-native-svg';

import { PostitPreview, WIDGET_SIZES, type WidgetSize } from '@/components/postit-preview';
import { sampleItems, SpikeWidgetPreview } from '@/components/special-widget-previews';
import { PressableScale } from '@/components/pressable-scale';
import { useCardFill } from '@/components/glass';
import { GlassBackdrop } from '@/components/glass-backdrop';
import { SheetHeader } from '@/components/sheet-header';
import { Button, Chip, FieldLabel, Segmented, SWITCH_WEB } from '@/components/ui';
import { SHEET_MAX_WIDTH, useResponsive } from '@/hooks/use-responsive';
import { showAlert } from '@/lib/alert';
import { haptic } from '@/lib/haptics';
import { layoutPostit, resolveColors } from '@/lib/postit-art';
import { spikeArt } from '@/lib/spike-art';
import { useStore } from '@/store';
import { makeDesign, makeSpikeDesign } from '@/store/seed';
import type { PaperPattern, PostitShape, WidgetBoard, WidgetDesign, WidgetKind, WidgetSource } from '@/store/types';
import { RADIUS, useTheme } from '@/theme';
import { ENTER } from '@/theme/motion';
import { FONT_KEYS, FONTS, fontStyle } from '@/theme/fonts';
import { INK_KEYS, INKS, PASTELS, paperFor, POSTIT_COLORS } from '@/theme/palette';

const BOARDS: { key: WidgetBoard; label: string }[] = [
  { key: 'completo', label: 'Pósit' },
  { key: 'blanco', label: 'Blanco' },
  { key: 'pastel', label: 'Pastel' },
  { key: 'cristal', label: 'Cristal' },
  { key: 'oscuro', label: 'Oscuro' },
];
// La aguja no tiene «pósit a todo el widget»: el fondo blanco es una mesa.
const SPIKE_BOARDS: { key: WidgetBoard; label: string }[] = [
  { key: 'blanco', label: 'Mesa' },
  { key: 'pastel', label: 'Pastel' },
  { key: 'cristal', label: 'Cristal' },
  { key: 'oscuro', label: 'Oscuro' },
];
const SHAPES: { key: PostitShape; label: string }[] = [
  { key: 'clasico', label: 'Clásico' },
  { key: 'doblado', label: 'Doblado' },
  { key: 'cinta', label: 'Cinta' },
  { key: 'rasgado', label: 'Rasgado' },
  { key: 'redondo', label: 'Redondo' },
];
// En una aguja no hay cinta adhesiva.
const SPIKE_SHAPES = SHAPES.filter((s) => s.key !== 'cinta');
const PAPERS: { key: PaperPattern; label: string }[] = [
  { key: 'liso', label: 'Liso' },
  { key: 'rayas', label: 'Rayas' },
  { key: 'cuadricula', label: 'Cuadros' },
  { key: 'puntos', label: 'Puntos' },
];

/** Fila de opciones con el mismo ancho cada una (simetría). */
function OptionRow<T>({ items, columns, render }: { items: T[]; columns: number; render: (item: T) => ReactNode }) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={{ gap: 10 }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
          {row.map((item, j) => (
            <View key={j} style={{ flex: 1 }}>
              {render(item)}
            </View>
          ))}
          {Array.from({ length: columns - row.length }).map((_, j) => (
            <View key={`f${j}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

function Tile({ selected, label, onPress, children }: { selected: boolean; label: string; onPress: () => void; children: ReactNode }) {
  const theme = useTheme();
  const card = useCardFill();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: '100%', aspectRatio: 1, borderRadius: RADIUS.md, borderCurve: 'continuous', backgroundColor: card, borderWidth: 2, borderColor: selected ? theme.tint : 'transparent', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {children}
      </View>
      <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: selected ? '700' : '500', color: selected ? theme.tint : theme.textSecondary }}>
        {label}
      </Text>
    </PressableScale>
  );
}

function MiniArt({ design, notebooks, size = 46 }: { design: WidgetDesign; notebooks: { id: string; color: never }[] | any[]; size?: number }) {
  const xml = useMemo(() => layoutPostit(size, size, { ...design, showHeader: false }, resolveColors(design, notebooks), { boardRadius: 10 }).svg, [design, notebooks, size]);
  return <SvgXml xml={xml} width={size} height={size} />;
}

// Miniatura de la aguja: se dibuja a 120 puntos (lo mínimo para que se lea) y se reduce.
function MiniSpike({ design, size = 46 }: { design: WidgetDesign; size?: number }) {
  const xml = useMemo(() => spikeArt(120, 120, sampleItems(design).slice(0, 3), design, { radius: 14, titleSize: 13 }).svg, [design]);
  return <SvgXml xml={xml} width={size} height={size} />;
}

export function DesignEditor({ id, kind = 'postit' }: { id: string; kind?: WidgetKind }) {
  const theme = useTheme();
  const card = useCardFill();
  const layout = useResponsive();
  const isNew = id === 'new';
  const existing = useStore((s) => s.designs.find((d) => d.id === id));
  const designs = useStore((s) => s.designs);
  const notebooks = useStore((s) => s.notebooks);
  const addDesign = useStore((s) => s.addDesign);
  const updateDesign = useStore((s) => s.updateDesign);
  const deleteDesign = useStore((s) => s.deleteDesign);

  const [draft, setDraft] = useState<WidgetDesign>(() => {
    if (existing) return existing;
    const count = designs.filter((d) => d.kind === kind).length + 1;
    return kind === 'aguja' ? makeSpikeDesign({ name: `Aguja ${count}` }) : makeDesign({ name: `Pósit ${count}` });
  });
  const spike = draft.kind === 'aguja';
  const [size, setSize] = useState<WidgetSize>('small');
  const set = (patch: Partial<WidgetDesign>) => setDraft((d) => ({ ...d, ...patch }));

  const sources: { key: WidgetSource; label: string }[] = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'proximos', label: 'Próximos' },
    { key: 'importantes', label: 'Importantes' },
    { key: 'todos', label: 'Todo' },
    ...notebooks.map((n) => ({ key: `libreta:${n.id}` as WidgetSource, label: `${n.emoji} ${n.name}` })),
  ];

  // Se mide la hoja (en iPad es una tarjeta centrada, más estrecha que la pantalla).
  const maxPreview = Math.min(layout.width, SHEET_MAX_WIDTH) - 40 - 24;
  const { w, h } = WIDGET_SIZES[size];
  const scale = Math.min(1.25, maxPreview / w, 260 / h);

  const save = () => {
    const clean = { ...draft, name: draft.name.trim() || (spike ? 'Mi aguja' : 'Mi pósit') };
    if (isNew) addDesign(clean);
    else updateDesign(id, clean);
    haptic.success();
    router.back();
  };

  const remove = () =>
    showAlert(`¿Eliminar «${draft.name}»?`, 'Los widgets que lo usen pasarán al primer diseño.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          haptic.warning();
          router.back();
          setTimeout(() => deleteDesign(id), 250);
        },
      },
    ]);

  const autoColor = draft.source.startsWith('libreta:') ? notebooks.find((n) => `libreta:${n.id}` === draft.source)?.color ?? 'limon' : 'limon';

  return (
    <View style={{ flex: 1 }}>
      <GlassBackdrop radius={28} />
      <View collapsable={false}>
        <SheetHeader title={isNew ? (spike ? 'Nueva aguja' : 'Nuevo diseño') : spike ? 'Diseño de la aguja' : 'Diseño del widget'} onCancel={() => router.back()} onSave={save} />
      </View>
      <ScrollView
        onLayout={layout.onLayout}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 48, gap: 24, width: '100%', maxWidth: SHEET_MAX_WIDTH, alignSelf: 'center' }}>
        <View style={{ gap: 14 }}>
          <View style={{ height: 270, borderRadius: RADIUS.xl, borderCurve: 'continuous', backgroundColor: theme.scheme === 'dark' ? '#1A1918' : '#EFEBE5', alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View key={size} entering={ENTER}>
              {spike ? <SpikeWidgetPreview design={draft} size={size} scale={scale} sample /> : <PostitPreview design={draft} size={size} scale={scale} />}
            </Animated.View>
          </View>
          <Segmented options={(Object.keys(WIDGET_SIZES) as WidgetSize[]).map((k) => ({ key: k, label: WIDGET_SIZES[k].label }))} value={size} onChange={setSize} />
        </View>

        <View>
          <FieldLabel>Nombre</FieldLabel>
          <TextInput
            value={draft.name}
            onChangeText={(name) => set({ name })}
            placeholder={spike ? 'Mi aguja' : 'Mi pósit'}
            placeholderTextColor={theme.textTertiary}
            style={{ fontSize: 16, color: theme.text, backgroundColor: card, borderRadius: RADIUS.md, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 12 }}
          />
        </View>

        {spike ? (
          <Text style={{ fontSize: 14, lineHeight: 20, color: theme.textSecondary, marginTop: -8 }}>
            Muestra tus recordatorios importantes. Con el color «Libreta», cada pósit lleva el color de su libreta.
          </Text>
        ) : (
          <View>
            <FieldLabel>Qué muestra</FieldLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {sources.map((s) => (
                <Chip key={s.key} label={s.label} selected={draft.source === s.key} onPress={() => set({ source: s.key })} />
              ))}
            </View>
          </View>
        )}

        <View>
          <FieldLabel>Fondo</FieldLabel>
          <OptionRow
            items={spike ? SPIKE_BOARDS : BOARDS}
            columns={spike ? 4 : 5}
            render={(b) => (
              <Tile selected={draft.board === b.key} label={b.label} onPress={() => set({ board: b.key })}>
                {spike ? <MiniSpike design={{ ...draft, board: b.key }} size={58} /> : <MiniArt design={{ ...draft, board: b.key }} notebooks={notebooks} />}
              </Tile>
            )}
          />
          {draft.board === 'cristal' && process.env.EXPO_OS === 'ios' ? (
            // iOS pone una base opaca bajo los widgets; el cristal de verdad lo aplica el sistema.
            <Animated.Text entering={ENTER} style={{ marginTop: 12, fontSize: 13, lineHeight: 18, color: theme.textSecondary }}>
              En iOS, el cristal de verdad lo pone el sistema: elige el estilo «Traslúcido» al personalizar la pantalla de inicio.
            </Animated.Text>
          ) : draft.board === 'cristal' ? (
            <Animated.View entering={ENTER} style={{ marginTop: 14, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={{ fontSize: 14, color: theme.text }}>Transparencia del cristal</Text>
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.tint, fontVariant: ['tabular-nums'] }}>{Math.round(draft.glass * 100)} %</Text>
              </View>
              <Host matchContents={{ vertical: true }} seedColor={theme.tint} style={{ alignSelf: 'stretch' }}>
                <Slider value={Math.round(draft.glass * 100)} min={0} max={100} step={5} onValueChange={(v) => set({ glass: Math.round(v) / 100 })} />
              </Host>
            </Animated.View>
          ) : null}
        </View>

        <View>
          <FieldLabel>Forma del pósit</FieldLabel>
          <OptionRow
            items={spike ? SPIKE_SHAPES : SHAPES}
            columns={spike ? 4 : 5}
            render={(s) => (
              <Tile selected={draft.shape === s.key} label={s.label} onPress={() => set({ shape: s.key })}>
                {spike ? (
                  <MiniSpike design={{ ...draft, shape: s.key, board: 'blanco', paper: 'liso' }} size={58} />
                ) : (
                  <MiniArt design={{ ...draft, shape: s.key, board: 'blanco', paper: 'liso' }} notebooks={notebooks} />
                )}
              </Tile>
            )}
          />
        </View>

        <View>
          <FieldLabel>Papel</FieldLabel>
          <OptionRow
            items={PAPERS}
            columns={4}
            render={(p) => (
              <Tile selected={draft.paper === p.key} label={p.label} onPress={() => set({ paper: p.key })}>
                {spike ? (
                  <MiniSpike design={{ ...draft, paper: p.key, board: 'blanco', shape: 'clasico' }} size={58} />
                ) : (
                  <MiniArt design={{ ...draft, paper: p.key, board: 'completo', shape: 'clasico' }} notebooks={notebooks} size={58} />
                )}
              </Tile>
            )}
          />
        </View>

        <View>
          <FieldLabel>Color</FieldLabel>
          <OptionRow
            items={POSTIT_COLORS}
            columns={5}
            render={(c) => {
              const paper = c === 'auto' ? PASTELS[autoColor] : paperFor(c);
              const selected = draft.color === c;
              return (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={c === 'auto' ? 'Color de la libreta' : paper.name}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    haptic.tap();
                    set({ color: c });
                  }}
                  style={{ alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: paper.paper, borderWidth: selected ? 3 : 1, borderColor: selected ? theme.tint : theme.separator, alignItems: 'center', justifyContent: 'center' }}>
                    {c === 'auto' ? <Text style={{ fontSize: 11, fontWeight: '700', color: paper.ink }}>Auto</Text> : null}
                  </View>
                  <Text numberOfLines={1} style={{ fontSize: 11, color: selected ? theme.tint : theme.textSecondary, fontWeight: selected ? '700' : '500' }}>
                    {c === 'auto' ? 'Libreta' : paper.name}
                  </Text>
                </PressableScale>
              );
            }}
          />
        </View>

        <View>
          <FieldLabel>Tipo de letra</FieldLabel>
          <OptionRow
            items={FONT_KEYS}
            columns={4}
            render={(f) => (
              <Tile selected={draft.font === f} label={FONTS[f].name} onPress={() => set({ font: f })}>
                <Text style={[{ fontSize: 24 * FONTS[f].scale, color: theme.text }, fontStyle(f, 'regular')]}>Aa</Text>
              </Tile>
            )}
          />
        </View>

        <View>
          <FieldLabel>Tinta</FieldLabel>
          <Segmented options={INK_KEYS.map((k) => ({ key: k, label: INKS[k].name }))} value={draft.ink} onChange={(ink) => set({ ink })} />
        </View>

        <View style={{ backgroundColor: card, borderRadius: RADIUS.lg, borderCurve: 'continuous', paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
            <Text style={{ flex: 1, fontSize: 16, color: theme.text }}>{spike ? 'Mostrar libreta' : 'Mostrar título'}</Text>
            <Switch value={draft.showHeader} onValueChange={(showHeader) => set({ showHeader })} trackColor={{ true: theme.tint }} {...SWITCH_WEB} />
          </View>
          <View style={{ height: 1, backgroundColor: theme.separator }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
            <Text style={{ flex: 1, fontSize: 16, color: theme.text }}>{spike ? 'Mostrar fecha' : 'Mostrar hora'}</Text>
            <Switch value={draft.showTime} onValueChange={(showTime) => set({ showTime })} trackColor={{ true: theme.tint }} {...SWITCH_WEB} />
          </View>
        </View>

        {!isNew && designs.filter((d) => d.kind === draft.kind).length > 1 ? <Button kind="danger" icon="trash" title="Eliminar diseño" onPress={remove} /> : null}
      </ScrollView>
    </View>
  );
}
