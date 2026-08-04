/** Jest config for unit tests. Uses the jest-expo preset so Expo/RN modules
 * (expo-localization, etc.) are transformed/mocked. Tests target pure logic
 * first — money, streaks, sync — where a bug silently corrupts user data. */

module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.expo/'],
  /**
   * `lucide-react-native` ships untranspiled ESM, so importing the Hub registry
   * (which uses it for module icons) dies on `Unexpected token 'export'`.
   *
   * Stubbed rather than transformed. Allowlisting it works, but the package is
   * ~1,500 icon modules and babel takes ~45 seconds over them — on every run,
   * for glyph data no test inspects. The stub answers any icon name with an
   * inert component and costs nothing.
   */
  moduleNameMapper: {
    '^lucide-react-native$': '<rootDir>/test/lucide-stub.js',
  },
};
