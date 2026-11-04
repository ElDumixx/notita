import { router } from 'expo-router';
import { View } from 'react-native';

import { AnniversaryRow } from '@/components/anniversary-row';
import { EmptyState } from '@/components/empty-state';
import { PressableScale } from '@/components/pressable-scale';
import { AnniversaryWidgetPreview } from '@/components/special-widget-previews';
import { Button, Group, SectionTitle } from '@/components/ui';
import { useNow } from '@/hooks/use-now';
import { upcoming } from '@/lib/anniversaries';
import { formatMonthYear, startOfMonth } from '@/lib/dates';
import { useStore } from '@/store';

/** Cumpleaños y aniversarios: la próxima celebración en grande y el resto mes a mes. */
export function AnniversariesView({ width }: { width: number }) {
  const now = useNow();
  const anniversaries = useStore((s) => s.anniversaries);
  const list = upcoming(anniversaries, now);

  if (!list.length) {
    return (
      <View style={{ gap: 16 }}>
        <EmptyState title="Sin fechas especiales" message="Añade cumpleaños y aniversarios: te avisaremos antes para que no se te pase ninguno." />
        <Button icon="add" title="Añadir un cumpleaños" onPress={() => router.push('/anniversary/new')} />
      </View>
    );
  }

  const months = new Map<number, typeof list>();
  for (const item of list) {
    const m = startOfMonth(item.date);
    months.set(m, [...(months.get(m) ?? []), item]);
  }

  // La tarjeta de arriba es el widget mediano a lo ancho (mismo dibujo que en la pantalla de inicio).
  const heroWidth = Math.min(width, 560);
  const heroHeight = Math.round(Math.max(158, Math.min(190, heroWidth * 0.46)));

  return (
    <View style={{ gap: 18 }}>
      <PressableScale accessibilityRole="button" accessibilityLabel="Editar la próxima fecha" onPress={() => router.push(`/anniversary/${list[0].a.id}`)} style={{ alignSelf: 'flex-start' }}>
        <AnniversaryWidgetPreview width={heroWidth} height={heroHeight} />
      </PressableScale>
      {[...months].map(([m, items]) => (
        <View key={m}>
          <SectionTitle>{formatMonthYear(m)}</SectionTitle>
          <Group>
            {items.map(({ a, date }, i) => (
              <AnniversaryRow key={a.id} anniversary={a} date={date} isLast={i === items.length - 1} />
            ))}
          </Group>
        </View>
      ))}
    </View>
  );
}
