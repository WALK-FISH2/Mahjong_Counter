import type { RuleRef } from '../../domain/mahjong/calculator-document';
import type { WaitSortMode } from '../ready-analysis';
import type { AppStore } from '../state/create-app-store';

export type TestingRuleConfirmation = Readonly<{
  ruleRef: RuleRef;
  resultImpactVersion: string;
}>;

export type CalculatorPreferences = Readonly<{
  theme: 'system' | 'light' | 'dark';
  motion: 'system' | 'reduced' | 'full';
  defaultCopyFormat: 'concise' | 'detailed';
  autoUpdateCheckEnabled: boolean;
  lastUpdateCheckAt: string | null;
  pwaPromptState: 'unseen' | 'dismissed' | 'accepted';
  lastRuleRef: RuleRef | null;
  recentRuleRefs: readonly RuleRef[];
  ruleNoticeSeen: boolean;
  inputGuideSeen: boolean;
  waitSortMode: WaitSortMode;
  testingRuleConfirmations: Readonly<Record<string, TestingRuleConfirmation>>;
}>;

export interface CalculatorPreferencesPort {
  read(): Promise<CalculatorPreferences>;
  write(preferences: CalculatorPreferences): Promise<void>;
}
export interface ManagedCalculatorPreferencesPort extends CalculatorPreferencesPort {
  readonly state: AppStore<{ preferences: CalculatorPreferences; warning: string | null }>;
  reset(): void;
}

export const DEFAULT_CALCULATOR_PREFERENCES: CalculatorPreferences = Object.freeze({
  theme: 'system',
  motion: 'system',
  defaultCopyFormat: 'concise',
  autoUpdateCheckEnabled: true,
  lastUpdateCheckAt: null,
  pwaPromptState: 'unseen',
  lastRuleRef: null,
  recentRuleRefs: Object.freeze([]),
  ruleNoticeSeen: false,
  inputGuideSeen: false,
  waitSortMode: 'highest-score',
  testingRuleConfirmations: Object.freeze({}),
});

function cloneRuleRef(ruleRef: RuleRef): RuleRef {
  return Object.freeze({ ruleId: ruleRef.ruleId, ruleVersion: ruleRef.ruleVersion });
}

export function cloneCalculatorPreferences(
  preferences: CalculatorPreferences,
): CalculatorPreferences {
  return Object.freeze({
    theme: preferences.theme,
    motion: preferences.motion,
    defaultCopyFormat: preferences.defaultCopyFormat,
    autoUpdateCheckEnabled: preferences.autoUpdateCheckEnabled,
    lastUpdateCheckAt: preferences.lastUpdateCheckAt,
    pwaPromptState: preferences.pwaPromptState,
    lastRuleRef: preferences.lastRuleRef === null ? null : cloneRuleRef(preferences.lastRuleRef),
    recentRuleRefs: Object.freeze(preferences.recentRuleRefs.map(cloneRuleRef)),
    ruleNoticeSeen: preferences.ruleNoticeSeen,
    inputGuideSeen: preferences.inputGuideSeen,
    waitSortMode: preferences.waitSortMode,
    testingRuleConfirmations: Object.freeze(
      Object.fromEntries(
        Object.entries(preferences.testingRuleConfirmations).map(([key, confirmation]) => [
          key,
          Object.freeze({
            ruleRef: cloneRuleRef(confirmation.ruleRef),
            resultImpactVersion: confirmation.resultImpactVersion,
          }),
        ]),
      ),
    ),
  });
}

export class InMemoryCalculatorPreferencesPort implements CalculatorPreferencesPort {
  #preferences: CalculatorPreferences;

  constructor(initial: CalculatorPreferences = DEFAULT_CALCULATOR_PREFERENCES) {
    this.#preferences = cloneCalculatorPreferences(initial);
  }

  read(): Promise<CalculatorPreferences> {
    return Promise.resolve(cloneCalculatorPreferences(this.#preferences));
  }

  write(preferences: CalculatorPreferences): Promise<void> {
    this.#preferences = cloneCalculatorPreferences(preferences);
    return Promise.resolve();
  }
}

export function ruleRefKey(ruleRef: RuleRef): string {
  return `${ruleRef.ruleId}@${ruleRef.ruleVersion}`;
}

export async function updateCalculatorPreferences(
  port: CalculatorPreferencesPort,
  update: (current: CalculatorPreferences) => CalculatorPreferences,
): Promise<CalculatorPreferences> {
  const next = cloneCalculatorPreferences(update(await port.read()));
  await port.write(next);
  return next;
}

export async function recordRecentlyUsedRule(
  port: CalculatorPreferencesPort,
  ruleRef: RuleRef,
  maximumRecentRules = 5,
): Promise<CalculatorPreferences> {
  return updateCalculatorPreferences(port, (current) => ({
    ...current,
    lastRuleRef: ruleRef,
    recentRuleRefs: [
      ruleRef,
      ...current.recentRuleRefs.filter(
        (candidate) =>
          candidate.ruleId !== ruleRef.ruleId || candidate.ruleVersion !== ruleRef.ruleVersion,
      ),
    ].slice(0, maximumRecentRules),
  }));
}

export async function consumeOnboarding(
  port: CalculatorPreferencesPort,
): Promise<Readonly<{ showRuleNotice: boolean; showInputGuide: boolean }>> {
  const current = await port.read();
  const result = Object.freeze({
    showRuleNotice: !current.ruleNoticeSeen,
    showInputGuide: !current.inputGuideSeen,
  });

  if (result.showRuleNotice || result.showInputGuide) {
    await port.write({
      ...current,
      ruleNoticeSeen: true,
      inputGuideSeen: true,
    });
  }

  return result;
}

export function replayOnboarding(port: CalculatorPreferencesPort): Promise<CalculatorPreferences> {
  return updateCalculatorPreferences(port, (current) => ({
    ...current,
    ruleNoticeSeen: false,
    inputGuideSeen: false,
  }));
}

export function setWaitSortMode(
  port: CalculatorPreferencesPort,
  waitSortMode: WaitSortMode,
): Promise<CalculatorPreferences> {
  return updateCalculatorPreferences(port, (current) => ({ ...current, waitSortMode }));
}
