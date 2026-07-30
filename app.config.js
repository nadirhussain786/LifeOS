/**
 * Dynamic layer over app.json.
 *
 * Everything static still lives in app.json — Expo reads it first and hands it
 * to the function below as `config`. This file exists for one job: making a
 * release EAS build FAIL, loudly and with instructions, when the Supabase
 * credentials aren't present in the build environment.
 *
 * Why that's the fix. `process.env.EXPO_PUBLIC_*` is inlined by Metro at bundle
 * time, so it depends entirely on those variables existing in the EAS build
 * environment. When they don't, the inlining quietly produces `undefined`,
 * `isSupabaseConfigured` goes false, and the APK installs and runs — as a
 * guest-only app that cannot sign anybody in. The failure surfaces hours later,
 * on a phone, as "supabase env issues", with nothing on screen to explain it.
 * Nothing in the build output flags it, because as far as the bundler is
 * concerned an absent variable is a perfectly valid empty string.
 *
 * Deliberately NOT done here: copying the values into `extra`. It looks like
 * useful redundancy, but `runtimeVersion.policy` is `fingerprint`, and the
 * fingerprint covers the resolved app config — so credentials in `extra` make
 * the runtime version change whenever a key is rotated. That silently cuts every
 * already-installed build off from OTA updates, which is the one channel through
 * which a rotated key could otherwise have been delivered. The redundancy would
 * also protect against almost nothing: the failure being fixed here is the
 * variable being absent, and `extra` reads from the same absent variable.
 */

/** The two credentials without which auth and sync cannot work at all. */
const REQUIRED_VARS = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];

/** Build profiles that must not ship without working credentials. `development`
 * is exempt: a dev client is routinely built before a backend exists, and guest
 * mode is a legitimate way to run the app. */
const CREDENTIALED_PROFILES = ['preview', 'production', 'production-apk'];

function credentialsHelp(missing) {
  const profile = process.env.EAS_BUILD_PROFILE ?? 'production';
  // eas.json maps production-apk onto the production environment via `extends`.
  const environment = profile === 'production-apk' ? 'production' : profile;
  const commands = missing
    .map((name) => `  eas env:create --environment ${environment} --name ${name} --value "..."`)
    .join('\n');

  return [
    `Missing ${missing.join(' and ')} for the "${profile}" build.`,
    '',
    'Local .env files are NOT uploaded to EAS — they are gitignored, and EAS only',
    'uploads what git tracks. Build-time values come from the EAS environment that',
    `eas.json links this profile to, which here is "${environment}".`,
    '',
    'Set them once, then rebuild:',
    commands,
    '',
    `See what that environment currently holds:  eas env:list --environment ${environment}`,
    '',
    'A variable that exists but is assigned to a different environment is not',
    'visible to this build — that is the usual cause of this error.',
  ].join('\n');
}

module.exports = ({ config }) => {
  const missing = REQUIRED_VARS.filter((name) => !(process.env[name] ?? '').trim());

  if (missing.length > 0) {
    const profile = process.env.EAS_BUILD_PROFILE;
    // Only on the build server: EAS also evaluates this config locally to compute
    // the fingerprint, where the variables are legitimately absent.
    if (process.env.EAS_BUILD && profile && CREDENTIALED_PROFILES.includes(profile)) {
      // Fail here, where the message can still be read, rather than on a phone.
      throw new Error(`\n\n${credentialsHelp(missing)}\n`);
    }
    console.warn(
      `[lifeos] ${missing.join(', ')} not set — auth and cloud sync will be disabled ` +
        '(guest mode still works). See .env.example.',
    );
  }

  return config;
};
