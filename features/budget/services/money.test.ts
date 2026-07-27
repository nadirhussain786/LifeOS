import { formatMoney, formatMoneyCompact, parseAmountToCents } from './money';

describe('parseAmountToCents', () => {
  it('parses whole and fractional amounts to integer cents', () => {
    expect(parseAmountToCents('1250')).toBe(125000);
    expect(parseAmountToCents('1,250.5')).toBe(125050);
    expect(parseAmountToCents('0.99')).toBe(99);
  });

  it('returns 0 for empty or non-numeric input', () => {
    expect(parseAmountToCents('')).toBe(0);
    expect(parseAmountToCents('abc')).toBe(0);
    expect(parseAmountToCents('$')).toBe(0);
  });

  it('rounds to the nearest cent', () => {
    expect(parseAmountToCents('1.005')).toBe(101); // 100.5 → 101
  });
});

describe('formatMoney', () => {
  it('formats USD with 2 decimals and grouping', () => {
    // Intl (en-US fallback locale in tests) → "$1,200.50".
    expect(formatMoney(120050, 'USD')).toBe('$1,200.50');
    expect(formatMoney(120000, 'USD')).toBe('$1,200.00');
  });

  it('uses the correct fraction digits per currency (the core bug fix)', () => {
    // JPY has 0 decimal places — must NOT show cents. 100000 minor-units = ¥1,000.
    expect(formatMoney(100000, 'JPY')).toBe('¥1,000');
    // KRW is also zero-decimal.
    expect(formatMoney(500000, 'KRW')).toBe('₩5,000');
  });

  it('renders negatives', () => {
    expect(formatMoney(-2500, 'USD')).toBe('-$25.00');
  });

  it('falls back gracefully for a raw-symbol (non-ISO) currency', () => {
    // Unknown code → manual path: symbol + grouped value.
    expect(formatMoney(120050, '$')).toBe('$1,200.50');
  });
});

describe('formatMoneyCompact', () => {
  it('abbreviates thousands', () => {
    expect(formatMoneyCompact(120000, 'USD')).toBe('$1.2k');
    expect(formatMoneyCompact(95000, 'USD')).toBe('$950');
  });
});
