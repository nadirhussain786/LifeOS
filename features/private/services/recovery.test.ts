import {
  activeTargets,
  statsFor,
  type RecoveryEntry,
} from '@/features/private/services/recovery-math';

const NOW = new Date('2026-03-01T12:00:00');

const entry = (
  date: string,
  outcome: RecoveryEntry['outcome'],
  triggers: RecoveryEntry['triggers'] = [],
  target: RecoveryEntry['target'] = 'alcohol',
): RecoveryEntry => ({
  id: `${target}-${date}-${outcome}`,
  createdAt: 0,
  updatedAt: 0,
  target,
  date,
  outcome,
  intensity: 3,
  triggers,
  note: '',
});

describe('statsFor', () => {
  it('counts the streak from the last relapse', () => {
    const stats = statsFor([entry('2026-02-01', 'relapsed')], 'alcohol', NOW);
    expect(stats.currentStreak).toBe(28);
  });

  it('reports no streak rather than zero when nothing has been logged', () => {
    // A zero here would read as "you relapsed today", which is both wrong and
    // the most discouraging possible thing to show somebody on day one.
    expect(statsFor([], 'alcohol', NOW).currentStreak).toBeNull();
  });

  it('treats a resisted urge as not breaking the streak', () => {
    const stats = statsFor(
      [entry('2026-02-01', 'relapsed'), entry('2026-02-20', 'resisted')],
      'alcohol',
      NOW,
    );
    expect(stats.currentStreak).toBe(28);
    expect(stats.resisted).toBe(1);
  });

  it('keeps the longest streak after a relapse ends it', () => {
    // The point of the whole module: a bad day is data, not an erasure of the
    // forty before it.
    const stats = statsFor(
      [entry('2026-01-01', 'relapsed'), entry('2026-02-10', 'relapsed')],
      'alcohol',
      NOW,
    );
    expect(stats.currentStreak).toBe(19);
    expect(stats.longestStreak).toBe(40);
  });

  it('counts a never-broken run from the first entry', () => {
    const stats = statsFor([entry('2026-01-01', 'resisted')], 'alcohol', NOW);
    expect(stats.currentStreak).toBeNull();
    expect(stats.longestStreak).toBe(59);
  });

  it('keeps each target separate', () => {
    const stats = statsFor(
      [
        entry('2026-01-01', 'relapsed', [], 'alcohol'),
        entry('2026-02-25', 'relapsed', [], 'smoking'),
      ],
      'alcohol',
      NOW,
    );
    expect(stats.currentStreak).toBe(59);
    expect(stats.relapsed).toBe(1);
  });

  it('ranks the triggers that preceded relapses, not all urges', () => {
    // Only relapse triggers are actionable — a trigger somebody consistently
    // resists is a success, and surfacing it as a risk inverts the advice.
    const stats = statsFor(
      [
        entry('2026-02-01', 'relapsed', ['stress', 'lateNight']),
        entry('2026-02-10', 'relapsed', ['stress']),
        entry('2026-02-12', 'resisted', ['boredom', 'boredom']),
      ],
      'alcohol',
      NOW,
    );
    expect(stats.topRelapseTriggers[0]).toEqual({ trigger: 'stress', count: 2 });
    expect(stats.topRelapseTriggers.map((t) => t.trigger)).not.toContain('boredom');
  });
});

describe('activeTargets', () => {
  it('lists only what has actually been tracked', () => {
    const targets = activeTargets([
      entry('2026-01-01', 'resisted', [], 'smoking'),
      entry('2026-01-02', 'resisted', [], 'smoking'),
      entry('2026-01-03', 'resisted', [], 'gambling'),
    ]);
    expect(targets).toEqual(['smoking', 'gambling']);
  });
});
