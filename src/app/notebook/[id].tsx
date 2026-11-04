import { useLocalSearchParams } from 'expo-router';

import { NotebookEditor } from '@/screens/notebook-editor';

export default function NotebookEditorRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NotebookEditor id={id} />;
}
