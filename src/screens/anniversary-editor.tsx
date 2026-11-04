import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Switch, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { DateTimePicker } from '@/components/date-picker';
import { useCardFill } from '@/components/glass';
import { GlassBackdrop } from '@/components/glass-backdrop';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { SheetHeader } from '@/components/sheet-header';
import { Button, Chip, FieldLabel, Grid, Segmented, SWITCH_WEB } from '@/components/ui';
import { SHEET_MAX_WIDTH } from '@/hooks/use-responsive';
import {
  ANNIVERSARY_EMOJIS,
  anniversaryTitle,
  countdown,
  dayMonth,
  DEFAULT_NOTIFY,
  daysUntil,
  KIND_KEYS,
  KINDS,
  nextDate,
  NOTIFY_OPTIONS,
  yearsLabel,
} from '@/lib/anniversaries';
import { showAlert } from '@/lib/alert';
import { formatMinutes, startOfDay, TIME_PRESETS } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { notificationsSupported, requestPermission, syncNotifications } from '@/lib/notifications';
import { useStore } from '@/store';
import type { AnniversaryKind } from '@/store/types';
import { notebookColors, RADIUS, useTheme } from '@/theme';
import { ENTER, EXIT, LAYOUT, POP } from '@/theme/motion';
import { PASTEL_KEYS, PASTELS, type PastelKey } from '@/theme/palette';

/** Día que llega desde el calendario (medianoche en ms), si es válido. */
function parseDay(date?: string) {
  const ts = Number(date);
  return date && Number.isFinite(ts) ? startOfDay(ts) : null;
}

export function AnniversaryEditor({ id, date }: { id: string; date?: string }) {
  const theme = useTheme();
  const card = useCardFill();
  const isNew = id === 'new';
  const existing = useStore((s) => s.anniversaries.find((a) => a.id === id));
  const addAnniversary = useStore((s) => s.addAnniversary);
  const updateAnniversary = useStore((s) => s.updateAnniversary);
  const deleteAnniversary = useStore((s) => s.deleteAnniversary);

  const thisYear = new Date().getFullYear();
  // Sin año guardado se usa 2000 (bisiesto), así el 29 de febrero también se puede elegir.
  const [picked, setPicked] = useState(() =>
    existing ? new Date(existing.year ?? 2000, existing.month, existing.day) : new Date(parseDay(date) ?? startOfDay(Date.now()))
  );
  const [kind, setKind] = useState<AnniversaryKind>(existing?.kind ?? 'cumple');
  const [name, setName] = useState(existing?.name ?? '');
  const [withYear, setWithYear] = useState(existing ? existing.year != null : false);
  const [emoji, setEmoji] = useState(existing?.emoji ?? KINDS.cumple.emoji);
  const [color, setColor] = useState<PastelKey>(existing?.color ?? KINDS.cumple.color);
  const [notify, setNotify] = useState<number[]>(existing?.notify ?? DEFAULT_NOTIFY);
  const [notifyAt, setNotifyAt] = useState(existing?.notifyAt ?? 9 * 60);
  const [picker, setPicker] = useState(false);

  if (!isNew && !existing) {
    return (
      <View style={{ flex: 1 }}>
        <SheetHeader title="Aniversario" onCancel={() => router.back()} />
        <Text style={{ textAlign: 'center', marginTop: 40, color: theme.textSecondary }}>Esta fecha ya no existe.</Text>
      </View>
    );
  }

  const c = notebookColors(color, theme);
  const draft = { kind, name: name.trim() || '…', month: picked.getMonth(), day: picked.getDate(), year: withYear ? picked.getFullYear() : null };
  const next = nextDate(draft);
  const days = daysUntil(draft);
  const years = yearsLabel(draft, next);

  const pickKind = (k: AnniversaryKind) => {
    // El icono y el color siguen al tipo mientras no se hayan cambiado a mano.
    if (emoji === KINDS[kind].emoji) setEmoji(KINDS[k].emoji);
    if (color === KINDS[kind].color) setColor(KINDS[k].color);
    setKind(k);
  };

  const toggleNotify = (d: number) => setNotify((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d]));

  const save = async () => {
    const clean = name.trim();
    if (!clean) return;
    const payload = {
      kind,
      name: clean,
      month: picked.getMonth(),
      day: picked.getDate(),
      year: withYear ? picked.getFullYear() : null,
      emoji,
      color,
      notify: [...notify].sort((a, b) => b - a),
      notifyAt,
    };
    if (isNew) addAnniversary(payload);
    else updateAnniversary(id, payload);
    haptic.success();
    router.back();
    if (payload.notify.length && notificationsSupported) {
      if (await requestPermission()) syncNotifications();
    }
  };

  const remove = () => {
    const doIt = () => {
      haptic.warning();
      router.back();
      setTimeout(() => deleteAnniversary(id), 250);
    };
    showAlert(`¿Eliminar «${existing?.name}»?`, 'Dejarás de recibir sus avisos. Podrás deshacerlo durante unos segundos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: doIt },
    ]);
  };

  const fullDate = `${dayMonth(draft)}${withYear ? ` de ${picked.getFullYear()}` : ''}`;
  const notifyHint = !notificationsSupported
    ? 'En la versión web no llegan avisos: para recibirlos, usa la app de iOS o Android.'
    : notify.length
      ? `Te avisaremos a las ${formatMinutes(notifyAt)}.`
      : 'Sin avisos: solo aparecerá en el calendario y en el widget.';

  return (
    <View style={{ flex: 1 }}>
      <GlassBackdrop radius={28} />
      <View collapsable={false}>
        <SheetHeader title={isNew ? 'Nueva fecha especial' : 'Editar'} onCancel={() => router.back()} onSave={save} saveDisabled={!name.trim()} />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48, gap: 22, width: '100%', maxWidth: SHEET_MAX_WIDTH, alignSelf: 'center' }}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Animated.View
            key={`${emoji}${color}`}
            entering={POP}
            style={{ width: 88, height: 88, borderRadius: 26, borderCurve: 'continuous', backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 44 }}>{emoji}</Text>
          </Animated.View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={KINDS[kind].placeholder}
            placeholderTextColor={theme.textTertiary}
            autoFocus={isNew}
            returnKeyType="done"
            onSubmitEditing={save}
            style={{ alignSelf: 'stretch', textAlign: 'center', fontSize: 20, fontWeight: '600', color: theme.text, backgroundColor: card, borderRadius: RADIUS.md, borderCurve: 'continuous', paddingVertical: 14, paddingHorizontal: 16 }}
          />
          <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center' }}>
            {name.trim() ? `${anniversaryTitle(draft)} · ` : ''}
            {countdown(days)}
            {years ? ` · ${years}` : ''}
          </Text>
        </View>

        <View>
          <FieldLabel>Tipo</FieldLabel>
          <Segmented options={KIND_KEYS.map((k) => ({ key: k, label: KINDS[k].label }))} value={kind} onChange={pickKind} />
        </View>

        <Animated.View layout={LAYOUT}>
          <FieldLabel>Fecha</FieldLabel>
          <View style={{ backgroundColor: card, borderRadius: RADIUS.lg, borderCurve: 'continuous', overflow: 'hidden' }}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Fecha: ${fullDate}`}
              onPress={() => {
                haptic.tap();
                setPicker((p) => !p);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 52 }}>
              <Icon name="calendar" size={18} color={theme.tint} />
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: theme.text }}>{fullDate}</Text>
              <Text style={{ fontSize: 14, color: theme.tint, fontWeight: '600' }}>{picker ? 'Listo' : 'Cambiar'}</Text>
            </PressableScale>
            {picker ? (
              <Animated.View entering={ENTER} exiting={EXIT} style={{ alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 }}>
                <DateTimePicker
                  value={picked}
                  mode="date"
                  display={process.env.EXPO_OS === 'ios' ? 'spinner' : 'default'}
                  accentColor={theme.tint}
                  locale="es-ES"
                  onChange={(e, d) => {
                    if (process.env.EXPO_OS === 'android') setPicker(false);
                    if (e.type !== 'set' || !d) return;
                    setPicked(d);
                    // Si se elige un año pasado, seguramente se quieren contar los años.
                    if (d.getFullYear() !== picked.getFullYear() && d.getFullYear() < thisYear) setWithYear(true);
                  }}
                />
              </Animated.View>
            ) : null}
            <View style={{ height: 1, backgroundColor: theme.separator, marginLeft: 46 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Icon name="sparkles" size={18} color={theme.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, color: theme.text }}>Contar los años</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                  {withYear ? (years ? `${years} el ${dayMonth(draft)}` : 'Elige un año pasado para contarlos') : 'Sin año: solo se recuerda el día'}
                </Text>
              </View>
              <Switch value={withYear} onValueChange={setWithYear} trackColor={{ true: theme.tint }} {...SWITCH_WEB} />
            </View>
          </View>
        </Animated.View>

        <View>
          <FieldLabel>Avisos</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {NOTIFY_OPTIONS.map((o) => (
              <Chip
                key={o.days}
                label={o.label}
                selected={notify.includes(o.days)}
                leading={notify.includes(o.days) ? <Icon name="check" size={13} color={theme.tint} weight="bold" /> : undefined}
                onPress={() => toggleNotify(o.days)}
              />
            ))}
          </View>
          {notify.length && notificationsSupported ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {TIME_PRESETS.map((m) => (
                <Chip key={m} label={formatMinutes(m)} selected={notifyAt === m} leading={<Icon name="clock" size={13} color={notifyAt === m ? theme.tint : theme.textSecondary} />} onPress={() => setNotifyAt(m)} />
              ))}
            </View>
          ) : null}
          <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 8, marginLeft: 2, lineHeight: 18 }}>{notifyHint}</Text>
        </View>

        <View>
          <FieldLabel>Icono</FieldLabel>
          <Grid
            items={ANNIVERSARY_EMOJIS}
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

        <View>
          <FieldLabel>Color</FieldLabel>
          <Grid
            items={PASTEL_KEYS}
            columns={4}
            render={(k) => {
              const selected = k === color;
              const kc = notebookColors(k, theme);
              return (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={PASTELS[k].name}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    haptic.tap();
                    setColor(k);
                  }}
                  style={{ height: 44, borderRadius: RADIUS.md, borderCurve: 'continuous', backgroundColor: kc.bg, borderWidth: 2.5, borderColor: selected ? PASTELS[k].strong : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: kc.ink }}>{PASTELS[k].name}</Text>
                </PressableScale>
              );
            }}
          />
        </View>

        {!isNew ? <Button kind="danger" icon="trash" title="Eliminar fecha" onPress={remove} /> : null}
      </ScrollView>
    </View>
  );
}
