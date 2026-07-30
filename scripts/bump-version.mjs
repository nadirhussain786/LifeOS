#!/usr/bin/env node
/**
 * Bumps the user-facing app version.
 *
 * Why this script exists at all. EAS manages exactly two version numbers for us:
 * `android.versionCode` and `ios.buildNumber`. eas.json sets
 * `cli.appVersionSource: "remote"` and `autoIncrement: true` on the production
 * profile, so those two live on EAS servers and step forward on every build
 * without anybody editing a file. The user-facing semver — the "1.1.0" that
 * shows up on the store listing and in Settings — is deliberately NOT managed
 * remotely. EAS reads it from the app config as-is and never writes it back.
 * So a release that should read 1.2.0 stays on 1.1.0 until someone edits
 * app.json and commits. This script is that someone.
 *
 * Usage:
 *   node scripts/bump-version.mjs [major|minor|patch] [--dry-run]
 *
 * Defaults to `minor`, which is what .github/workflows/release.yml asks for on
 * every push to main.
 *
 * app.json is edited as TEXT, not parsed and re-serialised. That looks
 * needlessly fussy for a one-field change, but `JSON.parse` + `JSON.stringify`
 * would expand every short inline array in app.json (`["audio"]`,
 * `["CA92.1"]`, …) onto multiple lines. Prettier wants those collapsed while
 * they fit inside printWidth 100, so the rewrite would produce a ~40-line diff
 * and then fail `npm run format:check` in the same CI run that made it.
 * A targeted replacement keeps the diff at one line per file.
 */

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP_JSON = join(ROOT, 'app.json');
const PACKAGE_JSON = join(ROOT, 'package.json');

const LEVELS = ['major', 'minor', 'patch'];

/** Matches the `"version": "1.2.3"` entry, capturing the parts around the value
 *  so the exact original spacing and punctuation can be put back. */
const VERSION_LINE = /(^[ \t]*"version"[ \t]*:[ \t]*")(\d+\.\d+\.\d+)(")/m;

function fail(message) {
  console.error(`\n[bump-version] ${message}\n`);
  process.exit(1);
}

/** Reads the current version out of a file, insisting on exactly one match so a
 *  future second `"version"` key can never make us edit the wrong one. */
function readVersion(path) {
  const text = readFileSync(path, 'utf8');
  const matches = text.match(new RegExp(VERSION_LINE.source, 'gm')) ?? [];

  if (matches.length === 0) {
    fail(`No "version": "x.y.z" field found in ${path}.`);
  }
  if (matches.length > 1) {
    fail(
      `Found ${matches.length} "version" fields in ${path}; refusing to guess which one ships. ` +
        'Update this script to target the right one.',
    );
  }

  return { text, version: text.match(VERSION_LINE)[2] };
}

function bump(version, level) {
  const [major, minor, patch] = version.split('.').map(Number);

  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function write(path, text, next, dryRun) {
  const updated = text.replace(VERSION_LINE, `$1${next}$3`);
  if (!dryRun) writeFileSync(path, updated, 'utf8');
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const level = args.find((arg) => !arg.startsWith('-')) ?? 'minor';

if (!LEVELS.includes(level)) {
  fail(`Unknown bump level "${level}". Expected one of: ${LEVELS.join(', ')}.`);
}

// app.json is the source of truth: it is the file EAS reads at build time, and
// the only one whose value reaches a user. package.json is dragged along to the
// same value rather than bumped independently — the two have already drifted
// apart once (app.json 1.1.0 against package.json 1.0.0), and a version that
// depends on which file you opened is worse than no version at all.
const app = readVersion(APP_JSON);
const pkg = readVersion(PACKAGE_JSON);
const next = bump(app.version, level);

write(APP_JSON, app.text, next, dryRun);
write(PACKAGE_JSON, pkg.text, next, dryRun);

console.log(`[bump-version] ${level}: ${app.version} -> ${next}${dryRun ? ' (dry run)' : ''}`);
if (pkg.version !== app.version) {
  console.log(
    `[bump-version] package.json was out of sync at ${pkg.version}; realigned to ${next}`,
  );
}

// Hand the numbers to the workflow so it can build the commit message and tag
// without re-parsing app.json.
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `previous=${app.version}\nversion=${next}\ntag=v${next}\n`,
  );
}
