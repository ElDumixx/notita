import { useLocalSearchParams } from 'expo-router';

import { DesignEditor } from '@/screens/design-editor';

export default function DesignRoute() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  return <DesignEditor id={id} kind={kind === 'aguja' ? 'aguja' : 'postit'} />;
}
