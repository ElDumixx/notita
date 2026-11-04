import { useLocalSearchParams } from 'expo-router';

import { NotebookDetailScreen } from '@/screens/notebook-detail';

export default function NotebookRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NotebookDetailScreen id={id} />;
}
