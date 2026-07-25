import { calculateHabitStreaks, isHabitScheduledOn, toDateKey } from './habit-streaks';
import type { HabitLog, HabitSkip } from '@/features/habits/types/habit.types';

// A fixed "now" in local time so date-key math is deterministic across TZs.
const ASOF = new Date(2026, 6, 20, 12, 0, 0); // Mon Jul 20 2026, local noon
const daysAgo = (n: number) => new Date(2026, 6, 20 - n, 12, 0, 0);

const daily = {
  scheduleType: 'daily' as const,
  scheduleDays: null,
  scheduleIntervalDays: null,
  createdAt: new Date(2026, 0, 1).getTime(),
};

const log = (d: Date): HabitLog => ({ logDate: toDateKey(d) }) as HabitLog;
const skip = (d: Date): HabitSkip => ({ logDate: toDateKey(d) }) as HabitSkip;

describe('isHabitScheduledOn', () => {
  it('daily is always scheduled', () => {
    expect(isHabitScheduledOn(daily, toDateKey(ASOF))).toBe(true);
  });

  it('custom_days respects the weekday set (Jul 20 2026 is a Monday = 1)', () => {
    const monWed = { scheduleType: 'custom_days' as const, scheduleDays: [1, 3], scheduleIntervalDays: null, createdAt: 0 };
    expect(isHabitScheduledOn(monWed, toDateKey(ASOF))).toBe(true); // Mon
    expect(isHabitScheduledOn(monWed, toDateKey(daysAgo(1)))).toBe(false); // Sun
  });

  it('every_x_days is anchored on createdAt', () => {
    const everyThree = {
      scheduleType: 'every_x_days' as const,
      scheduleDays: null,
      scheduleIntervalDays: 3,
      createdAt: daysAgo(6).getTime(),
    };
    expect(isHabitScheduledOn(everyThree, toDateKey(daysAgo(6)))).toBe(true); // day 0
    expect(isHabitScheduledOn(everyThree, toDateKey(daysAgo(3)))).toBe(true); // day 3
    expect(isHabitScheduledOn(everyThree, toDateKey(daysAgo(5)))).toBe(false); // day 1
  });
});

describe('calculateHabitStreaks — current streak', () => {
  it('counts a multi-day run ending today (regression: was capped at 1)', () => {
    const logs = [log(ASOF), log(daysAgo(1)), log(daysAgo(2))];
    const r = calculateHabitStreaks(daily, logs, [], ASOF);
    expect(r.currentStreak).toBe(3);
    expect(r.bestStreak).toBe(3);
  });

  it('keeps the streak alive when today is still pending', () => {
    const logs = [log(daysAgo(1)), log(daysAgo(2))];
    const r = calculateHabitStreaks(daily, logs, [], ASOF);
    expect(r.currentStreak).toBe(2); // today not logged yet, but not a miss
  });

  it('breaks the streak on a real miss', () => {
    const logs = [log(ASOF), log(daysAgo(1)), /* miss day 2 */ log(daysAgo(3))];
    const r = calculateHabitStreaks(daily, logs, [], ASOF);
    expect(r.currentStreak).toBe(2);
  });

  it('treats an excused skip as transparent', () => {
    const logs = [log(ASOF), log(daysAgo(2))];
    const skips = [skip(daysAgo(1))];
    const r = calculateHabitStreaks(daily, logs, skips, ASOF);
    expect(r.currentStreak).toBe(2); // skip neither breaks nor counts
  });

  it('is 0 with no logs', () => {
    const r = calculateHabitStreaks(daily, [], [], ASOF);
    expect(r.currentStreak).toBe(0);
    expect(r.bestStreak).toBe(0);
  });
});

describe('calculateHabitStreaks — best streak', () => {
  it('finds an older longer run after a recent lapse', () => {
    const logs = [
      log(ASOF), // current run = 1
      // miss yesterday
      log(daysAgo(2)),
      log(daysAgo(3)),
      log(daysAgo(4)),
      log(daysAgo(5)), // older run = 4
    ];
    const r = calculateHabitStreaks(daily, logs, [], ASOF);
    expect(r.currentStreak).toBe(1);
    expect(r.bestStreak).toBe(4);
  });
});

describe('calculateHabitStreaks — completion rate', () => {
  it('is 1 when there are no scheduled days in the window', () => {
    const noneScheduled = { scheduleType: 'custom_days' as const, scheduleDays: [], scheduleIntervalDays: null, createdAt: 0 };
    const r = calculateHabitStreaks(noneScheduled, [], [], ASOF);
    expect(r.completionRate30d).toBe(1);
  });
});
