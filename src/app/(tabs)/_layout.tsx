import { NativeTabs } from 'expo-router/native-tabs';
import { View } from 'react-native';

import { FloatingTabs, type TabDef } from '@/components/floating-tabs';
import { GlassBackdrop } from '@/components/glass-backdrop';
import { useTheme } from '@/theme';

const TABS = [
  { name: '(hoy)', label: 'Hoy', sf: { default: 'sun.max', selected: 'sun.max.fill' } },
  { name: 'calendario', label: 'Calendario', sf: { default: 'calendar', selected: 'calendar' } },
  { name: 'libretas', label: 'Libretas', sf: { default: 'book.closed', selected: 'book.closed.fill' } },
  { name: 'widgets', label: 'Widgets', sf: { default: 'note.text', selected: 'note.text' } },
  { name: 'ajustes', label: 'Ajustes', sf: { default: 'gearshape', selected: 'gearshape.fill' } },
] as const;

/** Android y web: las mismas pestañas con la barra flotante de cristal. */
const FLOATING: TabDef[] = [
  { name: '(hoy)', href: '/', label: 'Hoy', icon: 'sun' },
  { name: 'calendario', href: '/calendario', label: 'Calendario', icon: 'calendarMonth' },
  { name: 'libretas', href: '/libretas', label: 'Libretas', icon: 'book' },
  { name: 'widgets', href: '/widgets', label: 'Widgets', icon: 'note' },
  { name: 'ajustes', href: '/ajustes', label: 'Ajustes', icon: 'gear' },
];

export default function TabsLayout() {
  const theme = useTheme();
  if (process.env.EXPO_OS === 'ios') return <IosTabs />;
  // El fondo pastel va detrás de todo y se ve (desenfocado en Android) a través de las barras.
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <FloatingTabs tabs={FLOATING} backdrop={<GlassBackdrop />} />
    </View>
  );
}

function IosTabs() {
  const theme = useTheme();
  return (
    // iPad: la barra de pestañas puede convertirse en barra lateral.
    <NativeTabs tintColor={theme.tint} labelVisibilityMode="labeled" sidebarAdaptable>
      {TABS.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Icon sf={t.sf} />
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
