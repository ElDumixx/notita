import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AddButton } from '@/components/add-button';
import { Icon } from '@/components/icon';
import { PostitPreview, WIDGET_SIZES } from '@/components/postit-preview';
import { PressableScale } from '@/components/pressable-scale';
import { AnniversaryWidgetPreview, SpikeWidgetPreview } from '@/components/special-widget-previews';
import { Button, Group, Row, SectionTitle, TEXT_INSET } from '@/components/ui';
import { useHeaderScroll } from '@/components/screen-header';
import { ScreenTitle } from '@/components/screen-title';
import { cellWidth, READABLE_WIDTH, useResponsive } from '@/hooks/use-responsive';
import { canPinWidget, pinWidget } from '@/lib/pin-widget';
import { useStore } from '@/store';
import type { WidgetDesign, WidgetKind } from '@/store/types';
import { RADIUS, useTheme } from '@/theme';
import { ENTER, LAYOUT } from '@/theme/motion';

const STEPS =
  process.env.EXPO_OS === 'web'
    ? [
        'Los widgets son de las apps de iOS y Android: en la web no se pueden poner en la pantalla de inicio.',
        'Diseña aquí tus pósits: se guardan en este navegador.',
      ]
    : process.env.EXPO_OS === 'ios'
    ? [
        'Mantén pulsada la pantalla de inicio y toca «Editar» → «Añadir widget».',
        'Busca Notita y elige el tamaño del pósit.',
        'Mantén pulsado el widget → «Editar widget» para escoger el diseño.',
      ]
    : [
        'Mantén pulsada la pantalla de inicio y toca «Widgets».',
        'Busca Notita y arrastra el pósit a la pantalla.',
        'Elige el diseño. Para cambiarlo, mantén pulsado el widget → «Configurar».',
      ];

const GAP = 14;

/** Widgets con diseño propio (no se personalizan): nombre del widget de Android incluido. */
const SPECIAL = [{ name: 'Aniversarios', desc: 'Cuenta atrás para cumpleaños y aniversarios, con globos y confeti.', Preview: AnniversaryWidgetPreview }];

/** Rejilla de diseños de un tipo (pósits o agujas), con la casilla para crear uno nuevo al final. */
function DesignGrid({ kind, designs, columns, cell, scale }: { kind: WidgetKind; designs: WidgetDesign[]; columns: number; cell: number; scale: number }) {
  const theme = useTheme();
  const rows: (WidgetDesign | 'new')[][] = [];
  const cells: (WidgetDesign | 'new')[] = [...designs, 'new'];
  for (let i = 0; i < cells.length; i += columns) rows.push(cells.slice(i, i + columns));
  return (
    <View style={{ gap: 18 }}>
      {rows.map((row, i) => (
        <Animated.View key={i} entering={ENTER} layout={LAYOUT} style={{ flexDirection: 'row', gap: GAP }}>
          {row.map((d) =>
            d === 'new' ? (
              <PressableScale
                key="new"
                accessibilityRole="button"
                onPress={() => router.push(kind === 'aguja' ? '/design/new?kind=aguja' : '/design/new')}
                style={{ width: cell, height: cell, borderRadius: RADIUS.lg, borderCurve: 'continuous', borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.textTertiary, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Icon name="add" size={22} color={theme.textSecondary} />
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textSecondary }}>{kind === 'aguja' ? 'Nueva aguja' : 'Nuevo diseño'}</Text>
              </PressableScale>
            ) : (
              <PressableScale key={d.id} accessibilityRole="button" accessibilityLabel={`Editar ${d.name}`} onPress={() => router.push(`/design/${d.id}`)} style={{ width: cell, gap: 8 }}>
                {kind === 'aguja' ? <SpikeWidgetPreview design={d} size="small" scale={scale} sample /> : <PostitPreview design={d} size="small" scale={scale} />}
                <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: theme.text, textAlign: 'center' }}>
                  {d.name}
                </Text>
              </PressableScale>
            )
          )}
          {Array.from({ length: columns - row.length }, (_, k) => (
            <View key={`empty-${k}`} style={{ width: cell }} />
          ))}
        </Animated.View>
      ))}
    </View>
  );
}

export function WidgetsScreen() {
  const theme = useTheme();
  const designs = useStore((s) => s.designs);
  const layout = useResponsive();
  const headerScroll = useHeaderScroll();
  const columns = layout.columns;
  const cell = cellWidth(layout.inner, columns, GAP);
  const scale = cell / WIDGET_SIZES.small.w;

  const postits = designs.filter((d) => d.kind === 'postit');
  const spikes = designs.filter((d) => d.kind === 'aguja');

  return (
    <>
      <ScrollView
        {...headerScroll}
        onLayout={layout.onLayout}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: layout.pad, paddingTop: 4, paddingBottom: 140, gap: 24 }}>
        <ScreenTitle title="Widgets" />
        <View style={{ maxWidth: READABLE_WIDTH }}>
          <Text style={{ fontSize: 15, color: theme.textSecondary, paddingHorizontal: TEXT_INSET, lineHeight: 21 }}>
            Diseña tus pósits y la aguja de importantes para la pantalla de inicio: fondo, forma, papel, color y tipo de letra.
          </Text>
        </View>

        <View>
          <SectionTitle>Tus pósits</SectionTitle>
          <DesignGrid kind="postit" designs={postits} columns={columns} cell={cell} scale={scale} />
        </View>

        {canPinWidget ? (
          <View style={{ maxWidth: READABLE_WIDTH }}>
            <Button icon="add" title="Añadir un pósit a la pantalla de inicio" onPress={() => pinWidget()} />
          </View>
        ) : null}

        <View>
          <SectionTitle>Aguja de importantes</SectionTitle>
          <Text style={{ fontSize: 14, lineHeight: 20, color: theme.textSecondary, paddingHorizontal: TEXT_INSET, marginBottom: 12, maxWidth: READABLE_WIDTH }}>
            Tus importantes clavados en una aguja, cada uno con el color de su libreta. Al hacer uno, sale y aparece el siguiente.
          </Text>
          <DesignGrid kind="aguja" designs={spikes} columns={columns} cell={cell} scale={scale} />
        </View>

        {canPinWidget ? (
          <View style={{ maxWidth: READABLE_WIDTH }}>
            <Button icon="add" kind="soft" title="Añadir la aguja a la pantalla de inicio" onPress={() => pinWidget('Importantes')} />
          </View>
        ) : null}

        <View>
          <SectionTitle>Más widgets</SectionTitle>
          <View style={{ flexDirection: 'row', gap: GAP }}>
            {SPECIAL.map(({ name, desc, Preview }) => (
              <PressableScale
                key={name}
                accessibilityRole={canPinWidget ? 'button' : undefined}
                accessibilityLabel={canPinWidget ? `Añadir el widget ${name}` : `Widget ${name}`}
                disabled={!canPinWidget}
                onPress={() => pinWidget(name)}
                style={{ width: cell, gap: 8 }}>
                <Preview size="small" scale={scale} />
                <View style={{ paddingHorizontal: TEXT_INSET, gap: 2 }}>
                  <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>
                    {name}
                  </Text>
                  <Text style={{ fontSize: 13, lineHeight: 17, color: theme.textSecondary }}>{desc}</Text>
                  {canPinWidget ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                      <Icon name="add" size={14} color={theme.tint} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.tint }}>Añadir</Text>
                    </View>
                  ) : null}
                </View>
              </PressableScale>
            ))}
            {Array.from({ length: Math.max(0, columns - SPECIAL.length) }, (_, k) => (
              <View key={`empty-${k}`} style={{ width: cell }} />
            ))}
          </View>
        </View>

        <View style={{ maxWidth: READABLE_WIDTH }}>
          <SectionTitle>{process.env.EXPO_OS === 'web' ? 'En la web' : 'Cómo añadirlo'}</SectionTitle>
          <Group>
            {STEPS.map((s, i) => (
              <Row
                key={i}
                title={s}
                isLast={i === STEPS.length - 1}
                leading={
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.tint }}>{i + 1}</Text>
                  </View>
                }
              />
            ))}
          </Group>
          {process.env.EXPO_OS !== 'web' ? (
            <Text style={{ fontSize: 13, color: theme.textTertiary, marginTop: 10, paddingHorizontal: TEXT_INSET, lineHeight: 18 }}>
              Toca el círculo de un recordatorio en el widget para marcarlo como hecho.
            </Text>
          ) : null}
        </View>
      </ScrollView>
      <AddButton label="Nuevo diseño" onPress={() => router.push('/design/new')} />
    </>
  );
}
