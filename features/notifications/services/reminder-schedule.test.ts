import { reminderWeekdays } from '@/features/habits/services/habit-schedule';
import { timeSlots } from '@/features/water-intake/services/water-schedule';
import type { Habit } from '@/features/habits/types/habit.types';
import type { WaterReminderSettings } from '@/features/water-intake/types/water-intake.types';

/**
 * The two scheduling decisions that were quietly wrong.
 *
 * Neither needs a device: both are pure arithmetic that decides how many OS
 * notifications get created and on which days, which is exactly where the
 * "reminders don't work properly" reports came from.
 */

const water = (over: Partial<WaterReminderSettings> = {}): WaterReminderSettings => ({
  enabled: true,
  intervalMinutes: 60,
  startHour: 8,
  endHour: 21,
  ...over,
});

describe('water reminder slots', () => {
  it('covers the whole window at a sensible interval', () => {
    const slots = timeSlots(water());
    expect(slots[0]).toEqual({ hour: 8, minute: 0 });
    expect(slots[slots.length - 1]).toEqual({ hour: 21, minute: 0 });
  });

  it('bounds how many it will create', () => {
    // Every 30 minutes from 08:00 to 21:00 is 27 repeating notifications, and
    // iOS keeps only 64 pending in TOTAL across the whole app — silently
    // discarding the rest, with no say over which. Hydration is the least
    // consequential reminder here, so it is the one that gets a ceiling rather
    // than being allowed to crowd out task due-times.
    const slots = timeSlots(water({ intervalMinutes: 30 }));
    expect(slots.length).toBeLessThanOrEqual(24);
  });

  it('spreads the allowance across the window instead of truncating the day', () => {
    // Dropping the tail would silently end hydration reminders at lunchtime.
    const slots = timeSlots(water({ intervalMinutes: 30 }));
    expect(slots[0].hour).toBe(8);
    expect(slots[slots.length - 1].hour).toBe(21);
  });

  it('never produces a slot outside the configured window', () => {
    const slots = timeSlots(water({ intervalMinutes: 30, startHour: 9, endHour: 17 }));
    for (const slot of slots) {
      const minutes = slot.hour * 60 + slot.minute;
      expect(minutes).toBeGreaterThanOrEqual(9 * 60);
      expect(minutes).toBeLessThanOrEqual(17 * 60);
    }
  });

  it('returns nothing for an inverted or empty window', () => {
    expect(timeSlots(water({ startHour: 21, endHour: 8 }))).toEqual([]);
    expect(timeSlots(water({ startHour: 9, endHour: 9 }))).toEqual([]);
  });
});

const habit = (over: Partial<Habit> = {}): Habit =>
  ({
    id: 'h1',
    name: 'Gym',
    scheduleType: 'daily',
    scheduleDays: null,
    scheduleIntervalDays: null,
    reminderTime: '07:00',
    reminderNotificationId: null,
    ...over,
  }) as Habit;

describe('habit reminder weekdays', () => {
  it('reminds every day when the habit is a daily one', () => {
    // null means "no weekly triggers, use one daily trigger".
    expect(reminderWeekdays(habit())).toBeNull();
  });

  it('only reminds on the days a custom-schedule habit is actually due', () => {
    // The bug: every habit got a DAILY trigger regardless of its schedule, so a
    // Mon/Wed/Fri habit nagged on all seven days — including the four it wasn't
    // due, which is the fastest way to get someone to mute the app entirely.
    expect(
      reminderWeekdays(habit({ scheduleType: 'custom_days', scheduleDays: [1, 3, 5] })),
    ).toEqual([1, 3, 5]);
  });

  it('uses the same 0=Sunday convention as isDueOn', () => {
    expect(reminderWeekdays(habit({ scheduleType: 'custom_days', scheduleDays: [0, 6] }))).toEqual([
      0, 6,
    ]);
  });

  it('reminds on no day when a custom schedule selects none', () => {
    expect(reminderWeekdays(habit({ scheduleType: 'custom_days', scheduleDays: [] }))).toEqual([]);
    expect(reminderWeekdays(habit({ scheduleType: 'custom_days', scheduleDays: null }))).toEqual(
      [],
    );
  });

  it('discards out-of-range weekdays rather than scheduling a bad trigger', () => {
    expect(
      reminderWeekdays(habit({ scheduleType: 'custom_days', scheduleDays: [-1, 2, 7, 9] })),
    ).toEqual([2]);
  });

  it('falls back to a daily nudge for every-x-days habits, which no trigger can express', () => {
    // "Every 3 days" has no repeating OS trigger. Over-reminding beats a habit
    // that never reminds at all, and the app cannot run code on the off days.
    expect(
      reminderWeekdays(habit({ scheduleType: 'every_x_days', scheduleIntervalDays: 3 })),
    ).toBeNull();
  });
});
