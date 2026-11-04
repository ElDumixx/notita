type Props = { title: string; large?: boolean; back?: boolean; /** Espacio extra bajo el título (pantallas sin separación propia). */ spacing?: number };

/**
 * Título de pantalla al estilo de iOS para la versión web (screen-title.web.tsx). En iOS y
 * Android lo pone la cabecera nativa de la pila, así que aquí no se dibuja nada.
 */
export function ScreenTitle(_props: Props) {
  return null;
}
