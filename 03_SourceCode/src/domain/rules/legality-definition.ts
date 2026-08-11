export const MISSING_REQUIRED_CONTEXT_OUTCOMES = ['incomplete-context'] as const;

export type MissingRequiredContextOutcome = (typeof MISSING_REQUIRED_CONTEXT_OUTCOMES)[number];

export type LegalityDefinition = Readonly<{
  minimumFan: number;
  onMissingRequiredContext: MissingRequiredContextOutcome;
}>;
