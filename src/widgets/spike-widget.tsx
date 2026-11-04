'use no memo';
// El widget de Android se construye llamando a estas funciones fuera de React: sin React Compiler.

import { FlexWidget, OverlapWidget, SvgWidget, TextWidget, type HexColor } from 'react-native-android-widget';

import { importantItems } from '@/lib/special-widgets';
import { spikeArt, spikeTitleLines, spikeTitleSize } from '@/lib/spike-art';
import type { State } from '@/store';
import type { WidgetDesign } from '@/store/types';
import { FONTS } from '@/theme/fonts';
import { alpha } from '@/theme/palette';

const hex = (c: string) => c as HexColor;

type Props = { design: WidgetDesign; state: Pick<State, 'reminders' | 'notebooks'>; width: number; height: number };

/**
 * Widget de Android «Importantes»: pósits clavados en una aguja, con el diseño elegido. Al tocar
 * el círculo, el de delante se marca como hecho, sale de la aguja y aparece el siguiente. Sin
 * importantes queda solo la aguja.
 */
export function SpikeWidget({ design, state, width, height }: Props) {
  const items = importantItems(state, design);
  const font = FONTS[design.font];
  const titleSize = spikeTitleSize(width, height, font.scale);
  const L = spikeArt(width, height, items, design, { radius: 24, titleSize });
  const first = items[0];
  const pad = (r: { x: number; y: number; w: number; h: number }) => ({
    paddingLeft: r.x,
    paddingTop: r.y,
    paddingRight: Math.max(0, width - r.x - r.w),
    paddingBottom: Math.max(0, height - r.y - r.h),
  });

  return (
    <OverlapWidget style={{ height: 'match_parent', width: 'match_parent' }}>
      <SvgWidget svg={L.svg} style={{ height: 'match_parent', width: 'match_parent' }} clickAction="OPEN_URI" clickActionData={{ uri: 'notita://libretas/importantes' }} />

      {first && L.label && design.showHeader ? (
        <FlexWidget style={{ height: 'match_parent', width: 'match_parent', ...pad(L.label) }}>
          <TextWidget text={L.label.w < 70 ? first.shortLabel : first.label} maxLines={1} truncate="END" style={{ fontSize: 10, fontWeight: '700', color: hex(alpha(first.ink, 0.6)) }} />
        </FlexWidget>
      ) : null}

      {first && L.front ? (
        <FlexWidget style={{ height: 'match_parent', width: 'match_parent', ...pad(L.front) }}>
          <FlexWidget
            clickAction="OPEN_URI"
            clickActionData={{ uri: `notita://reminder/${first.id}` }}
            style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'column' }}>
            <TextWidget
              text={first.title}
              maxLines={spikeTitleLines(width, height, L.front.h, titleSize)}
              truncate="END"
              style={{ fontSize: titleSize, fontFamily: font.bold ?? undefined, fontWeight: font.bold ? undefined : '700', color: hex(first.ink), lineHeight: Math.round(titleSize * 1.06) }}
            />
          </FlexWidget>
        </FlexWidget>
      ) : null}

      {first && L.check ? (
        <FlexWidget style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'row', alignItems: 'flex-start', ...pad({ ...L.check, w: width - L.check.x - 40 }) }}>
          <FlexWidget clickAction="COMPLETE" clickActionData={{ id: first.id }} style={{ width: L.check.w + 8, height: L.check.h, justifyContent: 'center' }}>
            <FlexWidget style={{ width: L.check.w, height: L.check.h, borderRadius: L.check.w / 2, borderWidth: 1.8, borderColor: hex(alpha(first.ink, 0.65)) }} />
          </FlexWidget>
          {design.showTime && first.when ? (
            <FlexWidget style={{ height: L.check.h, justifyContent: 'center' }}>
              <TextWidget text={first.when} style={{ fontSize: 12, fontWeight: '600', color: hex(first.overdue ? '#C2413A' : alpha(first.ink, 0.7)) }} />
            </FlexWidget>
          ) : null}
        </FlexWidget>
      ) : null}

      {L.badge ? (
        <FlexWidget style={{ height: 'match_parent', width: 'match_parent', paddingLeft: L.badge.x, paddingTop: L.badge.y }}>
          <FlexWidget style={{ height: 18, paddingLeft: 7, paddingRight: 7, borderRadius: 9, backgroundColor: hex('#3E3934'), justifyContent: 'center' }}>
            <TextWidget text={`+${items.length - 1}`} style={{ fontSize: 11, fontWeight: '700', color: hex('#FFFFFF') }} />
          </FlexWidget>
        </FlexWidget>
      ) : null}
    </OverlapWidget>
  );
}
