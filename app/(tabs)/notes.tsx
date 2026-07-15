import { StickyNote } from 'lucide-react-native';

import { PlaceholderScreen } from '@/components/ui/placeholder-screen';

export default function NotesScreen() {
  return (
    <PlaceholderScreen icon={StickyNote} title="Notes" description="Capture ideas and quick notes here." />
  );
}
