import { useRegisterTabBarAction } from './tab-bar-action';

type Props = { onPress: () => void; label: string };

/**
 * Android y web: el botón "+" vive junto a la barra de pestañas flotante (como el botón
 * accesorio de la barra de iOS 26). La pantalla solo lo registra mientras está enfocada.
 */
export function AddButton({ onPress, label }: Props) {
  useRegisterTabBarAction(label, onPress);
  return null;
}
