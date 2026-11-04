import { useLocalSearchParams } from 'expo-router';

import { DesignEditor } from '@/screens/design-editor';

export default function DesignRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <DesignEditor id={id} />;
}
