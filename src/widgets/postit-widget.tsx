'use no memo';
// El widget de Android se construye llamando a estas funciones fuera de React: sin React Compiler.

import { FlexWidget, OverlapWidget, SvgWidget, TextWidget, type HexColor } from 'react-native-android-widget';

import { layoutPostit, resolveColors } from '@/lib/postit-art';
import { emptyMessage, widgetContent } from '@/lib/widget-data';
import type { State } from '@/store';
import type { WidgetDesign } from '@/store/types';
import { FONTS } from '@/theme/fonts';
import { alpha } from '@/theme/palette';

const hex = (c: string) => c as HexColor;

type Props = {
  design: WidgetDesign;
  state: Pick<State, 'reminders' | 'notebooks'>;
  width: number;
  height: number;
};

/** Widget de Android: el pósit (SVG) con el texto encima usando la fuente elegida. */
export function PostitWidget({ design, state, width, height }: Props) {
  const colors = resolveColors(design, state.notebooks);
  const L = layoutPostit(width, height, design, colors, { boardRadius: 24 });
  const { title, items } = widgetContent(state, design);
  const font = FONTS[design.font];
  const regular = font.regular ?? undefined;
  const bold = font.bold ?? undefined;
  const weight = font.regular ? undefined : ('600' as const);

  const overflow = items.length > L.maxRows;
  const shown = items.slice(0, overflow ? L.maxRows - 1 : L.maxRows);
  const dot = Math.round(L.fontSize * 0.95);

  return (
    <OverlapWidget style={{ height: 'match_parent', width: 'match_parent' }}>
      <SvgWidget svg={L.svg} style={{ height: 'match_parent', width: 'match_parent' }} clickAction="OPEN_APP" />
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          height: 'match_parent',
          width: 'match_parent',
          flexDirection: 'column',
          paddingLeft: L.content.x,
          paddingTop: L.content.y,
          paddingRight: Math.max(0, width - L.content.x - L.content.w),
          paddingBottom: Math.max(0, height - L.content.y - L.content.h),
        }}>
        {design.showHeader ? (
          <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', height: L.headerHeight }}>
            <FlexWidget style={{ flex: 1 }}>
              <TextWidget
                text={title}
                maxLines={1}
                truncate="END"
                style={{ fontSize: L.headerSize, fontFamily: bold, fontWeight: font.bold ? undefined : '700', color: hex(colors.text) }}
              />
            </FlexWidget>
            {items.length > 0 ? (
              <TextWidget text={String(items.length)} style={{ fontSize: L.fontSize * 0.85, fontFamily: regular, color: hex(alpha(colors.text, 0.55)) }} />
            ) : null}
          </FlexWidget>
        ) : null}

        {items.length === 0 ? (
          <FlexWidget style={{ flex: 1, width: 'match_parent', justifyContent: 'center', alignItems: 'center' }}>
            <TextWidget text={emptyMessage(design)} style={{ fontSize: L.fontSize, fontFamily: regular, fontWeight: weight, color: hex(alpha(colors.text, 0.7)) }} />
          </FlexWidget>
        ) : null}

        {shown.map((item) => (
          <FlexWidget
            key={item.id}
            clickAction="OPEN_URI"
            clickActionData={{ uri: `notita://reminder/${item.id}` }}
            style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', height: L.rowHeight }}>
            <FlexWidget
              clickAction="COMPLETE"
              clickActionData={{ id: item.id }}
              style={{ width: dot + 10, height: L.rowHeight, justifyContent: 'center' }}>
              <FlexWidget style={{ width: dot, height: dot, borderRadius: dot / 2, borderWidth: 1.6, borderColor: hex(alpha(colors.text, 0.7)) }} />
            </FlexWidget>
            <FlexWidget style={{ flex: 1 }}>
              <TextWidget text={item.title} maxLines={1} truncate="END" style={{ fontSize: L.fontSize, fontFamily: regular, fontWeight: weight, color: hex(colors.text) }} />
            </FlexWidget>
            {item.when ? (
              <TextWidget
                text={item.when}
                style={{ fontSize: L.fontSize * 0.8, fontFamily: regular, marginLeft: 6, color: hex(item.overdue ? '#C2413A' : alpha(colors.text, 0.6)) }}
              />
            ) : null}
          </FlexWidget>
        ))}

        {overflow ? (
          <TextWidget
            text={`+${items.length - shown.length} más`}
            style={{ fontSize: L.fontSize * 0.85, fontFamily: regular, marginLeft: dot + 10, color: hex(alpha(colors.text, 0.55)) }}
          />
        ) : null}
      </FlexWidget>
    </OverlapWidget>
  );
}