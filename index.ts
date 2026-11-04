import 'expo-router/entry';

// Widgets de Android: tarea en segundo plano y pantalla de configuración.
if (process.env.EXPO_OS === 'android') {
  /* eslint-disable @typescript-eslint/no-require-imports -- carga condicional: solo existe en Android */
  const { registerWidgetConfigurationScreen, registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widgets/task-handler');
  const { WidgetConfigScreen } = require('./src/widgets/config-screen');
  /* eslint-enable @typescript-eslint/no-require-imports */
  registerWidgetTaskHandler(widgetTaskHandler);
  registerWidgetConfigurationScreen(WidgetConfigScreen);
}
