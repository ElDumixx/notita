'use no memo';
// El widget de Android se construye llamando a estas funciones fuera de React: sin React Compiler.

import { FlexWidget, OverlapWidget, SvgWidget, TextWidget, type HexColor } from 'react-native-android-widget';

import { festiveArt } from '@/lib/festive-art';
import { anniversaryItems, EMPTY_ANNIVERSARIES } from '@/lib/special-widgets';
import type { State } from '@/store';
import { alpha } from '@/theme/palette';

const INK = '#4A2F45';
const hex = (c: string) => c as HexColor;
const OPEN = { clickAction: 'OPEN_URI', clickActionData: { uri: 'notita://calendario?modo=aniversarios' } } as const;

type Props = { state: Pick<State, 'anniversaries'>; width: number; height: number };

/** Widget de Android «Aniversarios»: globos, banderines y confeti con la cuenta atrás. */
export function AnniversaryWidget({ state, width, height }: Props) {
  const items = anniversaryItems(state);
  const first = items[0];
  const L = festiveArt(width, height, { radius: 24, party: first?.days === 0 });
  const rest = items.slice(1, L.size === 'large' ? 6 : 4);
  const pad = (r: { x: number; y: number; w: number; h: number }) => ({
    paddingLeft: r.x,
    paddingTop: r.y,
    paddingRight: Math.max(0, width - r.x - r.w),
    paddingBottom: Math.max(0, height - r.y - r.h),
  });

  return (
    <OverlapWidget style={{ height: 'match_parent', width: 'match_parent' }}>
      <SvgWidget svg={L.svg} style={{ height: 'match_parent', width: 'match_parent' }} {...OPEN} />
      <FlexWidget style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'column', justifyContent: 'flex-end', ...pad(L.hero) }}>
        {first ? (
          <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }} {...OPEN}>
            <TextWidget text={`${first.emoji} ${first.countdown}`} maxLines={1} truncate="END" style={{ fontSize: L.size === 'large' ? 28 : 24, fontWeight: '800', color: hex(INK) }} />
            <TextWidget text={first.name} maxLines={1} truncate="END" style={{ fontSize: 16, fontWeight: '700', color: hex(INK) }} />
            <TextWidget text={first.detail} maxLines={1} truncate="END" style={{ fontSize: 12, color: hex(alpha(INK, 0.7)) }} />
          </FlexWidget>
        ) : (
          <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }} {...OPEN}>
            <TextWidget text={EMPTY_ANNIVERSARIES.title} maxLines={2} truncate="END" style={{ fontSize: 16, fontWeight: '800', color: hex(INK) }} />
            <TextWidget text={EMPTY_ANNIVERSARIES.hint} maxLines={2} truncate="END" style={{ fontSize: 12, color: hex(alpha(INK, 0.7)) }} />
          </FlexWidget>
        )}
      </FlexWidget>
      {L.list ? (
        <FlexWidget style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'column', ...pad({ x: L.list.x + 12, y: L.list.y + 10, w: L.list.w - 24, h: L.list.h - 20 }) }}>
          <TextWidget text="PRÓXIMAS FECHAS" style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.05, color: hex(alpha(INK, 0.55)), marginBottom: 4 }} />
          {rest.length ? (
            rest.map((it) => (
              <FlexWidget key={it.id} style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent', height: 26 }} {...OPEN}>
                <TextWidget text={it.emoji} style={{ fontSize: 14, marginRight: 6 }} />
                <FlexWidget style={{ flex: 1 }}>
                  <TextWidget text={it.name} maxLines={1} truncate="END" style={{ fontSize: 13, fontWeight: '600', color: hex(INK) }} />
                </FlexWidget>
                <TextWidget text={it.short} style={{ fontSize: 12, color: hex(alpha(INK, 0.65)), marginLeft: 6 }} />
              </FlexWidget>
            ))
          ) : (
            <TextWidget text="Nada más a la vista 🎈" style={{ fontSize: 12, color: hex(alpha(INK, 0.6)) }} />
          )}
        </FlexWidget>
      ) : null}
    </OverlapWidget>
  );
}
