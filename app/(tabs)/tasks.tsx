import { CheckSquare } from 'lucide-react-native';

import { PlaceholderScreen } from '@/components/ui/placeholder-screen';

export default function TasksScreen() {
  return (
    <PlaceholderScreen
      icon={CheckSquare}
      title="Tasks"
      description="Plan, organize, and track your to-dos here."
    />
  );
}
