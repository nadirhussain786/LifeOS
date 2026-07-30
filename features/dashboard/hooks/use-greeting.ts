import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function greetingKey(hour: number) {
  if (hour < 5) return 'dashboard.goodNight';
  if (hour < 12) return 'dashboard.goodMorning';
  if (hour < 17) return 'dashboard.goodAfternoon';
  return 'dashboard.goodEvening';
}

/** Greeting + formatted date, refreshed every minute to stay accurate across midnight/hour boundaries. */
export function useGreeting(name?: string) {
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const greeting = t(greetingKey(now.getHours()));

  return {
    greeting: name ? t('dashboard.greetingWithName', { greeting, name }) : greeting,
    // Locale-aware weekday + day + month (e.g. "Monday, 27 July" / "الاثنين، ٢٧ يوليو").
    dateLabel: now.toLocaleDateString(i18n.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
  };
}
