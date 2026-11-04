import { getAppIconName, setAlternateAppIcon, supportsAlternateIcons } from 'expo-alternate-app-icons';

import type { AppIconKey } from '@/store/types';

export const APP_ICONS: { key: AppIconKey; label: string; image: number }[] = [
  { key: 'original', label: 'Original', image: require('@/assets/icons/ios/original.png') },
  { key: 'oscuro', label: 'Oscuro', image: require('@/assets/icons/ios/oscuro.png') },
  { key: 'cristal', label: 'Cristal', image: require('@/assets/icons/ios/cristal.png') },
  { key: 'minimal', label: 'Minimal', image: require('@/assets/icons/ios/minimal.png') },
  { key: 'rosa', label: 'Rosa', image: require('@/assets/icons/ios/rosa.png') },
  { key: 'menta', label: 'Menta', image: require('@/assets/icons/ios/menta.png') },
  { key: 'lavanda', label: 'Lavanda', image: require('@/assets/icons/ios/lavanda.png') },
  { key: 'cielo', label: 'Cielo', image: require('@/assets/icons/ios/cielo.png') },
];

const nativeName = (key: AppIconKey) => key.charAt(0).toUpperCase() + key.slice(1);

export const canChangeIcon = supportsAlternateIcons;

export function currentAppIcon(): AppIconKey {
  if (!supportsAlternateIcons) return 'original';
  const name = getAppIconName();
  return (APP_ICONS.find((i) => nativeName(i.key) === name)?.key ?? 'original') as AppIconKey;
}

export async function changeAppIcon(key: AppIconKey) {
  await setAlternateAppIcon(key === 'original' ? null : nativeName(key));
}
