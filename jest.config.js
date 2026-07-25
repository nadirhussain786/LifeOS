/** Jest config for unit tests. Uses the jest-expo preset so Expo/RN modules
 * (expo-localization, etc.) are transformed/mocked. Tests target pure logic
 * first — money, streaks, sync — where a bug silently corrupts user data. */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/.expo/'],
};
