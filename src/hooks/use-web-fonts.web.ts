import { useFonts } from 'expo-font';

const FONT_FILES = {
  'ComicNeue-Regular': require('@/assets/fonts/ComicNeue-Regular.ttf'),
  'ComicNeue-Bold': require('@/assets/fonts/ComicNeue-Bold.ttf'),
  'Caveat-Medium': require('@/assets/fonts/Caveat-Medium.ttf'),
  'Caveat-Bold': require('@/assets/fonts/Caveat-Bold.ttf'),
  'Nunito-Medium': require('@/assets/fonts/Nunito-Medium.ttf'),
  'Nunito-ExtraBold': require('@/assets/fonts/Nunito-ExtraBold.ttf'),
  'Lora-Medium': require('@/assets/fonts/Lora-Medium.ttf'),
  'Lora-Bold': require('@/assets/fonts/Lora-Bold.ttf'),
  'CourierPrime-Regular': require('@/assets/fonts/CourierPrime-Regular.ttf'),
  'CourierPrime-Bold': require('@/assets/fonts/CourierPrime-Bold.ttf'),
  'PermanentMarker-Regular': require('@/assets/fonts/PermanentMarker-Regular.ttf'),
};

/** Web: carga las fuentes de los pósits (en el móvil ya vienen dentro de la app). */
export function useWebFonts() {
  useFonts(FONT_FILES);
}
