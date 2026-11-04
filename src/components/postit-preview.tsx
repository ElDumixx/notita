import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop, SvgXml } from 'react-native-svg';

import { layoutPostit, resolveColors } from '@/lib/postit-art';
import { emptyMessage, widgetContent } from '@/lib/widget-data';
import { useStore } from '@/store';
import type { WidgetDesign } from '@/store/types';
import { fontStyle } from '@/theme/fonts';
import { alpha } from '@/theme/palette';

export const WIDGET_SIZES = {
  small: { w: 158, h: 158, label: 'Pequeño' },
  medium: { w: 338, h: 158, label: 'Mediano' },
  large: { w: 338, h: 354, label: 'Grande' },
} as const;

export type WidgetSize = keyof typeof WIDGET_SIZES;

type Props = {
  design: WidgetDesign;
  size?: WidgetSize;
  /** Escala visual (la geometría se calcula al tamaño real del widget). */
  scale?: number;
};

/** Vista previa fiel del widget: el mismo SVG que usa Android y la misma maqueta que iOS. */
export function PostitPreview({ design, size = 'small', scale = 1 }: Props) {
  const notebooks = useStore((s) => s.notebooks);
  const reminders = useStore((s) => s.reminders);
  const { w, h } = WIDGET_SIZES[size];

  const colors = useMemo(() => resolveColors(design, notebooks), [design, notebooks]);
  const L = useMemo(() => layoutPostit(w, h, design, colors, { boardRadius: 22 }), [w, h, design, colors]);
  const { title, items } = useMemo(() => widgetContent({ reminders, notebooks }, design), [reminders, notebooks, design]);

  const overflow = items.length > L.maxRows;
  const shown = items.slice(0, overflow ? L.maxRows - 1 : L.maxRows);
  const regular = fontStyle(design.font, 'regular');
  const bold = fontStyle(design.font, 'bold');
  const dot = Math.round(L.fontSize * 0.95);

  return (
    <View style={{ width: w * scale, height: h * scale }}>
      <View style={{ width: w, height: h, transform: [{ scale }], transformOrigin: 'top left' }}>
        {design.board === 'cristal' ? (
          <Svg width={w} height={h} style={{ position: 'absolute' }}>
            <Defs>
              <LinearGradient id="wall" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#B9B2F2" />
                <Stop offset="0.5" stopColor="#F4B6CC" />
                <Stop offset="1" stopColor="#A8DCC4" />
              </LinearGradient>
            </Defs>
            <Rect width={w} height={h} rx={22} fill="url(#wall)" />
          </Svg>
        ) : null}
        <SvgXml xml={L.svg} width={w} height={h} />
        <View style={{ position: 'absolute', left: L.content.x, top: L.content.y, width: L.content.w, height: L.content.h }}>
          {design.showHeader ? (
            <View style={{ height: L.headerHeight, flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text numberOfLines={1} style={[{ flex: 1, fontSize: L.headerSize, color: colors.text }, bold]}>
                {title}
              </Text>
              {items.length > 0 ? <Text style={[{ fontSize: L.fontSize * 0.85, color: alpha(colors.text, 0.55) }, regular]}>{items.length}</Text> : null}
            </View>
          ) : null}
          {items.length === 0 ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[{ fontSize: L.fontSize, color: alpha(colors.text, 0.7), textAlign: 'center' }, regular]}>{emptyMessage(design)}</Text>
            </View>
          ) : null}
          {shown.map((item) => (
            <View key={item.id} style={{ height: L.rowHeight, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: dot + 10 }}>
                <View style={{ width: dot, height: dot, borderRadius: dot / 2, borderWidth: 1.6, borderColor: alpha(colors.text, 0.7) }} />
              </View>
              <Text numberOfLines={1} style={[{ flex: 1, fontSize: L.fontSize, color: colors.text }, regular]}>
                {item.title}
              </Text>
              {item.when ? (
                <Text style={[{ marginLeft: 6, fontSize: L.fontSize * 0.8, color: item.overdue ? '#C2413A' : alpha(colors.text, 0.6) }, regular]}>{item.when}</Text>
              ) : null}
            </View>
          ))}
          {overflow ? (
            <Text style={[{ marginLeft: dot + 10, fontSize: L.fontSize * 0.85, color: alpha(colors.text, 0.55) }, regular]}>{`+${items.length - shown.length} más`}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
