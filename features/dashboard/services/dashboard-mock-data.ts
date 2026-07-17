import type { DailyQuoteData } from '@/features/dashboard/types/dashboard.types';

function delay<T>(value: T, ms = 500) {
  return new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
}

// A large enough pool that the day-of-year rotation doesn't visibly repeat
// within a season — see fetchDailyQuote below.
const QUOTES: DailyQuoteData[] = [
  { quote: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { quote: 'Do the hard things first.', author: 'Unknown' },
  { quote: 'Small steps every day.', author: 'Unknown' },
  { quote: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
  { quote: 'What you do every day matters more than what you do once in a while.', author: 'Gretchen Rubin' },
  { quote: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
  { quote: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { quote: 'Well begun is half done.', author: 'Aristotle' },
  { quote: 'Amateurs sit and wait for inspiration. The rest of us just get up and go to work.', author: 'Stephen King' },
  { quote: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
  { quote: 'Almost everything will work again if you unplug it for a few minutes, including you.', author: 'Anne Lamott' },
  { quote: 'The days are long, but the years are short.', author: 'Gretchen Rubin' },
  { quote: 'How we spend our days is, of course, how we spend our lives.', author: 'Annie Dillard' },
  { quote: 'Slow is smooth, and smooth is fast.', author: 'Unknown' },
  { quote: 'Progress, not perfection.', author: 'Unknown' },
  { quote: 'You cannot pour from an empty cup.', author: 'Unknown' },
  { quote: 'Rest is not idleness.', author: 'John Lubbock' },
  { quote: 'What gets measured gets managed.', author: 'Peter Drucker' },
  { quote: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { quote: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
  { quote: 'Done is better than perfect.', author: 'Sheryl Sandberg' },
  { quote: 'Motivation is what gets you started. Habit is what keeps you going.', author: 'Jim Ryun' },
  { quote: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Will Durant' },
  { quote: 'Either you run the day, or the day runs you.', author: 'Jim Rohn' },
  { quote: 'Clarity comes from engagement, not thought.', author: 'Marie Forleo' },
  { quote: 'You do not need more time. You need to decide.', author: 'Seth Godin' },
  { quote: 'Energy and persistence conquer all things.', author: 'Benjamin Franklin' },
  { quote: 'Nothing is particularly hard if you divide it into small jobs.', author: 'Henry Ford' },
  { quote: 'Take care of the minutes, and the hours will take care of themselves.', author: 'Lord Chesterfield' },
  { quote: 'A little progress each day adds up to big results.', author: 'Satya Nani' },
];

export function fetchDailyQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000);
  return delay<DailyQuoteData>(QUOTES[dayOfYear % QUOTES.length], 300);
}
