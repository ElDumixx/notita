import { Host, Slider } from '@expo/ui';
import { DateTimePicker } from '@/components/date-picker';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Group, Row, SectionTitle, Segmented, TEXT_INSET, SWITCH_WEB } from '@/components/ui';
import { ScreenTitle } from '@/components/screen-title';
import { useResponsive } from '@/hooks/use-responsive';
import { showAlert } from '@/lib/alert';
import { APP_ICONS, canChangeIcon, changeAppIcon } from '@/lib/app-icons';
import { atTime, formatMinutes, startOfDay } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { getPermission, notificationsSupported, requestPermission, syncNotifications, type PermissionState } from '@/lib/notifications';
import { useStore } from '@/store';
import type { AlertOffset, Settings } from '@/store/types';
import { useTheme } from '@/theme';
import { PASTELS } from '@/theme/palette';

/** Campo de hora: selector compacto nativo en iOS, diálogo en Android. */
function TimeField({ minutes, onChange }: { minutes: number; onChange: (m: number) => void }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [today] = useState(() => startOfDay(Date.now()));
  const value = new Date(atTime(today, minutes));
  const handle = (e: { type: string }, d?: Date) => {
    setOpen(false);
    if (e.type === 'set' && d) onChange(d.getHours() * 60 + d.getMinutes());
  };
  if (process.env.EXPO_OS === 'ios') {
    return <DateTimePicker value={value} mode="time" display="compact" is24Hour locale="es-ES" accentColor={theme.tint} onChange={handle} />;
  }
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={{ paddingHorizontal: 12, height: 34, borderRadius: 10, backgroundColor: theme.surfaceAlt, justifyContent: 'center' }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text, fontVariant: ['tabular-nums'] }}>{formatMinutes(minutes)}</Text>
      </Pressable>
      {open ? <DateTimePicker value={value} mode="time" is24Hour onChange={handle} /> : null}
    </>
  );
}

const DEFAULT_ALERTS: AlertOffset[] = ['none', 'atTime', 'm15', 'h1'];
const ALERT_LABELS: Record<string, string> = { none: 'Sin aviso', atTime: 'A la hora', m15: '15 min', h1: '1 h' };

export function SettingsScreen() {
  const theme = useTheme();
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const clearCompleted = useStore((s) => s.clearCompleted);
  const resetAll = useStore((s) => s.resetAll);
  const doneCount = useStore((s) => s.reminders.filter((r) => r.completedAt).length);
  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const layout = useResponsive();

  useFocusEffect(
    useCallback(() => {
      getPermission().then(setPermission);
    }, [])
  );

  const set = (patch: Partial<Settings>) => update(patch);
  const transparencyPct = Math.round(settings.glass.transparency * 100);
  const switchProps = { trackColor: { true: theme.tint }, ...SWITCH_WEB } as const;

  const askPermission = async () => {
    if (permission === 'denied') return Linking.openSettings();
    const ok = await requestPermission();
    setPermission(ok ? 'granted' : 'denied');
    if (ok) syncNotifications();
  };

  const pickIcon = async (key: Settings['appIcon']) => {
    if (key === settings.appIcon) return;
    haptic.tap();
    try {
      await changeAppIcon(key);
      set({ appIcon: key });
    } catch {
      showAlert('No se pudo cambiar el icono', 'Inténtalo de nuevo en unos segundos.');
    }
  };

  const notifications = !notificationsSupported ? (
    <View>
      <SectionTitle>Notificaciones</SectionTitle>
      <Group>
        <Row
          icon="bellOff"
          iconBg={PASTELS.lavanda.paper}
          iconColor={PASTELS.lavanda.ink}
          title="Avisos no disponibles en la web"
          subtitle="Safari no deja avisar con la app cerrada. Para recibir avisos y widgets, usa la app de iOS o Android."
          isLast
        />
      </Group>
    </View>
  ) : (
    <View>
      <SectionTitle>Notificaciones</SectionTitle>
      <Group>
        <Row
          icon="bell"
          iconBg={PASTELS.lavanda.paper}
          iconColor={PASTELS.lavanda.ink}
          title="Permitir avisos"
          subtitle={permission === 'granted' ? 'Activados' : permission === 'denied' ? 'Desactivados en el sistema' : 'Toca para activarlos'}
          onPress={permission === 'granted' ? undefined : askPermission}
          chevron={permission !== 'granted'}
        />
        <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>
          <Text style={{ fontSize: 15, color: theme.text }}>Aviso por defecto</Text>
          <Segmented options={DEFAULT_ALERTS.map((k) => ({ key: k, label: ALERT_LABELS[k] }))} value={DEFAULT_ALERTS.includes(settings.defaultAlert) ? settings.defaultAlert : 'atTime'} onChange={(defaultAlert) => set({ defaultAlert })} />
        </View>
        <View style={{ height: 1, backgroundColor: theme.separator, marginLeft: 14 }} />
        <Row
          icon="sparkles"
          iconBg={PASTELS.menta.paper}
          iconColor={PASTELS.menta.ink}
          title="Agrupar avisos cercanos"
          subtitle="Uno solo si coinciden en 10 minutos"
          right={<Switch value={settings.groupNearby} onValueChange={(groupNearby) => set({ groupNearby })} {...switchProps} />}
        />
        <Row
          icon="moon"
          iconBg={PASTELS.cielo.paper}
          iconColor={PASTELS.cielo.ink}
          title="Silencio nocturno"
          subtitle="Los avisos esperan a la mañana"
          right={<Switch value={settings.quietHours.enabled} onValueChange={(enabled) => set({ quietHours: { ...settings.quietHours, enabled } })} {...switchProps} />}
          isLast={!settings.quietHours.enabled}
        />
        {settings.quietHours.enabled ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 56, paddingRight: 14, paddingBottom: 12, gap: 10 }}>
            <Text style={{ fontSize: 15, color: theme.textSecondary }}>Desde</Text>
            <TimeField minutes={settings.quietHours.start} onChange={(start) => set({ quietHours: { ...settings.quietHours, start } })} />
            <Text style={{ fontSize: 15, color: theme.textSecondary }}>hasta</Text>
            <TimeField minutes={settings.quietHours.end} onChange={(end) => set({ quietHours: { ...settings.quietHours, end } })} />
          </View>
        ) : null}
        {settings.quietHours.enabled ? <View style={{ height: 1, backgroundColor: theme.separator, marginLeft: 56 }} /> : null}
        <Row
          icon="note"
          iconBg={PASTELS.limon.paper}
          iconColor={PASTELS.limon.ink}
          title="Resumen de la mañana"
          subtitle="Un aviso con lo del día (solo si hay algo)"
          right={<Switch value={settings.digest.enabled} onValueChange={(enabled) => set({ digest: { ...settings.digest, enabled } })} {...switchProps} />}
          isLast={!settings.digest.enabled}
        />
        {settings.digest.enabled ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 56, paddingRight: 14, paddingBottom: 12 }}>
            <Text style={{ fontSize: 15, color: theme.textSecondary }}>Hora del resumen</Text>
            <TimeField minutes={settings.digest.at} onChange={(at) => set({ digest: { ...settings.digest, at } })} />
          </View>
        ) : null}
      </Group>
      <Text style={{ fontSize: 13, color: theme.textTertiary, marginTop: 10, paddingHorizontal: TEXT_INSET, lineHeight: 18 }}>
        Notita no insiste: un único aviso por recordatorio, sin repeticiones. Desde el aviso puedes marcarlo como hecho o posponerlo 10 minutos.
      </Text>
    </View>
  );

  const appearance = (
    <View>
      <SectionTitle>Apariencia</SectionTitle>
      <Group contentStyle={{ padding: 14, gap: 16 }}>
        <View style={{ gap: 10 }}>
          <Text style={{ fontSize: 15, color: theme.text }}>Tema</Text>
          <Segmented
            options={[
              { key: 'system', label: 'Sistema' },
              { key: 'light', label: 'Claro' },
              { key: 'dark', label: 'Oscuro' },
            ]}
            value={settings.theme}
            onChange={(t) => set({ theme: t as Settings['theme'] })}
          />
        </View>
        {canChangeIcon ? (
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 15, color: theme.text }}>Icono de la app</Text>
            {[APP_ICONS.slice(0, 4), APP_ICONS.slice(4)].map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                {row.map((icon) => {
                  const selected = settings.appIcon === icon.key;
                  return (
                    <PressableScale key={icon.key} accessibilityRole="button" accessibilityLabel={`Icono ${icon.label}`} accessibilityState={{ selected }} onPress={() => pickIcon(icon.key)} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                      <View style={{ padding: 3, borderRadius: 20, borderCurve: 'continuous', borderWidth: 2.5, borderColor: selected ? theme.tint : 'transparent' }}>
                        <Image source={icon.image} style={{ width: 58, height: 58, borderRadius: 14, borderCurve: 'continuous' }} />
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: selected ? '700' : '500', color: selected ? theme.tint : theme.textSecondary }}>{icon.label}</Text>
                    </PressableScale>
                  );
                })}
              </View>
            ))}
            <Text style={{ fontSize: 12, color: theme.textTertiary, lineHeight: 17 }}>
              {process.env.EXPO_OS === 'ios'
                ? 'El icono Original se adapta solo a los modos Oscuro, Traslúcido y Tintado de iOS.'
                : 'Android puede cerrar la app un momento para aplicar el icono.'}
            </Text>
          </View>
        ) : null}
      </Group>
      <Group style={{ marginTop: 12 }}>
        <Row
          icon="sparkles"
          iconBg={PASTELS.lavanda.paper}
          iconColor={PASTELS.lavanda.ink}
          title="Estilo cristal"
          subtitle={process.env.EXPO_OS === 'ios' ? 'Liquid Glass del sistema' : 'Superficies translúcidas'}
          right={<Switch value={settings.glass.enabled} onValueChange={(enabled) => set({ glass: { ...settings.glass, enabled } })} {...switchProps} />}
          isLast={!settings.glass.enabled}
        />
        {settings.glass.enabled ? (
          <View style={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: 14, gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Text style={{ fontSize: 15, color: theme.text }}>Transparencia</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: theme.tint, fontVariant: ['tabular-nums'] }}>{transparencyPct} %</Text>
            </View>
            <Host matchContents={{ vertical: true }} seedColor={theme.tint} style={{ alignSelf: 'stretch' }}>
              <Slider
                value={transparencyPct}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => set({ glass: { ...settings.glass, transparency: Math.round(v) / 100 } })}
              />
            </Host>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: theme.textTertiary }}>Más opaco</Text>
              <Text style={{ fontSize: 12, color: theme.textTertiary }}>Más transparente</Text>
            </View>
          </View>
        ) : null}
      </Group>
      {/* Safari en el iPhone no vibra: en la web no tiene sentido el ajuste. */}
      {process.env.EXPO_OS !== 'web' ? (
        <Group style={{ marginTop: 12 }}>
          <Row title="Vibración al tocar" right={<Switch value={settings.haptics} onValueChange={(haptics) => set({ haptics })} {...switchProps} />} isLast />
        </Group>
      ) : null}
    </View>
  );

  const data = (
    <View>
      <SectionTitle>Datos</SectionTitle>
      <Group>
        <Row
          icon="checkCircle"
          iconBg={theme.dangerSoft}
          iconColor={theme.danger}
          title="Eliminar recordatorios hechos"
          subtitle={doneCount ? `${doneCount} en total · se puede deshacer` : 'No hay ninguno'}
          onPress={doneCount ? () => clearCompleted() : undefined}
        />
        <Row
          icon="trash"
          iconBg={theme.dangerSoft}
          iconColor={theme.danger}
          title="Empezar de cero"
          destructive
          isLast
          onPress={() =>
            showAlert('¿Borrar todo?', 'Se eliminarán todas las libretas, recordatorios y diseños.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Borrar todo', style: 'destructive', onPress: () => resetAll() },
            ])
          }
        />
      </Group>
    </View>
  );

  const about = (
    <View style={{ alignItems: 'center', gap: 6, paddingTop: 4 }}>
      <Image source={APP_ICONS[0].image} style={{ width: 44, height: 44, borderRadius: 11, borderCurve: 'continuous' }} />
      <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textSecondary }}>Notita {Constants.expoConfig?.version ?? ''}</Text>
      <Text style={{ fontSize: 12, color: theme.textTertiary, textAlign: 'center', lineHeight: 17, maxWidth: 300 }}>
        Fuentes libres: Comic Neue, Caveat, Nunito, Lora y Courier Prime (OFL) · Permanent Marker (Apache 2.0)
      </Text>
    </View>
  );

  return (
    <ScrollView
      onLayout={layout.onLayout}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingHorizontal: layout.pad, paddingTop: 4, paddingBottom: 120 }}>
      <ScreenTitle title="Ajustes" spacing={12} />
      {layout.size === 'expanded' ? (
        // Tablet grande: dos columnas en lugar de una lista larga y estrecha.
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 24 }}>
          <View style={{ flex: 1, gap: 26 }}>
            {notifications}
            {data}
          </View>
          <View style={{ flex: 1, gap: 26 }}>
            {appearance}
            {about}
          </View>
        </View>
      ) : (
        <View style={{ gap: 26 }}>
          {notifications}
          {appearance}
          {data}
          {about}
        </View>
      )}
    </ScrollView>
  );
}
