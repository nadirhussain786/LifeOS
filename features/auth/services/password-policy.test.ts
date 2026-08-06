import {
  checkPassword,
  PASSWORD_MIN_LENGTH,
  passwordProblemKey,
} from '@/features/auth/services/password-policy';

const problemOf = (password: string, identity: string[] = []) => {
  const result = checkPassword(password, identity);
  return result.ok ? null : result.problem;
};

describe('password policy', () => {
  it('refuses anything under the minimum length', () => {
    expect(problemOf('a'.repeat(PASSWORD_MIN_LENGTH - 1))).toBe('too_short');
    // Supabase's own default floor, which is what this exists to raise.
    expect(problemOf('123456')).toBe('too_short');
  });

  it('refuses the passwords attackers try first', () => {
    expect(problemOf('password123')).toBe('too_common');
    expect(problemOf('P@ssw0rd')).toBe('too_short'); // eight characters
    expect(problemOf('Welcome123')).toBe('too_common'); // matched case-insensitively
  });

  it('refuses a password built out of the account it protects', () => {
    // The threat for a shared-device app: whoever picks up the phone already
    // knows the name and the email on it.
    expect(problemOf('sarah-chen-01', ['sarah@example.com', 'Sarah Chen'])).toBe(
      'contains_identity',
    );
    expect(problemOf('example2026!', ['sarah@example.com'])).toBe('contains_identity');
  });

  it('ignores identity fragments too short to mean anything', () => {
    // "an" appearing in a password says nothing about who owns it.
    expect(problemOf('thunderous-marmalade', ['an@bc.io', 'An Bc'])).toBeNull();
  });

  it('refuses keyboard runs and single repeated characters', () => {
    expect(problemOf('qwertyuiop')).toBe('too_common');
    expect(problemOf('abcdefghij')).toBe('too_simple');
    expect(problemOf('aaaaaaaaaa')).toBe('too_simple');
    expect(problemOf('ababababab')).toBe('too_simple');
  });

  it('accepts a long passphrase without demanding punctuation', () => {
    // NIST SP 800-63B: length is what resists guessing. Composition rules
    // mostly produce Password1!.
    expect(problemOf('correct horse battery staple')).toBeNull();
    expect(problemOf('my morning coffee ritual')).toBeNull();
  });

  it('accepts an ordinary strong password', () => {
    expect(problemOf('t9rQ-vault-2026')).toBeNull();
  });

  it('refuses more than bcrypt will actually hash', () => {
    // Supabase hashes with bcrypt, which truncates at 72 bytes. Accepting more
    // would tell the user their 200-character password is stronger than the
    // 72 bytes of it that are real.
    expect(problemOf('a-strong-passphrase-'.repeat(10))).toBe('too_long');
    // Counted in bytes, not characters: one emoji spends four of the budget.
    expect(problemOf('🔐'.repeat(19))).toBe('too_long');
  });

  it('names an i18n key for every problem it can report', () => {
    for (const problem of [
      'too_short',
      'too_common',
      'too_simple',
      'contains_identity',
      'too_long',
    ] as const) {
      expect(passwordProblemKey(problem)).toBe(`auth.passwordProblem.${problem}`);
    }
  });
});
