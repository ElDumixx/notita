import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme';

import { Glass, useGlassActive } from './glass';
import { Icon } from './icon';

type Props = {
  title: string;
  onCancel: () => void;
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
};

/**
 * Cabecera de las hojas: con el estilo cristal, botones circulares de cristal (✕ / ✓) como las hojas
 * de iOS 26; sin él, botones de texto. Siempre simétrica: título centrado entre dos botones iguales.
 */
export function SheetHeader({ title, onCancel, onSave, saveDisabled, saveLabel = 'Guardar' }: Props) {
  const theme = useTheme();
  const glass = useGlassActive();

  if (glass) {
    const circle = { width: 44, height: 44, borderRadius: 22, alignItems: 'center' as const, justifyContent: 'center' as const };
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Glass interactive radius={22} style={circle}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancelar" onPress={onCancel} hitSlop={6} style={circle}>
            <Icon name="close" size={18} color={theme.text} weight="semibold" />
          </Pressable>
        </Glass>
        <Text numberOfLines={1} style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: theme.text }}>
          {title}
        </Text>
        {onSave ? (
          <Glass interactive strong radius={22} tint={saveDisabled ? undefined : theme.tint} style={circle}>
            <Pressable accessibilityRole="button" accessibilityLabel={saveLabel} disabled={saveDisabled} onPress={onSave} hitSlop={6} style={circle}>
              <Icon name="check" size={19} color={saveDisabled ? theme.textTertiary : '#FFFFFF'} weight="bold" />
            </Pressable>
          </Glass>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 12, paddingBottom: 6 }}>
      <Pressable accessibilityRole="button" onPress={onCancel} style={{ width: 96, height: 44, justifyContent: 'center', paddingHorizontal: 10 }}>
        <Text style={{ fontSize: 16, color: theme.textSecondary }}>Cancelar</Text>
      </Pressable>
      <Text numberOfLines={1} style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: theme.text }}>
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={!onSave || saveDisabled}
        onPress={onSave}
        style={{ width: 96, height: 44, justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 10 }}>
        {onSave ? <Text style={{ fontSize: 16, fontWeight: '700', color: saveDisabled ? theme.textTertiary : theme.tint }}>{saveLabel}</Text> : null}
      </Pressable>
    </View>
  );
}
