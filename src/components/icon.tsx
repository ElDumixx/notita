import { SymbolView, type SymbolWeight } from 'expo-symbols';
import type { ColorValue } from 'react-native';

/** Iconos nativos: SF Symbols en iOS y Material Symbols en Android. */
const ICONS = {
  add: { ios: 'plus', android: 'add' },
  trash: { ios: 'trash', android: 'delete' },
  bell: { ios: 'bell', android: 'notifications' },
  bellOff: { ios: 'bell.slash', android: 'notifications_off' },
  repeat: { ios: 'repeat', android: 'repeat' },
  star: { ios: 'star', android: 'star' },
  starFill: { ios: 'star.fill', android: 'star' },
  calendar: { ios: 'calendar', android: 'calendar_today' },
  clock: { ios: 'clock', android: 'schedule' },
  check: { ios: 'checkmark', android: 'check' },
  chevron: { ios: 'chevron.right', android: 'chevron_right' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left' },
  agenda: { ios: 'list.bullet.below.rectangle', android: 'view_agenda' },
  more: { ios: 'ellipsis', android: 'more_horiz' },
  edit: { ios: 'pencil', android: 'edit' },
  close: { ios: 'xmark', android: 'close' },
  moon: { ios: 'moon', android: 'dark_mode' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  tray: { ios: 'tray.full', android: 'inbox' },
  checkCircle: { ios: 'checkmark.circle', android: 'task_alt' },
  note: { ios: 'note.text', android: 'sticky_note_2' },
  undo: { ios: 'arrow.uturn.backward', android: 'undo' },
  snooze: { ios: 'clock.arrow.circlepath', android: 'snooze' },
  info: { ios: 'info.circle', android: 'info' },
  sun: { ios: 'sun.max', android: 'wb_sunny' },
  calendarMonth: { ios: 'calendar', android: 'calendar_month' },
  book: { ios: 'book.closed', android: 'menu_book' },
  gear: { ios: 'gearshape', android: 'settings' },
  gift: { ios: 'gift', android: 'redeem' },
} as const;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  color: ColorValue;
  weight?: SymbolWeight;
};

// Los chevrons de Material Symbols traen más margen interno que los de SF Symbols: se igualan.
const ANDROID_SCALE: Partial<Record<IconName, number>> = { chevron: 1.6, chevronLeft: 1.6 };

export function Icon({ name, size = 20, color, weight = 'medium' }: Props) {
  const s = process.env.EXPO_OS !== 'ios' ? Math.round(size * (ANDROID_SCALE[name] ?? 1)) : size;
  // En la web se usan los mismos Material Symbols que en Android (los SF Symbols solo existen en Apple).
  const icon = ICONS[name];
  return <SymbolView name={{ ...icon, web: icon.android }} size={s} tintColor={color} weight={weight} style={{ width: s, height: s }} />;
}
