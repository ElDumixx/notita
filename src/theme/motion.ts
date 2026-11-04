/**
 * Movimiento de la app: pocas animaciones, cortas y con un motivo (responder a un toque, explicar
 * un cambio). En Android son más sobrias todavía —sin rebotes, más cortas y con la curva estándar
 * de Material 3—; en iOS (y en la web, que la imita), muelles suaves como los del sistema.
 * Todas respetan «Reducir movimiento» del sistema (es lo que hace Reanimated por defecto).
 */
import { cubicBezier, Easing, FadeIn, FadeInDown, FadeOut, FadeOutDown, Keyframe, LinearTransition } from 'react-native-reanimated';

export const ANDROID = process.env.EXPO_OS === 'android';

/** Salida rápida y frenada: para lo que aparece o responde a un toque. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
/** Para lo que se mueve de un sitio a otro de la pantalla. */
export const EASE_MOVE = ANDROID ? Easing.bezier(0.2, 0, 0, 1) : Easing.bezier(0.65, 0, 0.35, 1);

/** Duraciones base (ms). */
export const DURATION = {
  press: 110,
  quick: ANDROID ? 150 : 200,
  move: ANDROID ? 200 : 260,
};

/** Desplazamientos que acompañan al dedo o a una selección (la lente de la barra). */
export const MOVE_SPRING = ANDROID ? { duration: 260, dampingRatio: 1 } : { duration: 380, dampingRatio: 0.86 };
/** Vuelta a su tamaño al soltar: en iOS con un levísimo rebote; en Android, sin él. */
export const RELEASE_SPRING = ANDROID ? { duration: 220, dampingRatio: 1 } : { duration: 320, dampingRatio: 0.72 };

/** Recolocación de filas y tarjetas cuando algo aparece o desaparece. */
export const LAYOUT = ANDROID ? LinearTransition.duration(DURATION.move).easing(EASE_MOVE) : LinearTransition.springify(340).dampingRatio(0.92);

export const ENTER = FadeIn.duration(DURATION.quick);
export const EXIT = FadeOut.duration(ANDROID ? 110 : 150);

/** Aparición de una pieza pequeña (el icono del editor, el botón +): nunca desde escala 0. */
export const POP = ANDROID
  ? new Keyframe({ 0: { opacity: 0, transform: [{ scale: 0.94 }] }, 100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT } }).duration(160)
  : new Keyframe({
      0: { opacity: 0, transform: [{ scale: 0.9 }] },
      65: { opacity: 1, transform: [{ scale: 1.02 }], easing: EASE_OUT },
      100: { opacity: 1, transform: [{ scale: 1 }] },
    }).duration(260);

/** Avisos que suben desde abajo (el «Deshacer»): sale por donde entró y algo más rápido. */
export const TOAST_IN = (ANDROID ? FadeIn.duration(180) : FadeInDown.duration(280)).easing(EASE_OUT);
export const TOAST_OUT = (ANDROID ? FadeOut.duration(140) : FadeOutDown.duration(220)).easing(EASE_OUT);

/** Cambio de color con un fundido corto (texto que se apaga, etiqueta que se activa). */
export const COLOR_FADE = {
  transitionProperty: 'color',
  transitionDuration: DURATION.quick,
  transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
} as const;

/** Lo que tarda una tarea marcada en irse de la lista: lo justo para ver la casilla rellenarse. */
export const COMPLETE_DELAY = ANDROID ? 320 : 420;
