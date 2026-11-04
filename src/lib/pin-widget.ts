// En iOS los widgets se añaden desde la pantalla de inicio; solo Android permite pedirlo desde la app.
export const canPinWidget = false;

export async function pinWidget(_widgetName?: string): Promise<boolean> {
  return false;
}
