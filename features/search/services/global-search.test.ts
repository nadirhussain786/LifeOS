import {
  compareResults,
  normalize,
  scoreMatch,
  snippet,
  type SearchResult,
} from '@/features/search/services/global-search';

/**
 * Ranking is the whole feature. A search that merely filters returns results in
 * whatever order the database walked the tables, which for twelve modules means
 * the thing you wanted is somewhere in the middle.
 */

describe('normalize', () => {
  it('ignores case and surrounding space', () => {
    expect(normalize('  Morning Run ')).toBe('morning run');
  });

  it('ignores accents, so "cafe" finds "café"', () => {
    expect(normalize('café')).toBe(normalize('cafe'));
  });
});

describe('scoreMatch', () => {
  it('finds nothing for an empty query', () => {
    expect(scoreMatch('   ', 'Anything')).toBe(0);
  });

  it('ranks an exact title above a prefix, and a prefix above a substring', () => {
    const exact = scoreMatch('run', 'Run');
    const prefix = scoreMatch('run', 'Running shoes');
    const substring = scoreMatch('run', 'Prune the hedge');
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(substring);
  });

  it('ranks a match at a word boundary above one buried mid-word', () => {
    // "Morning run" is what you meant; "Prune" merely contains the letters.
    expect(scoreMatch('run', 'Morning run')).toBeGreaterThan(scoreMatch('run', 'Prune the hedge'));
  });

  it('ranks any title match above a body match', () => {
    expect(scoreMatch('gym', 'Gym')).toBeGreaterThan(
      scoreMatch('gym', 'Tuesday', 'went to the gym'),
    );
  });

  it('still finds text that only appears in the body', () => {
    expect(scoreMatch('dentist', 'Tuesday', 'called the dentist')).toBeGreaterThan(0);
  });

  it('returns 0 when nothing matches', () => {
    expect(scoreMatch('zebra', 'Morning run', 'went for a jog')).toBe(0);
  });
});

describe('compareResults', () => {
  const result = (over: Partial<SearchResult>): SearchResult => ({
    id: 'x',
    kind: 'task',
    module: 'habit',
    title: 't',
    subtitle: null,
    route: '/',
    score: 0,
    updatedAt: 0,
    ...over,
  });

  it('puts the better match first even when it is older', () => {
    const better = result({ id: 'better', score: 700, updatedAt: 1 });
    const newer = result({ id: 'newer', score: 300, updatedAt: 9_999 });
    expect([newer, better].sort(compareResults)[0].id).toBe('better');
  });

  it('falls back to recency only between equally good matches', () => {
    const older = result({ id: 'older', score: 500, updatedAt: 1 });
    const newer = result({ id: 'newer', score: 500, updatedAt: 2 });
    expect([older, newer].sort(compareResults)[0].id).toBe('newer');
  });
});

describe('snippet', () => {
  it('is null when there is no body to excerpt', () => {
    expect(snippet(null, 'x')).toBeNull();
    expect(snippet('   ', 'x')).toBeNull();
  });

  it('centres the excerpt on the match rather than starting on it', () => {
    const body = 'A long preamble that goes on for a while before the important word appears here.';
    const result = snippet(body, 'important');
    expect(result).toContain('important');
    expect(result?.startsWith('important')).toBe(false);
  });

  it('collapses whitespace so a multi-line note reads as one line', () => {
    expect(snippet('one\n\n  two   three', 'two')).toBe('one two three');
  });

  it('falls back to the opening when the match is only in the title', () => {
    expect(snippet('Some body text', 'zebra')).toBe('Some body text');
  });
});
