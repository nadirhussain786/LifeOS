/**
 * Stand-in for `lucide-react-native` under Jest.
 *
 * The package ships ~1,500 ESM icon modules. Transforming them so a test can
 * import the Hub registry costs ~45s per run — for data the tests never look
 * at, since what they assert is module ids, routes and table lists, not glyphs.
 *
 * A Proxy answers any icon name with the same inert component, so no test ever
 * needs updating when an icon is swapped. Rendering-level tests would want the
 * real thing; nothing here renders one.
 */
const Icon = () => null;
Icon.displayName = 'LucideIconStub';

module.exports = new Proxy(
  {},
  {
    get: (target, property) => {
      // Let Jest and the module system see through the Proxy for their own
      // bookkeeping instead of handing them a component.
      if (property === '__esModule') return true;
      if (typeof property === 'symbol') return undefined;
      return Icon;
    },
  },
);
