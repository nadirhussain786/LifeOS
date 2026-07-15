import { Calendar as CalendarIcon } from 'lucide-react-native';

import { PlaceholderScreen } from '@/components/ui/placeholder-screen';

export default function CalendarScreen() {
  return (
    <PlaceholderScreen
      icon={CalendarIcon}
      title="Calendar"
      description="See your schedule and upcoming events here."
    />
  );
}
