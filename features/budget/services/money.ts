import { currencySymbol } from '@/features/budget/config/currencies';

/**
 * Money helpers. All amounts are integer minor units (cents) end-to-end —
 * floats never touch a balance — and only get formatted to a decimal string
 * at the display edge. The `currency` arg may be an ISO code ("USD") or a raw
 * symbol ("$"); both resolve to the right display symbol.
 */

/** Formats cents as a currency string: whole amounts drop the decimals
 * ("$1,200"), fractional amounts keep two ("$1,200.50"). Negatives render
 * with a leading minus before the symbol. */
export function formatMoney(cents: number, currency = 'USD'): string {
  const symbol = currencySymbol(currency);
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100);
  const frac = abs % 100;
  const grouped = whole.toLocaleString('en-US');
  const body = frac === 0 ? grouped : `${grouped}.${String(frac).padStart(2, '0')}`;
  return `${negative ? '-' : ''}${symbol}${body}`;
}

/** Compact format for chart axes / tight tiles: "$1.2k", "$950". */
export function formatMoneyCompact(cents: number, currency = 'USD'): string {
  const symbol = currencySymbol(currency);
  const abs = Math.abs(Math.round(cents));
  const dollars = abs / 100;
  const sign = cents < 0 ? '-' : '';
  if (dollars >= 1000) return `${sign}${symbol}${(dollars / 1000).toFixed(dollars >= 10000 ? 0 : 1)}k`;
  return `${sign}${symbol}${Math.round(dollars)}`;
}

/** Parses a user-typed amount ("1,250.5", "1250") into integer cents. Returns
 * 0 for empty/invalid input. Rounds to the nearest cent. */
export function parseAmountToCents(text: string): number {
  const cleaned = text.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  const value = parseFloat(cleaned);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}
