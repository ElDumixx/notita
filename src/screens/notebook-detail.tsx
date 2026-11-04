import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AddButton } from '@/components/add-button';
import { EmptyState } from '@/components/empty-state';
import { Glass } from '@/components/glass';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { ReminderRow } from '@/components/reminder-row';
import { Group, SectionTitle } from '@/components/ui';
import { ScreenTitle } from '@/components/screen-title';
import { useResponsive } from '@/hooks/use-responsive';
import { showAlert } from '@/lib/alert';
import { haptic } from '@/lib/haptics';
import { useStore } from '@/store';
import { byDue, filterSmart, isSmartList, SMART_LISTS } from '@/store/selectors';
import { notebookColors, RADIUS, useTheme } from '@/theme';
import { ENTER } from '@/theme/motion';

function ActionButton({ icon, label, onPress, danger }: { icon: IconName; label: string; onPress: () => void; danger?: boolean }) {
  const theme = useTheme();
  const color = danger ? theme.danger : theme.text;
  return (
    <PressableScale accessibilityRole="button" onPress={onPress} style={{ flex: 1 }}>
      <Glass radius={RADIUS.md} tint={danger ? theme.dangerSoft : undefined} style={{ height: 64, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <Icon name={icon} size={18} color={color} />
        <Text style={{ fontSize: 12, fontWeight: '600', color }}>{label}</Text>
      </Glass>
    </PressableScale>
  );
}

export function NotebookDetailScreen({ id }: { id: string }) {
  const theme = useTheme();
  const reminders = useStore((s) => s.reminders);
  const notebooks = useStore((s) => s.notebooks);
  const deleteNotebook = useStore((s) => s.deleteNotebook);
  const clearCompleted = useStore((s) => s.clearCompleted);
  const [showDone, setShowDone] = useState(false);
  const layout = useResponsive();

  const smart = isSmartList(id) ? SMART_LISTS.find((l) => l.key === id) : undefined;
  const notebook = notebooks.find((n) => n.id === id);
  const byId = useMemo(() => new Map(notebooks.map((n) => [n.id, n])), [notebooks]);

  const { pending, done } = useMemo(() => {
    const list = smart ? filterSmart(reminders, smart.key) : reminders.filter((r) => r.notebookId === id);
    return {
      pending: list.filter((r) => !r.completedAt).sort(byDue),
      done: list.filter((r) => r.completedAt).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
    };
  }, [reminders, id, smart]);

  if (!smart && !notebook) {
    return <EmptyState title="Esta libreta ya no existe" />;
  }

  const title = smart?.title ?? notebook!.name;
  const colors = notebook ? notebookColors(notebook.color, theme) : null;

  const confirmDelete = () => {
    if (!notebook) return;
    const others = notebooks.filter((n) => n.id !== notebook.id);
    const count = reminders.filter((r) => r.notebookId === notebook.id).length;
    showAlert(`¿Eliminar «${notebook.name}»?`, count ? `Tiene ${count} ${count === 1 ? 'recordatorio' : 'recordatorios'}. Podrás deshacerlo durante unos segundos.` : undefined, [
      { text: 'Cancelar', style: 'cancel' },
      ...(count && others.length
        ? [{ text: `Mover a ${others[0].emoji} ${others[0].name}`, onPress: () => remove(others[0].id) }]
        : []),
      { text: count ? 'Eliminar todo' : 'Eliminar', style: 'destructive' as const, onPress: () => remove() },
    ]);
  };
  const remove = (moveTo?: string) => {
    haptic.warning();
    router.back();
    setTimeout(() => deleteNotebook(id, moveTo), 250);
  };

  const showNotebook = !!smart;
  const list = smart?.key === 'hechos' ? done : pending;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView
        onLayout={layout.onLayout}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: layout.pad, paddingTop: 8, paddingBottom: 140 }}>
        <ScreenTitle title={title} large={false} back />
        <View style={{ gap: 22 }}>
        <Animated.View entering={ENTER} style={{ alignItems: 'center', gap: 10, paddingTop: 8 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors?.bg ?? theme.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
            {notebook ? <Text style={{ fontSize: 36 }}>{notebook.emoji}</Text> : <Icon name={smart?.key === 'hechos' ? 'checkCircle' : smart?.key === 'importantes' ? 'starFill' : smart?.key === 'programados' ? 'calendar' : 'tray'} size={30} color={theme.tint} />}
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text }}>{title}</Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>
            {smart?.key === 'hechos' ? `${done.length} completados` : `${pending.length} ${pending.length === 1 ? 'pendiente' : 'pendientes'}${done.length ? ` · ${done.length} hechos` : ''}`}
          </Text>
        </Animated.View>

        {notebook ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <ActionButton icon="edit" label="Editar" onPress={() => router.push(`/notebook/${notebook.id}`)} />
            <ActionButton icon="checkCircle" label="Borrar hechos" onPress={() => (done.length ? clearCompleted(notebook.id) : null)} />
            <ActionButton icon="trash" label="Eliminar" danger onPress={confirmDelete} />
          </View>
        ) : smart?.key === 'hechos' && done.length ? (
          <View style={{ flexDirection: 'row' }}>
            <ActionButton icon="trash" label="Borrar todos los hechos" danger onPress={() => clearCompleted()} />
          </View>
        ) : null}

        {list.length ? (
          <Group>
            {list.map((r, i) => (
              <ReminderRow key={r.id} reminder={r} notebook={byId.get(r.notebookId)} showNotebook={showNotebook} isLast={i === list.length - 1} />
            ))}
          </Group>
        ) : (
          <EmptyState title={smart?.key === 'hechos' ? 'Aún no hay nada hecho' : 'Nada pendiente aquí'} message={notebook ? 'Añade un recordatorio a esta libreta con el botón +.' : undefined} />
        )}

        {smart?.key !== 'hechos' && done.length ? (
          <View>
            <Pressable onPress={() => setShowDone((v) => !v)} accessibilityRole="button">
              <SectionTitle
                right={
                  <View style={{ transform: [{ rotate: showDone ? '90deg' : '0deg' }] }}>
                    <Icon name="chevron" size={12} color={theme.textSecondary} weight="semibold" />
                  </View>
                }>
                {`Hechos · ${done.length}`}
              </SectionTitle>
            </Pressable>
            {showDone ? (
              <Group>
                {done.map((r, i) => (
                  <ReminderRow key={r.id} reminder={r} notebook={byId.get(r.notebookId)} showNotebook={showNotebook} isLast={i === done.length - 1} />
                ))}
              </Group>
            ) : null}
          </View>
        ) : null}
        </View>
      </ScrollView>
      {smart?.key !== 'hechos' ? (
        <AddButton label="Nuevo recordatorio" onPress={() => router.push(notebook ? `/reminder/new?notebookId=${notebook.id}` : '/reminder/new')} />
      ) : null}
    </>
  );
}
