const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

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

module.exports = withNativeWind(config, { input: './global.css' });
