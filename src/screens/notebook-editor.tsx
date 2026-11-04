import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { useCardFill } from '@/components/glass';
import { GlassBackdrop } from '@/components/glass-backdrop';
import { SheetHeader } from '@/components/sheet-header';
import { SHEET_MAX_WIDTH } from '@/hooks/use-responsive';
import { Button, FieldLabel, Grid } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { useStore } from '@/store';
import { EMOJIS, NOTEBOOK_KINDS, NOTEBOOK_TEMPLATES } from '@/store/seed';
import type { NotebookKind } from '@/store/types';
import { notebookColors, RADIUS, useTheme } from '@/theme';
import { POP } from '@/theme/motion';
import { PASTEL_KEYS, PASTELS, type PastelKey } from '@/theme/palette';

export function NotebookEditor({ id }: { id: string }) {
  const theme = useTheme();
  const card = useCardFill();
  const isNew = id === 'new';
  const existing = useStore((s) => s.notebooks.find((n) => n.id === id));
  const addNotebook = useStore((s) => s.addNotebook);
  const updateNotebook = useStore((s) => s.updateNotebook);

  const [kind, setKind] = useState<NotebookKind>(existing?.kind ?? 'personal');
  const [name, setName] = useState(existing?.name ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? NOTEBOOK_TEMPLATES.personal.emoji);
  const [color, setColor] = useState<PastelKey>(existing?.color ?? NOTEBOOK_TEMPLATES.personal.color);

  const c = notebookColors(color, theme);

  const pickKind = (k: NotebookKind) => {
    const t = NOTEBOOK_TEMPLATES[k];
    setKind(k);
    setEmoji(t.emoji);
    setColor(t.color);
    if (!name.trim() || NOTEBOOK_KINDS.some((x) => NOTEBOOK_TEMPLATES[x].name === name)) setName(t.name);
  };

  const save = () => {
    const clean = name.trim() || NOTEBOOK_TEMPLATES[kind].name;
    if (isNew) addNotebook({ name: clean, emoji, color, kind });
    else updateNotebook(id, { name: clean, emoji, color, kind });
    haptic.success();
    router.back();
  };

  return (
    <View style={{ flex: 1 }}>
      <GlassBackdrop radius={28} />
      <View collapsable={false}>
        <SheetHeader title={isNew ? 'Nueva libreta' : 'Editar libreta'} onCancel={() => router.back()} onSave={save} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48, gap: 24, width: '100%', maxWidth: SHEET_MAX_WIDTH, alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', gap: 14 }}>
          <Animated.View key={`${emoji}${color}`} entering={POP} style={{ width: 88, height: 88, borderRadius: 26, borderCurve: 'continuous', backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 44 }}>{emoji}</Text>
          </Animated.View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Nombre de la libreta"
            placeholderTextColor={theme.textTertiary}
            autoFocus={isNew}
            returnKeyType="done"
            onSubmitEditing={save}
            style={{ alignSelf: 'stretch', textAlign: 'center', fontSize: 20, fontWeight: '600', color: theme.text, backgroundColor: card, borderRadius: RADIUS.md, borderCurve: 'continuous', paddingVertical: 14, paddingHorizontal: 16 }}
          />
        </View>

        {isNew ? (
          <View>
            <FieldLabel>Tipo de recordatorios</FieldLabel>
            <Grid
              items={NOTEBOOK_KINDS}
              columns={4}
              render={(k) => {
                const t = NOTEBOOK_TEMPLATES[k];
                const selected = k === kind;
                const kc = notebookColors(t.color, theme);
                return (
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      haptic.tap();
                      pickKind(k);
                    }}
                    style={{ aspectRatio: 1, borderRadius: RADIUS.md, borderCurve: 'continuous', backgroundColor: selected ? kc.bg : card, borderWidth: 2, borderColor: selected ? kc.strong : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 24 }}>{t.emoji}</Text>
                    <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '600', color: selected ? kc.ink : theme.textSecondary }}>
                      {t.name}
                    </Text>
                  </PressableScale>
                );
              }}
            />
          </View>
        ) : null}

        <View>
          <FieldLabel>Color</FieldLabel>
          <Grid
            items={PASTEL_KEYS}
            columns={4}
            render={(k) => {
              const selected = k === color;
              return (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={PASTELS[k].name}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    haptic.tap();
                    setColor(k);
                  }}
                  style={{ height: 52, borderRadius: RADIUS.md, borderCurve: 'continuous', backgroundColor: notebookColors(k, theme).bg, borderWidth: 2.5, borderColor: selected ? PASTELS[k].strong : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: notebookColors(k, theme).ink }}>{PASTELS[k].name}</Text>
                </PressableScale>
              );
            }}
          />
        </View>

        <View>
          <FieldLabel>Icono</FieldLabel>
          <Grid
            items={EMOJIS}
            columns={6}
            render={(e) => (
              <PressableScale
                accessibilityRole="button"
                accessibilityState={{ selected: e === emoji }}
                onPress={() => {
                  haptic.tap();
                  setEmoji(e);
                }}
                style={{ aspectRatio: 1, borderRadius: RADIUS.sm, borderCurve: 'continuous', backgroundColor: e === emoji ? c.bg : card, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </PressableScale>
            )}
          />
        </View>

        {!isNew ? <Button kind="soft" title="Listo" onPress={save} /> : null}
      </ScrollView>
    </View>
  );
}
