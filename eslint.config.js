const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    // supabase/functions are Deno edge functions (https:// / esm.sh imports,
    // Deno globals) — a different runtime that the Expo/Node eslint config
    // can't resolve and shouldn't lint.
    ignores: ['dist/*', 'supabase/functions/**'],
  },
]);
