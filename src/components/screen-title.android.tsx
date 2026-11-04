import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

import { useRegisterScreenHeader } from './screen-header';
import { TOP_BAR } from './top-bar';
import { TEXT_INSET } from './ui';

type Props = { title: string; large?: boolean; back?: boolean; /** Espacio extra bajo el título (pantallas sin separación propia). */ spacing?: number };

/**
 * Android: título grande como el de iOS, al principio del scroll. El título pequeño, el botón de
 * volver y el "+" van en la barra de arriba (top-bar.tsx), que se queda fija.
 */
export function ScreenTitle({ title, large = true, back = false, spacing = 0 }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  useRegisterScreenHeader(title, back, large);
  return (
    <View>
      <View style={{ height: insets.top + TOP_BAR - 4 }} />
      {large ? (
        <View style={{ paddingHorizontal: TEXT_INSET, paddingBottom: 4 + spacing }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ fontSize: 34, lineHeight: 41, fontWeight: '700', color: theme.text }}>
            {title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
