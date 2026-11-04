import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { useNow } from '@/hooks/use-now';
import { festiveArt } from '@/lib/festive-art';
import { anniversaryItems, EMPTY_ANNIVERSARIES, importantItems, type ImportantItem } from '@/lib/special-widgets';
import { spikeArt, spikeTitleLines, spikeTitleSize } from '@/lib/spike-art';
import { useStore } from '@/store';
import type { WidgetDesign } from '@/store/types';
import { FONTS, fontStyle } from '@/theme/fonts';
import { alpha, INKS, paperFor, type PastelKey } from '@/theme/palette';

import { WIDGET_SIZES, type WidgetSize } from './postit-preview';

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

const SAMPLE: { title: string; label: string; color: PastelKey; when: string }[] = [
  { title: 'Llamar al médico', label: '★ Personal', color: 'limon', when: 'mañ. 10:00' },
  { title: 'Entregar el informe', label: '★ Trabajo', color: 'cielo', when: 'vie' },
  { title: 'Comprar el regalo', label: '★ Compras', color: 'menta', when: 'sáb' },
  { title: 'Pedir cita', label: '★ Salud', color: 'rosa', when: '' },
];

/** Pósits de ejemplo para ver el diseño cuando todavía no hay importantes. */
export function sampleItems(design: Pick<WidgetDesign, 'color' | 'ink'>): ImportantItem[] {
  return SAMPLE.map((x, i) => {
    const p = paperFor(design.color === 'auto' ? x.color : design.color);
    return { id: `muestra-${i}`, title: x.title, label: x.label, shortLabel: x.label.slice(0, 1), when: x.when, overdue: false, paper: p.paper, fold: p.fold, line: p.line, strong: p.strong, ink: INKS[design.ink].color ?? p.ink };
  });
}

/**
 * Vista previa del widget «Importantes» con un diseño: la torre de pósits clavados en la aguja.
 * Con `sample`, si no hay importantes se ven pósits de ejemplo (para elegir el diseño).
 */
export function SpikeWidgetPreview({ design, size = 'small', scale = 1, sample = false }: Props & { design: WidgetDesign; sample?: boolean }) {
  const reminders = useStore((s) => s.reminders);
  const notebooks = useStore((s) => s.notebooks);
  const now = useNow();
  const { w, h } = WIDGET_SIZES[size];
  const items = useMemo(() => {
    const real = importantItems({ reminders, notebooks }, design, now);
    return real.length || !sample ? real : sampleItems(design);
  }, [reminders, notebooks, design, now, sample]);
  const titleSize = spikeTitleSize(w, h, FONTS[design.font].scale);
  const L = useMemo(() => spikeArt(w, h, items, design, { titleSize }), [w, h, items, design, titleSize]);
  const first = items[0];

  return (
    <Frame w={w} h={h} scale={scale}>
      <SvgXml xml={L.svg} width={w} height={h} />
      {first && L.front && L.check ? (
        <>
          {L.label && design.showHeader ? (
            <Text numberOfLines={1} style={{ position: 'absolute', left: L.label.x, top: L.label.y, width: L.label.w, fontSize: 10, fontWeight: '700', color: alpha(first.ink, 0.6) }}>
              {L.label.w < 70 ? first.shortLabel : first.label}
            </Text>
          ) : null}
          <View style={{ position: 'absolute', left: L.front.x, top: L.front.y, width: L.front.w, height: L.front.h, overflow: 'hidden' }}>
            <Text numberOfLines={spikeTitleLines(w, h, L.front.h, titleSize)} style={[fontStyle(design.font, 'bold'), { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.06), color: first.ink }]}>
              {first.title}
            </Text>
          </View>
          <View style={{ position: 'absolute', left: L.check.x, top: L.check.y, height: L.check.h, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: L.check.w, height: L.check.h, borderRadius: L.check.w / 2, borderWidth: 1.8, borderColor: alpha(first.ink, 0.65) }} />
            {design.showTime && first.when ? <Text style={{ fontSize: 12, fontWeight: '600', color: first.overdue ? '#C2413A' : alpha(first.ink, 0.7) }}>{first.when}</Text> : null}
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
