import { DateTimePicker } from '@/components/date-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { useNow } from '@/hooks/use-now';
import { SHEET_MAX_WIDTH } from '@/hooks/use-responsive';
import { useCardFill } from '@/components/glass';
import { GlassBackdrop } from '@/components/glass-backdrop';
import { SheetHeader } from '@/components/sheet-header';
import { Button, Chip, FieldLabel, Segmented, SWITCH_WEB } from '@/components/ui';
import {
  ALERT_OFFSETS,
  alertInstant,
  atTime,
  DATE_PRESETS,
  formatLongDate,
  formatMinutes,
  formatTime,
  minutesOfDay,
  presetDay,
  REPEAT_LABELS,
  startOfDay,
  TIME_PRESETS,
} from '@/lib/dates';
import { showAlert } from '@/lib/alert';
import { haptic } from '@/lib/haptics';
import { requestPermission, respectQuietHours, syncNotifications } from '@/lib/notifications';
import { useStore } from '@/store';
import type { AlertOffset, RepeatRule } from '@/store/types';
import { notebookColors, RADIUS, useTheme } from '@/theme';
import { ENTER, EXIT, LAYOUT } from '@/theme/motion';

const ALERT_KEYS: AlertOffset[] = ['none', 'atTime', 'm15', 'h1', 'd1'];
const REPEAT_KEYS: RepeatRule[] = ['none', 'daily', 'weekly', 'monthly', 'yearly'];

/** Día que llega desde el calendario (medianoche en ms), si es válido. */
function parseDay(date?: string) {
  const ts = Number(date);
  return date && Number.isFinite(ts) ? startOfDay(ts) : null;
}

export function ReminderEditor({ id, notebookId, date }: { id: string; notebookId?: string; date?: string }) {
  const theme = useTheme();
  const card = useCardFill();
  const isNew = id === 'new';
  const existing = useStore((s) => s.reminders.find((r) => r.id === id));
  const notebooks = useStore((s) => s.notebooks);
  const settings = useStore((s) => s.settings);
  const addReminder = useStore((s) => s.addReminder);
  const updateReminder = useStore((s) => s.updateReminder);
  const deleteReminders = useStore((s) => s.deleteReminders);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [nbId, setNbId] = useState(existing?.notebookId ?? notebookId ?? notebooks[0]?.id ?? '');
  const [day, setDay] = useState<number | null>(existing?.dueAt != null ? startOfDay(existing.dueAt) : isNew ? parseDay(date) : null);
  const [time, setTime] = useState<number | null>(existing?.dueAt != null && existing.hasTime ? minutesOfDay(existing.dueAt) : null);
  const [repeat, setRepeat] = useState<RepeatRule>(existing?.repeat ?? 'none');
  const [alert, setAlert] = useState<AlertOffset>(existing?.alert ?? settings.defaultAlert);
  const [important, setImportant] = useState(existing?.important ?? false);
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const now = useNow();

  if (!isNew && !existing) {
    return (
      <View style={{ flex: 1 }}>
        <SheetHeader title="Recordatorio" onCancel={() => router.back()} />
        <Text style={{ textAlign: 'center', marginTop: 40, color: theme.textSecondary }}>Este recordatorio ya no existe.</Text>
      </View>
    );
  }

  const dueAt = day == null ? null : time == null ? day : atTime(day, time);
  const presetActive = (k: (typeof DATE_PRESETS)[number]['key']) => day != null && presetDay(k) === day;
  const customDate = day != null && !DATE_PRESETS.some((p) => presetActive(p.key));

  // Explica cuándo llegará el aviso (transparencia: sin sorpresas).
  let alertHint = '';
  if (dueAt != null && alert !== 'none') {
    const raw = alertInstant(dueAt, time != null, alert)!;
    const at = respectQuietHours(raw, important, settings.quietHours);
    if (at !== raw) alertHint = `🌙 Por el silencio nocturno, el aviso llegará a las ${formatTime(at)}. Márcalo como importante para que suene a su hora.`;
    else if (time == null) alertHint = 'Sin hora concreta: el aviso llegará a las 9:00 de ese día.';
    else if (raw < now) alertHint = 'Esa hora ya ha pasado, así que no habrá aviso.';
  }

  const save = async () => {
    const clean = title.trim();
    if (!clean) return;
    const payload = {
      title: clean,
      notes: notes.trim(),
      notebookId: nbId,
      dueAt,
      hasTime: day != null && time != null,
      repeat: day == null ? ('none' as const) : repeat,
      alert: day == null ? ('none' as const) : alert,
      important,
    };
    if (isNew) addReminder(payload);
    else updateReminder(id, { ...payload, snoozeUntil: null });
    haptic.success();
    router.back();

    if (payload.alert !== 'none') {
      const ok = await requestPermission();
      if (ok) syncNotifications();
      else {
        showAlert('Notificaciones desactivadas', 'Para recibir avisos, permite las notificaciones de Notita en Ajustes.', [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
        ]);
      }
    }
  };

  const remove = () => {
    haptic.warning();
    router.back();
    setTimeout(() => deleteReminders([id]), 250);
  };

  return (
    <View style={{ flex: 1 }}>
      <GlassBackdrop radius={28} />
      <View collapsable={false}>
        <SheetHeader title={isNew ? 'Nuevo recordatorio' : 'Editar'} onCancel={() => router.back()} onSave={save} saveDisabled={!title.trim()} />
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48, gap: 22, width: '100%', maxWidth: SHEET_MAX_WIDTH, alignSelf: 'center' }}>
        <View style={{ backgroundColor: card, borderRadius: RADIUS.lg, borderCurve: 'continuous', paddingHorizontal: 16, paddingVertical: 6 }}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="¿Qué quieres recordar?"
            placeholderTextColor={theme.textTertiary}
            autoFocus={isNew}
            returnKeyType="done"
            onSubmitEditing={save}
            style={{ fontSize: 19, fontWeight: '600', color: theme.text, paddingVertical: 12 }}
          />
          <View style={{ height: 1, backgroundColor: theme.separator }} />
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notas"
            placeholderTextColor={theme.textTertiary}
            multiline
            style={{ fontSize: 15, color: theme.text, paddingVertical: 12, minHeight: 44, maxHeight: 120 }}
          />
        </View>

        <View>
          <FieldLabel>Libreta</FieldLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {notebooks.map((n) => {
              const c = notebookColors(n.color, theme);
              return <Chip key={n.id} label={`${n.emoji} ${n.name}`} selected={n.id === nbId} color={{ bg: c.bg, ink: c.ink }} onPress={() => setNbId(n.id)} />;
            })}
            <Chip label="＋ Nueva" onPress={() => router.push('/notebook/new')} />
          </ScrollView>
        </View>

        <Animated.View layout={LAYOUT}>
          <FieldLabel>Cuándo</FieldLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label="Sin fecha" selected={day == null} onPress={() => (setDay(null), setPicker(null))} />
            {DATE_PRESETS.map((p) => (
              <Chip key={p.key} label={p.label} selected={presetActive(p.key)} onPress={() => (setDay(presetDay(p.key)), setPicker(null))} />
            ))}
            <Chip
              label={customDate ? formatLongDate(day!).split(', ')[1] : 'Otra fecha'}
              selected={customDate || picker === 'date'}
              leading={<Icon name="calendar" size={14} color={customDate ? theme.tint : theme.textSecondary} />}
              onPress={() => setPicker(picker === 'date' ? null : 'date')}
            />
          </View>

          {picker === 'date' ? (
            <Animated.View entering={ENTER} exiting={EXIT} style={{ marginTop: 10, backgroundColor: card, borderRadius: RADIUS.lg, borderCurve: 'continuous', overflow: 'hidden' }}>
              <DateTimePicker
                value={new Date(day ?? now)}
                mode="date"
                display={process.env.EXPO_OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date(startOfDay(now))}
                accentColor={theme.tint}
                locale="es-ES"
                onChange={(e, d) => {
                  if (process.env.EXPO_OS === 'android') setPicker(null);
                  if (e.type === 'set' && d) setDay(startOfDay(d.getTime()));
                }}
              />
            </Animated.View>
          ) : null}

          {day != null ? (
            <Animated.View entering={ENTER} style={{ marginTop: 14, gap: 8 }}>
              <Text style={{ fontSize: 14, color: theme.textSecondary, marginLeft: 2 }}>{formatLongDate(day)}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Chip label="Todo el día" selected={time == null} onPress={() => (setTime(null), setPicker(null))} />
                {TIME_PRESETS.map((m) => (
                  <Chip key={m} label={formatMinutes(m)} selected={time === m} onPress={() => (setTime(m), setPicker(null))} />
                ))}
                <Chip
                  label={time != null && !TIME_PRESETS.includes(time) ? formatMinutes(time) : 'Otra hora'}
                  selected={(time != null && !TIME_PRESETS.includes(time)) || picker === 'time'}
                  leading={<Icon name="clock" size={14} color={theme.textSecondary} />}
                  onPress={() => setPicker(picker === 'time' ? null : 'time')}
                />
              </View>
              {picker === 'time' ? (
                <Animated.View entering={ENTER} style={{ alignItems: 'center' }}>
                  <DateTimePicker
                    value={new Date(atTime(day, time ?? 10 * 60))}
                    mode="time"
                    display={process.env.EXPO_OS === 'ios' ? 'spinner' : 'default'}
                    is24Hour
                    locale="es-ES"
                    onChange={(e, d) => {
                      if (process.env.EXPO_OS === 'android') setPicker(null);
                      if (e.type === 'set' && d) setTime(d.getHours() * 60 + d.getMinutes());
                    }}
                  />
                </Animated.View>
              ) : null}
            </Animated.View>
          ) : null}
        </Animated.View>

        {day != null ? (
          <Animated.View entering={ENTER} layout={LAYOUT} style={{ gap: 22 }}>
            <View>
              <FieldLabel>Repetir</FieldLabel>
              <Segmented options={REPEAT_KEYS.map((k) => ({ key: k, label: REPEAT_LABELS[k] }))} value={repeat} onChange={setRepeat} />
            </View>
            <View>
              <FieldLabel>Aviso</FieldLabel>
              <Segmented options={ALERT_KEYS.map((k) => ({ key: k, label: ALERT_OFFSETS[k].short }))} value={ALERT_KEYS.includes(alert) ? alert : 'atTime'} onChange={setAlert} />
              {alertHint ? <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 8, marginLeft: 2, lineHeight: 18 }}>{alertHint}</Text> : null}
            </View>
          </Animated.View>
        ) : null}

        <View style={{ backgroundColor: card, borderRadius: RADIUS.lg, borderCurve: 'continuous', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Icon name="starFill" size={18} color={important ? '#EFC94C' : theme.textTertiary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, color: theme.text }}>Importante</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>Siempre avisa, incluso en silencio nocturno</Text>
          </View>
          <Switch value={important} onValueChange={setImportant} trackColor={{ true: theme.tint }} {...SWITCH_WEB} />
        </View>

        {!isNew ? <Button kind="danger" icon="trash" title="Eliminar recordatorio" onPress={remove} /> : null}
      </ScrollView>
    </View>
  );
}
