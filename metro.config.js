const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build bundles a WASM SQLite binary. Metro doesn't
// recognize `.wasm` as an asset type by default, so it tries to parse the
// binary as a JS module ("Unable to resolve ...wa-sqlite.wasm") — treat it
// as a static asset instead, same as any image/font.
config.resolver.assetExts.push('wasm');

// zustand's ESM build (esm/middleware.mjs) contains a top-level
// `import.meta.env` reference used only by its devtools middleware (which
// we don't use — only `persist`). Metro's package-exports resolution picks
// that build for any `import` call site, then bundles it into a classic
// (non-module) <script>, where `import.meta` is a parser-level SyntaxError
// that breaks the entire web bundle. Force this one subpath straight to
// the CJS build, which guards the same code with `process.env` instead.
const { resolveRequest: defaultResolveRequest } = config.resolver;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand/middleware') {
    return {
      type: 'sourceFile',
      filePath: path.join(path.dirname(require.resolve('zustand/package.json')), 'middleware.js'),
    };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

// expo-sqlite's web build needs `SharedArrayBuffer`, which browsers only
// expose to cross-origin-isolated pages. Metro doesn't send those headers
// by default, so `openDatabaseSync` throws "SharedArrayBuffer is not
// defined" on web. Native (iOS/Android) is unaffected — it uses real
// native SQLite, not this WASM build.
// NOTE: as of Expo SDK 54 / @expo/cli 0.24, this is a known limitation
// (github.com/expo/expo/issues/38481) — enhanceMiddleware correctly adds
// the headers to bundle/asset responses, but not to the root HTML document
// response, so the page still isn't cross-origin-isolated in local dev.
// Left in place since it's the documented fix and does no harm; re-check
// after upgrading @expo/cli. Production static export + EAS Hosting has a
// separate, working mechanism (expo-router server headers config).
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
