import { Droplets, HeartHandshake, Lock, ShieldCheck, type LucideIcon } from 'lucide-react-native';

import type { Gender } from '@/features/profile/store/profile-store';

/**
 * The private modules.
 *
 * Three rules make these different from everything in the Hub registry, and all
 * three matter:
 *
 *  1. **They are absent, not locked.** A greyed-out "🔒 Cycle" card tells a
 *     snooping partner exactly what is being hidden, which is the thing the
 *     feature exists to prevent. Nothing here renders anywhere until the
 *     private space is unlocked.
 *  2. **`suggestFor` suggests.** It pre-ticks the setup list for somebody who
 *     answered the gender question; it never gates. Every module stays
 *     reachable from "Show everything" regardless of the answer, because the
 *     alternative is an app that tells people their own life doesn't fit.
 *  3. **Their content is stored encrypted**, as blobs (see
 *     private-repository.ts), and sync stays off unless explicitly enabled, at
 *     which point only ciphertext is uploaded. Note this is encryption at rest
 *     and in transit, NOT end-to-end: a build with an operator escrow key can
 *     open any private space (vault-escrow.ts, migration 0015).
 *
 * `recovery` is deliberately one module rather than a "quit masturbating"
 * tracker: the same urge/trigger/streak model serves porn, alcohol, smoking,
 * gambling and vaping, which is more useful code, a far larger audience, and
 * does not put a single embarrassing word in the module list.
 */
export type PrivateModuleId = 'vault' | 'cycle' | 'recovery' | 'intimacy';

export type PrivateModule = {
  id: PrivateModuleId;
  titleKey: string;
  subtitleKey: string;
  icon: LucideIcon;
  tint: string;
  /** Whose setup list this is pre-ticked on. Never an access check. */
  suggestFor: Gender[];
  route: string;
};

export const PRIVATE_MODULES: PrivateModule[] = [
  {
    id: 'vault',
    titleKey: 'private.vaultTitle',
    subtitleKey: 'private.vaultSubtitle',
    icon: Lock,
    tint: '#7c6cf0',
    // The one everybody wants, whoever they are.
    suggestFor: ['female', 'male', 'non_binary', 'prefer_not_to_say'],
    route: '/private/vault',
  },
  {
    id: 'cycle',
    titleKey: 'private.cycleTitle',
    subtitleKey: 'private.cycleSubtitle',
    icon: Droplets,
    tint: '#e0518a',
    suggestFor: ['female'],
    route: '/private/cycle',
  },
  {
    id: 'recovery',
    titleKey: 'private.recoveryTitle',
    subtitleKey: 'private.recoverySubtitle',
    icon: ShieldCheck,
    tint: '#2f9e73',
    suggestFor: ['male'],
    route: '/private/recovery',
  },
  {
    id: 'intimacy',
    titleKey: 'private.intimacyTitle',
    subtitleKey: 'private.intimacySubtitle',
    icon: HeartHandshake,
    tint: '#d4653f',
    suggestFor: ['female', 'male', 'non_binary'],
    route: '/private/intimacy',
  },
];

export function privateModule(id: PrivateModuleId): PrivateModule | undefined {
  return PRIVATE_MODULES.find((m) => m.id === id);
}

/** What to pre-tick on the setup screen. An unanswered gender question suggests
 * only the universal ones rather than guessing. */
export function suggestedFor(gender: Gender | null): PrivateModuleId[] {
  if (!gender) return ['vault'];
  return PRIVATE_MODULES.filter((m) => m.suggestFor.includes(gender)).map((m) => m.id);
}
