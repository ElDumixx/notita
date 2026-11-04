import { useLocalSearchParams } from 'expo-router';

import { ReminderEditor } from '@/screens/reminder-editor';

export default function ReminderRoute() {
  const { id, notebookId, date } = useLocalSearchParams<{ id: string; notebookId?: string; date?: string }>();
  return <ReminderEditor id={id} notebookId={notebookId} date={date} />;
}
