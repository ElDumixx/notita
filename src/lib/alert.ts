import { Alert } from 'react-native';

/** Diálogo nativo (en la web, alert.web.ts usa los del navegador). */
export const showAlert: typeof Alert.alert = (...args) => Alert.alert(...args);
