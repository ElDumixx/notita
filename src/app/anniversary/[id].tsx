import { useLocalSearchParams } from 'expo-router';

import { AnniversaryEditor } from '@/screens/anniversary-editor';

export default function AnniversaryRoute() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  return <AnniversaryEditor id={id} date={date} />;
}
