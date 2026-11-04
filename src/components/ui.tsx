/** Piezas pequeñas y reutilizables de la interfaz (secciones, grupos, chips, botones). */
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { READABLE_WIDTH } from '@/hooks/use-responsive';
import { haptic } from '@/lib/haptics';
import { RADIUS, useTheme } from '@/theme';
import { ANDROID, DURATION, EASE_MOVE, LAYOUT, MOVE_SPRING } from '@/theme/motion';

import { Glass } from './glass';
import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';

/** En la web el interruptor trae un pulgar verde azulado: se deja blanco, como en iOS. */
export const SWITCH_WEB = (process.env.EXPO_OS === 'web' ? { activeThumbColor: '#FFFFFF', thumbColor: '#FFFFFF' } : {}) as object;

/** Sangría de los textos sueltos (títulos de sección, notas): la misma en todas las pantallas. */
export const TEXT_INSET = 4;

/** Columna centrada con ancho máximo: en tablets el contenido no se estira de lado a lado. */
export function Column({ children, maxWidth = READABLE_WIDTH, gap, style }: { children: ReactNode; maxWidth?: number; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ width: '100%', maxWidth, alignSelf: 'center', gap }, style]}>{children}</View>;
}

export function SectionTitle({ children, tone, right }: { children: ReactNode; tone?: 'danger'; right?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: TEXT_INSET, marginBottom: 8, marginTop: 4 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase', color: tone === 'danger' ? theme.danger : theme.textSecondary }}>
        {children}
      </Text>
      {right}
    </View>
  );
}

/** Contenedor redondeado (lista agrupada) sobre cristal. */
export function Group({ children, style, contentStyle }: { children: ReactNode; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View layout={LAYOUT} style={style}>
      <Glass radius={RADIUS.lg}>
        {/* El recorte va dentro del cristal (nunca en él ni en sus padres). */}
        <View style={[{ borderRadius: RADIUS.lg, borderCurve: 'continuous', overflow: 'hidden' }, contentStyle]}>{children}</View>
      </Glass>
    </Animated.View>
  );
}

type RowProps = {
  icon?: IconName;
  iconBg?: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  leading?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  isLast?: boolean;
  chevron?: boolean;
};

/** Fila de ajustes con icono en cuadradito pastel, al estilo de iOS. */
export function Row({ icon, iconBg, iconColor, title, subtitle, value, leading, right, onPress, destructive, isLast, chevron }: RowProps) {
  const theme = useTheme();
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: subtitle ? 10 : 12, minHeight: 50 }}>
      {icon ? (
        <View style={{ width: 30, height: 30, borderRadius: 8, borderCurve: 'continuous', backgroundColor: iconBg ?? theme.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={17} color={iconColor ?? theme.tint} />
        </View>
      ) : null}
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, color: destructive ? theme.danger : theme.text }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 13, color: theme.textSecondary }}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={{ fontSize: 15, color: theme.textSecondary }}>{value}</Text> : null}
      {right}
      {chevron ? <Icon name="chevron" size={14} color={theme.textTertiary} weight="semibold" /> : null}
    </View>
  );
  return (
    <View>
      {onPress ? (
        <Pressable
          onPress={onPress}
          android_ripple={{ color: theme.separator }}
          style={({ pressed }) => ({ backgroundColor: pressed && process.env.EXPO_OS === 'ios' ? theme.surfaceAlt : 'transparent' })}>
          {inner}
        </Pressable>
      ) : (
        inner
      )}
      {!isLast ? <View style={{ height: 1, backgroundColor: theme.separator, marginLeft: icon || leading ? 56 : 14 }} /> : null}
    </View>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  color?: { bg: string; ink: string };
  leading?: ReactNode;
  flex?: boolean;
};

/** Pastilla seleccionable. */
export function Chip({ label, selected, onPress, color, leading, flex }: ChipProps) {
  const theme = useTheme();
  const bg = selected ? (color?.bg ?? theme.tintSoft) : theme.surfaceAlt;
  const ink = selected ? (color?.ink ?? theme.tint) : theme.textSecondary;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={{
        flex: flex ? 1 : undefined,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 14,
        height: 36,
        borderRadius: 18,
        backgroundColor: bg,
        borderWidth: 1.5,
        borderColor: selected ? (color?.ink ?? theme.tint) + '33' : 'transparent',
      }}>
      {leading}
      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: selected ? '600' : '500', color: ink }}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Control segmentado simétrico (todas las opciones con el mismo ancho); la pastilla se desliza. */
export function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const segment = width / options.length;

  const x = useSharedValue(-1);
  useEffect(() => {
    if (segment <= 0) return;
    // La primera vez se coloca sin animar; luego, en Android con la curva de Material y en iOS con un muelle sin rebote.
    if (x.get() < 0) x.set(index * segment);
    else x.set(ANDROID ? withTiming(index * segment, { duration: DURATION.move, easing: EASE_MOVE }) : withSpring(index * segment, MOVE_SPRING));
  }, [index, segment, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: Math.max(0, x.get()) }] }));

  return (
    <View style={{ backgroundColor: theme.surfaceAlt, borderRadius: 12, borderCurve: 'continuous', padding: 3 }}>
      <View style={{ flexDirection: 'row' }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {segment > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: segment,
                borderRadius: 9,
                borderCurve: 'continuous',
                backgroundColor: theme.surface,
                boxShadow: theme.scheme === 'light' ? '0 1px 3px rgba(0,0,0,0.08)' : undefined,
              },
              thumb,
            ]}
          />
        ) : null}
        {options.map((o) => {
          const active = o.key === value;
          return (
            <Pressable
              key={o.key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (!active) haptic.tap();
                onChange(o.key);
              }}
              style={{ flex: 1, height: 32, alignItems: 'center', justifyContent: 'center' }}>
              <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: active ? '600' : '500', color: active ? theme.text : theme.textSecondary }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Botón ancho (primario, suave o destructivo). */
export function Button({ title, onPress, kind = 'primary', icon }: { title: string; onPress: () => void; kind?: 'primary' | 'soft' | 'danger'; icon?: IconName }) {
  const theme = useTheme();
  const bg = kind === 'primary' ? theme.tint : kind === 'danger' ? theme.dangerSoft : theme.surfaceAlt;
  const fg = kind === 'primary' ? theme.onTint : kind === 'danger' ? theme.danger : theme.text;
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      style={{ height: 50, borderRadius: 16, borderCurve: 'continuous', backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text style={{ fontSize: 16, fontWeight: '600', color: fg }}>{title}</Text>
    </PressableScale>
  );
}

/** Etiqueta de campo dentro de los formularios. */
export function FieldLabel({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, marginLeft: 2 }}>{children}</Text>;
}

/** Rejilla de N columnas con celdas idénticas (simetría): la última fila se completa con huecos. */
export function Grid<T>({ items, columns, render, gap = 10 }: { items: T[]; columns: number; render: (item: T) => ReactNode; gap?: number }) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={{ gap }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap }}>
          {row.map((item, j) => (
            <View key={j} style={{ flex: 1 }}>
              {render(item)}
            </View>
          ))}
          {Array.from({ length: columns - row.length }).map((_, j) => (
            <View key={`f${j}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}
