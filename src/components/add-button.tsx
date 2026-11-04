import { useRegisterTabBarAction } from './tab-bar-action';

type Props = { onPress: () => void; label: string };

/**
 * Android y web: el botón "+" es un círculo de cristal arriba a la derecha, como en iOS.
 * La pantalla solo lo registra mientras está enfocada.
 */
export function AddButton({ onPress, label }: Props) {
  useRegisterTabBarAction(label, onPress);
  return null;
}
