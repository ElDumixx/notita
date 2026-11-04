import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { interpolateColor, useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptic } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { EASE_OUT } from '@/theme/motion';

import { Icon } from './icon';

/** Ancho del botón «Eliminar» cuando la fila se queda abierta. */
const ACTION = 84;
/** Pasada esta fracción del ancho, al soltar se elimina sin tener que pulsar el botón. */
const DELETE_AT = 0.5;
/** Vuelta a su sitio (o a quedarse abierta): sin rebote, conservando la velocidad del dedo. */
const SNAP = { duration: 320, dampingRatio: 1 };

// Dónde se pararía la fila si siguiera frenando sola (para que un gesto rápido cuente como más largo).
function project(velocity: number) {
  'worklet';
  return ((velocity / 1000) * 0.99) / (1 - 0.99);
}

// Solo una fila abierta a la vez, como en iOS.
let closeOpenRow: (() => void) | null = null;

type Props = { children: ReactNode; onDelete: () => void; enabled?: boolean; label?: string };

/**
 * Deslizar a la izquierda para eliminar, como en Recordatorios de iOS. La fila sigue al dedo;
 * al soltar acaba siempre en un sitio: en su lugar, abierta con el botón «Eliminar» o, si el gesto
 * fue largo, eliminada. Si el sistema cancela el gesto (por ejemplo, porque la página empieza a hacer
 * scroll), vuelve a su sitio. En la web el scroll vertical lo sigue haciendo el navegador.
 */
export function SwipeToDelete({ children, onDelete, enabled = true, label = 'Eliminar' }: Props) {
  const theme = useTheme();
  const x = useSharedValue(0);
  const start = useSharedValue(0);
  const width = useSharedValue(0);
  const armed = useSharedValue(0);
  const [open, setOpen] = useState(false);

  const close = () => {
    x.set(withSpring(0, SNAP));
    setOpen(false);
    if (closeOpenRow === close) closeOpenRow = null;
  };
  const closeOthers = () => {
    if (closeOpenRow && closeOpenRow !== close) closeOpenRow();
  };
  const markOpen = () => {
    closeOthers();
    closeOpenRow = close;
    setOpen(true);
  };
  const markClosed = () => {
    setOpen(false);
    if (closeOpenRow === close) closeOpenRow = null;
  };
  const commit = () => {
    if (closeOpenRow === close) closeOpenRow = null;
    onDelete();
  };
  const removeNow = () => {
    x.set(withTiming(-width.get(), { duration: 200, easing: EASE_OUT }, (done) => {
      if (done) scheduleOnRN(commit);
    }));
  };

  const settle = (velocity: number, canceled: boolean) => {
    'worklet';
    const w = width.get() || 360;
    const projected = x.get() + (canceled ? 0 : project(velocity));
    // Se elimina si se soltó pasada la mitad, o si el gesto iba lanzado hasta casi el final.
    if (!canceled && (x.get() < -w * DELETE_AT || projected < -w * 0.8)) {
      x.set(withTiming(-w, { duration: 180, easing: EASE_OUT }, (done) => {
        if (done) scheduleOnRN(commit);
      }));
    } else if (projected < -ACTION / 2) {
      x.set(withSpring(-ACTION, { ...SNAP, velocity }));
      scheduleOnRN(markOpen);
    } else {
      x.set(withSpring(0, { ...SNAP, velocity }));
      scheduleOnRN(markClosed);
    }
  };

  const pan = usePanGesture({
    enabled,
    // Solo en horizontal: si el dedo va hacia arriba o abajo, gana el scroll de la lista.
    activeOffsetX: [-10, 10],
    failOffsetY: [-12, 12],
    onActivate: () => {
      start.set(x.get());
      scheduleOnRN(closeOthers);
    },
    onUpdate: (e) => {
      const next = start.get() + e.translationX;
      // Hacia la derecha no hay nada: se resiste.
      x.set(next > 0 ? next * 0.15 : next);
    },
    onDeactivate: (e) => {
      // La posición final manda: a veces el sistema agrupa movimientos y la última actualización se queda atrás.
      if (!e.canceled) x.set(Math.min(0, start.get() + e.translationX));
      settle(e.velocityX, e.canceled);
    },
  });

  // Al pasar el punto de no retorno, el fondo se vuelve rojo intenso y vibra una vez.
  useAnimatedReaction(
    () => width.get() > 0 && x.get() < -width.get() * DELETE_AT,
    (now, before) => {
      if (before === null || now === before) return;
      armed.set(withTiming(now ? 1 : 0, { duration: 120 }));
      if (now) scheduleOnRN(haptic.soft);
    }
  );

  const row = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  // El fondo rojo empieza justo donde acaba la fila: así nunca asoma por detrás del contenido.
  const back = useAnimatedStyle(() => ({
    opacity: x.get() < -1 ? 1 : 0,
    transform: [{ translateX: width.get() + x.get() }],
    backgroundColor: interpolateColor(armed.get(), [0, 1], [theme.dangerSoft, theme.danger]),
  }));
  const softLabel = useAnimatedStyle(() => ({ opacity: 1 - armed.get() }));
  const strongLabel = useAnimatedStyle(() => ({ opacity: armed.get() }));

  return (
    // El gesto va en el contenedor, que no se mueve: en Android, si estuviera en la fila que se
    // desplaza, el movimiento se mediría respecto a ella misma y la fila apenas seguiría al dedo.
    <GestureDetector gesture={pan} touchAction="pan-y">
      <View collapsable={false} onLayout={(e) => width.set(e.nativeEvent.layout.width)} style={{ overflow: 'hidden' }}>
        <Animated.View style={[StyleSheet.absoluteFill, back]}>
          <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={removeNow} style={{ width: ACTION, height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={[{ alignItems: 'center', gap: 2 }, softLabel]}>
              <Icon name="trash" size={20} color={theme.danger} />
              <Text style={{ color: theme.danger, fontSize: 12, fontWeight: '600' }}>{label}</Text>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', gap: 2 }, strongLabel]}>
              <Icon name="trash" size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>{label}</Text>
            </Animated.View>
          </Pressable>
        </Animated.View>
        <Animated.View style={row}>
          {children}
          {/* Abierta, un toque en la fila la cierra (en vez de abrir el recordatorio). */}
          {open ? <Pressable accessibilityLabel="Cerrar" onPress={close} style={StyleSheet.absoluteFill} /> : null}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
