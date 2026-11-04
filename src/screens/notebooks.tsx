import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AddButton } from '@/components/add-button';
import { Glass } from '@/components/glass';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { SectionTitle } from '@/components/ui';
import { useHeaderScroll } from '@/components/screen-header';
import { ScreenTitle } from '@/components/screen-title';
import { cellWidth, useResponsive } from '@/hooks/use-responsive';
import { formatDue } from '@/lib/dates';
import { useStore } from '@/store';
import { byDue, filterSmart, SMART_LISTS } from '@/store/selectors';
import type { Notebook, Reminder } from '@/store/types';
import { notebookColors, RADIUS, useTheme } from '@/theme';
import { LAYOUT } from '@/theme/motion';
import { PASTELS, type PastelKey } from '@/theme/palette';

const SMART_STYLE: Record<string, { icon: IconName; color: PastelKey }> = {
  todos: { icon: 'tray', color: 'lavanda' },
  programados: { icon: 'calendar', color: 'cielo' },
  importantes: { icon: 'starFill', color: 'limon' },
  hechos: { icon: 'checkCircle', color: 'menta' },
};

function SmartTile({ k, title, count }: { k: string; title: string; count: number }) {
  const theme = useTheme();
  const s = SMART_STYLE[k];
  const c = notebookColors(s.color, theme);
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${title}, ${count}`} onPress={() => router.push(`/libretas/${k}`)} style={{ flex: 1 }}>
      <Glass radius={RADIUS.lg} style={{ flex: 1, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={s.icon} size={16} color={theme.scheme === 'dark' ? c.ink : PASTELS[s.color].ink} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, fontVariant: ['tabular-nums'] }}>{count}</Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textSecondary }}>{title}</Text>
      </Glass>
    </PressableScale>
  );
}

function NotebookCard({ notebook, pending, next }: { notebook: Notebook; pending: number; next?: Reminder }) {
  const theme = useTheme();
  const c = notebookColors(notebook.color, theme);
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${notebook.name}, ${pending} pendientes`} onPress={() => router.push(`/libretas/${notebook.id}`)} style={{ flex: 1 }}>
      <Glass radius={RADIUS.lg} tint={c.bg} style={{ flex: 1, minHeight: 132, padding: 16, justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 30 }}>{notebook.emoji}</Text>
      <View style={{ gap: 2 }}>
        <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '700', color: c.ink }}>
          {notebook.name}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: 13, color: c.ink, opacity: 0.7 }}>
          {pending === 0 ? 'Sin pendientes' : next?.dueAt != null ? formatDue(next.dueAt, next.hasTime) : `${pending} ${pending === 1 ? 'pendiente' : 'pendientes'}`}
        </Text>
      </View>
      {pending > 0 ? (
        <View style={{ position: 'absolute', top: 14, right: 14, minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 8, backgroundColor: theme.scheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.ink, fontVariant: ['tabular-nums'] }}>{pending}</Text>
        </View>
      ) : null}
      </Glass>
    </PressableScale>
  );
}

function NewNotebookCard() {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() => router.push('/notebook/new')}
      style={{ flex: 1, minHeight: 132, borderRadius: RADIUS.lg, borderCurve: 'continuous', borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.textTertiary, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <Icon name="add" size={22} color={theme.textSecondary} />
      <Text style={{ fontSize: 15, fontWeight: '600', color: theme.textSecondary }}>Nueva libreta</Text>
    </PressableScale>
  );
}

/** Divide en filas de `n`; la última se completa con huecos para que la rejilla sea simétrica. */
function rows<T>(list: T[], n: number): (T | null)[][] {
  const out: (T | null)[][] = [];
  for (let i = 0; i < list.length; i += n) {
    const row: (T | null)[] = list.slice(i, i + n);
    while (row.length < n) row.push(null);
    out.push(row);
  }
  return out;
}

const GAP = 12;

export function NotebooksScreen() {
  const layout = useResponsive();
  const headerScroll = useHeaderScroll();
  const inner = layout.inner;
  // Ancho exacto por celda: todas las columnas miden lo mismo (2 en móvil, 3–4 en tablet).
  const cell = cellWidth(inner, layout.columns, GAP);
  // Listas inteligentes: 2×2 en móvil y una sola fila de 4 en tablet.
  const smartColumns = layout.size === 'compact' ? 2 : 4;
  const smartCell = cellWidth(inner, smartColumns, GAP);
  const reminders = useStore((s) => s.reminders);
  const notebooks = useStore((s) => s.notebooks);

  const stats = useMemo(() => {
    const m = new Map<string, { pending: number; next?: Reminder }>();
    for (const n of notebooks) {
      const list = reminders.filter((r) => r.notebookId === n.id && !r.completedAt).sort(byDue);
      m.set(n.id, { pending: list.length, next: list[0] });
    }
    return m;
  }, [reminders, notebooks]);

  const smartCounts = useMemo(() => Object.fromEntries(SMART_LISTS.map((l) => [l.key, filterSmart(reminders, l.key).length])), [reminders]);

  const cells: ('new' | Notebook)[] = [...notebooks, 'new'];

  return (
    <>
      <ScrollView
        {...headerScroll}
        onLayout={layout.onLayout}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: layout.pad, paddingTop: 4, paddingBottom: 140 }}>
        <ScreenTitle title="Libretas" spacing={12} />
        <View style={{ gap: 24 }}>
          <View style={{ gap: GAP }}>
            {rows(SMART_LISTS, smartColumns).map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: GAP }}>
                {row.map((l, j) => (
                  <View key={l?.key ?? `empty-${j}`} style={{ width: smartCell }}>
                    {l ? <SmartTile k={l.key} title={l.title} count={smartCounts[l.key]} /> : null}
                  </View>
                ))}
              </View>
            ))}
          </View>

          <View>
            <SectionTitle>Mis libretas</SectionTitle>
            <View style={{ gap: GAP }}>
              {rows(cells, layout.columns).map((row, i) => (
                <Animated.View key={i} layout={LAYOUT} style={{ flexDirection: 'row', gap: GAP }}>
                  {row.map((item, j) => (
                    <View key={item === 'new' ? 'new' : (item?.id ?? `empty-${j}`)} style={{ width: cell }}>
                      {item === 'new' ? (
                        <NewNotebookCard />
                      ) : item ? (
                        <NotebookCard notebook={item} pending={stats.get(item.id)?.pending ?? 0} next={stats.get(item.id)?.next} />
                      ) : null}
                    </View>
                  ))}
                </Animated.View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      <AddButton label="Nueva libreta" onPress={() => router.push('/notebook/new')} />
    </>
  );
}
