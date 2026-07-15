import { format } from 'date-fns';
import { useEffect, useState } from 'react';

function computeGreeting(hour: number) {
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Greeting + formatted date, refreshed every minute to stay accurate across midnight/hour boundaries. */
export function useGreeting(name?: string) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const greeting = computeGreeting(now.getHours());

  return {
    greeting: name ? `${greeting}, ${name}` : greeting,
    dateLabel: format(now, 'EEEE, d MMMM'),
  };
}
