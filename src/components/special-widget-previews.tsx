import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { useNow } from '@/hooks/use-now';
import { festiveArt } from '@/lib/festive-art';
import { anniversaryItems, EMPTY_ANNIVERSARIES, EMPTY_IMPORTANT, importantItems } from '@/lib/special-widgets';
import { spikeArt } from '@/lib/spike-art';
import { useStore } from '@/store';
import { alpha } from '@/theme/palette';

import { WIDGET_SIZES, type WidgetSize } from './postit-preview';

const HAND = { fontFamily: 'Caveat-Bold' };
const FESTIVE_INK = '#4A2F45';

type Props = { size?: WidgetSize; scale?: number; /** Medidas propias (p. ej. la tarjeta del calendario). */ width?: number; height?: number };

function Frame({ w, h, scale, children }: { w: number; h: number; scale: number; children: React.ReactNode }) {
  return (
    <View style={{ width: w * scale, height: h * scale }}>
      <View style={{ width: w, height: h, transform: [{ scale }], transformOrigin: 'top left' }}>{children}</View>
    </View>
  );
}

/** Vista previa del widget de aniversarios: el mismo dibujo que el widget de Android y el de iOS. */
export function AnniversaryWidgetPreview({ size = 'small', scale = 1, width, height }: Props) {
  const anniversaries = useStore((s) => s.anniversaries);
  const now = useNow();
  const w = width ?? WIDGET_SIZES[size].w;
  const h = height ?? WIDGET_SIZES[size].h;
  const items = useMemo(() => anniversaryItems({ anniversaries }, now), [anniversaries, now]);
  const first = items[0];
  const L = useMemo(() => festiveArt(w, h, { party: first?.days === 0 }), [w, h, first?.days]);
  const big = L.size === 'large' ? 28 : 24;
  const rest = items.slice(1, L.size === 'large' ? 6 : 4);

  return (
    <Frame w={w} h={h} scale={scale}>
      <SvgXml xml={L.svg} width={w} height={h} />
      <View style={{ position: 'absolute', left: L.hero.x, top: L.hero.y, width: L.hero.w, height: L.hero.h, justifyContent: 'flex-end' }}>
        {first ? (
          <>
            <Text numberOfLines={1} style={{ fontSize: big, fontWeight: '800', color: FESTIVE_INK, letterSpacing: -0.4 }}>
              {first.emoji} {first.countdown}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '700', color: FESTIVE_INK, marginTop: 1 }}>
              {first.name}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '500', color: alpha(FESTIVE_INK, 0.7), marginTop: 1 }}>
              {first.detail}
            </Text>
          </>
        ) : (
          <>
            <Text numberOfLines={2} style={{ fontSize: 16, fontWeight: '800', color: FESTIVE_INK }}>
              {EMPTY_ANNIVERSARIES.title}
            </Text>
            <Text numberOfLines={2} style={{ fontSize: 12, color: alpha(FESTIVE_INK, 0.7), marginTop: 2 }}>
              {EMPTY_ANNIVERSARIES.hint}
            </Text>
          </>
        )}
      </View>
      {L.list ? (
        <View style={{ position: 'absolute', left: L.list.x + 12, top: L.list.y + 10, width: L.list.w - 24, height: L.list.h - 20, gap: 6 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: alpha(FESTIVE_INK, 0.55) }}>PRÓXIMAS FECHAS</Text>
          {rest.length ? (
            rest.map((it) => (
              <View key={it.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 22 }}>
                <Text style={{ fontSize: 14 }}>{it.emoji}</Text>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 13, fontWeight: '600', color: FESTIVE_INK }}>
                  {it.name}
                </Text>
                <Text style={{ fontSize: 12, color: alpha(FESTIVE_INK, 0.65) }}>{it.short}</Text>
              </View>
            ))
          ) : (
            <Text style={{ fontSize: 12, color: alpha(FESTIVE_INK, 0.6) }}>Nada más a la vista 🎈</Text>
          )}
        </View>
      ) : null}
    </Frame>
  );
}

/** Vista previa del widget «Importantes»: la torre de pósits clavados en la aguja. */
export function SpikeWidgetPreview({ size = 'small', scale = 1 }: Props) {
  const reminders = useStore((s) => s.reminders);
  const notebooks = useStore((s) => s.notebooks);
  const now = useNow();
  const { w, h } = WIDGET_SIZES[size];
  const items = useMemo(() => importantItems({ reminders, notebooks }, now), [reminders, notebooks, now]);
  const L = useMemo(() => spikeArt(w, h, items), [w, h, items]);
  const first = items[0];
  const titleSize = size === 'large' ? 28 : size === 'medium' ? 22 : 19;

  return (
    <Frame w={w} h={h} scale={scale}>
      <SvgXml xml={L.svg} width={w} height={h} />
      {L.empty ? (
        <View style={{ position: 'absolute', left: L.empty.x, top: L.empty.y, width: L.empty.w, height: L.empty.h, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[HAND, { fontSize: 21, textAlign: 'center', color: '#8A7F74', lineHeight: 22 }]}>{EMPTY_IMPORTANT}</Text>
        </View>
      ) : null}
      {first && L.front && L.check ? (
        <>
          {L.label ? (
            <Text numberOfLines={1} style={{ position: 'absolute', left: L.label.x, top: L.label.y, width: L.label.w, fontSize: 10, fontWeight: '700', color: alpha(first.ink, 0.6) }}>
              {L.label.w < 70 ? first.shortLabel : first.label}
            </Text>
          ) : null}
          <View style={{ position: 'absolute', left: L.front.x, top: L.front.y, width: L.front.w, height: L.front.h, overflow: 'hidden' }}>
            <Text numberOfLines={size === 'large' ? 7 : 2} style={[HAND, { fontSize: titleSize, lineHeight: titleSize * 1.02, color: first.ink }]}>
              {first.title}
            </Text>
          </View>
          <View style={{ position: 'absolute', left: L.check.x, top: L.check.y, height: L.check.h, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: L.check.w, height: L.check.h, borderRadius: L.check.w / 2, borderWidth: 1.8, borderColor: alpha(first.ink, 0.65) }} />
            {first.when ? <Text style={{ fontSize: 12, fontWeight: '600', color: first.overdue ? '#C2413A' : alpha(first.ink, 0.7) }}>{first.when}</Text> : null}
          </View>
        </>
      ) : null}
      {L.badge ? (
        <View style={{ position: 'absolute', left: L.badge.x, top: L.badge.y, height: 18, paddingHorizontal: 7, borderRadius: 9, backgroundColor: '#3E3934', justifyContent: 'center' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>+{items.length - 1}</Text>
        </View>
      ) : null}
    </Frame>
  );
}
