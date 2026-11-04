'use no memo';
// El widget de Android se construye llamando a estas funciones fuera de React: sin React Compiler.

import { FlexWidget, OverlapWidget, SvgWidget, TextWidget, type HexColor } from 'react-native-android-widget';

import { EMPTY_IMPORTANT, importantItems } from '@/lib/special-widgets';
import { spikeArt } from '@/lib/spike-art';
import type { State } from '@/store';
import { alpha } from '@/theme/palette';

const hex = (c: string) => c as HexColor;

type Props = { state: Pick<State, 'reminders' | 'notebooks'>; width: number; height: number };

/**
 * Widget de Android «Importantes»: pósits clavados en una aguja. Al tocar el círculo, el de
 * delante se marca como hecho, sale de la aguja y aparece el siguiente.
 */
export function SpikeWidget({ state, width, height }: Props) {
  const items = importantItems(state);
  const L = spikeArt(width, height, items, { radius: 24 });
  const first = items[0];
  const wide = width > height * 1.5;
  const large = !wide && width > 250 && height > 250;
  const titleSize = large ? 28 : wide ? 22 : 19;
  const pad = (r: { x: number; y: number; w: number; h: number }) => ({
    paddingLeft: r.x,
    paddingTop: r.y,
    paddingRight: Math.max(0, width - r.x - r.w),
    paddingBottom: Math.max(0, height - r.y - r.h),
  });

  return (
    <OverlapWidget style={{ height: 'match_parent', width: 'match_parent' }}>
      <SvgWidget svg={L.svg} style={{ height: 'match_parent', width: 'match_parent' }} clickAction="OPEN_URI" clickActionData={{ uri: 'notita://libretas/importantes' }} />

      {L.empty ? (
        <FlexWidget style={{ height: 'match_parent', width: 'match_parent', justifyContent: 'center', alignItems: 'center', ...pad(L.empty) }}>
          <TextWidget text={EMPTY_IMPORTANT} style={{ fontSize: 21, fontFamily: 'Caveat-Bold', color: hex('#8A7F74'), textAlign: 'center' }} />
        </FlexWidget>
      ) : null}

      {first && L.label ? (
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
              maxLines={large ? 7 : 2}
              truncate="END"
              style={{ fontSize: titleSize, fontFamily: 'Caveat-Bold', color: hex(first.ink), lineHeight: titleSize * 1.02 }}
            />
          </FlexWidget>
        </FlexWidget>
      ) : null}

      {first && L.check ? (
        <FlexWidget style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'row', alignItems: 'flex-start', ...pad({ ...L.check, w: width - L.check.x - 40 }) }}>
          <FlexWidget clickAction="COMPLETE" clickActionData={{ id: first.id }} style={{ width: L.check.w + 8, height: L.check.h, justifyContent: 'center' }}>
            <FlexWidget style={{ width: L.check.w, height: L.check.h, borderRadius: L.check.w / 2, borderWidth: 1.8, borderColor: hex(alpha(first.ink, 0.65)) }} />
          </FlexWidget>
          {first.when ? (
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
