export type RuleSpecPatternFact = Readonly<{
  patternId: string;
  name: string;
  value: number;
  enabled: boolean;
}>;

export type RuleSpecStructureFacts = Readonly<{
  standard: boolean;
  sevenPairs: boolean;
  thirteenOrphans: boolean;
  greaterHonorsAndKnittedTiles: boolean;
  lesserHonorsAndKnittedTiles: boolean;
  knittedStraight: boolean;
}>;

export type RuleSpecSnapshot = Readonly<{
  ruleId: string;
  ruleVersion: string;
  displayName: string;
  status: 'test' | 'full';
  physicalTileCount: number;
  targetStructuralTileCount: number;
  readyStructuralTileCount: number;
  requiredMeldCount: number;
  structures: RuleSpecStructureFacts;
  minimumFan: number;
  capEnabled: boolean;
  selfDrawFan: number;
  flowerFanPerTile: number;
  totalReferencePatterns: number;
  enabledPatterns: number;
  disabledForCurrentStructureScope: number;
  patterns: readonly RuleSpecPatternFact[];
  sourceIds: readonly string[];
}>;

function requireMatch(text: string, expression: RegExp, label: string): string {
  const value = expression.exec(text)?.[1]?.trim();
  if (value === undefined || value.length === 0) {
    throw new Error(`Rule Spec is missing ${label}.`);
  }
  return value;
}

function requireNumber(text: string, key: string): number {
  const value = Number(requireMatch(text, new RegExp(`^\\s*${key}:\\s*(\\d+)\\s*$`, 'mu'), key));
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Rule Spec ${key} must be a safe integer.`);
  }
  return value;
}

function requireBoolean(text: string, key: string): boolean {
  return requireMatch(text, new RegExp(`^\\s*${key}:\\s*(true|false)\\s*$`, 'mu'), key) === 'true';
}

function parsePatterns(text: string): readonly RuleSpecPatternFact[] {
  const patterns: RuleSpecPatternFact[] = [];
  const patternRow = /^\| `([^`]+)` \| ([^|]+?) \| (\d+)(?:\/张)? \| (是|\*\*否\*\*) \|/gmu;

  for (const match of text.matchAll(patternRow)) {
    const patternId = match[1];
    const name = match[2];
    const rawValue = match[3];
    const support = match[4];
    if (
      patternId === undefined ||
      name === undefined ||
      rawValue === undefined ||
      support === undefined
    ) {
      continue;
    }

    patterns.push({
      patternId,
      name: name.trim(),
      value: Number(rawValue),
      enabled: support === '是',
    });
  }

  if (
    patterns.length === 0 ||
    new Set(patterns.map(({ patternId }) => patternId)).size !== patterns.length
  ) {
    throw new Error('Rule Spec pattern catalog is empty or contains duplicate Pattern IDs.');
  }
  return patterns;
}

export function parseRuleSpecSnapshot(markdown: string): RuleSpecSnapshot {
  const summaryStart = markdown.indexOf('# 31. 本版本冻结摘要');
  if (summaryStart < 0) {
    throw new Error('Rule Spec frozen summary is missing.');
  }
  const summary = markdown.slice(summaryStart);
  const sourceIds = [...markdown.matchAll(/^## (SRC-[A-Z]\d{2})\b/gmu)].map((match) => match[1]);
  if (sourceIds.some((sourceId) => sourceId === undefined)) {
    throw new Error('Rule Spec contains an invalid source heading.');
  }

  const testingStatus = /^status:\s*TESTING\s*$/mu.test(markdown);
  const fullySupportedStatus = /^status:\s*FULLY_SUPPORTED\s*$/mu.test(markdown);
  if (testingStatus === fullySupportedStatus) {
    throw new Error('Rule Spec must declare exactly one recognized rule status.');
  }

  return {
    ruleId: requireMatch(markdown, /^\*\*Rule ID:\*\* `([^`]+)`/mu, 'Rule ID'),
    ruleVersion: requireMatch(markdown, /^\*\*Rule Version:\*\* `([^`]+)`/mu, 'Rule Version'),
    displayName: requireMatch(summary, /^displayName:\s*(.+)$/mu, 'displayName'),
    status: testingStatus ? 'test' : 'full',
    physicalTileCount: requireNumber(summary, 'physicalTileCount'),
    targetStructuralTileCount: requireNumber(summary, 'targetStructuralTileCount'),
    readyStructuralTileCount: requireNumber(summary, 'readyStructuralTileCount'),
    requiredMeldCount: requireNumber(summary, 'requiredMeldCount'),
    structures: {
      standard: requireBoolean(summary, 'standard'),
      sevenPairs: requireBoolean(summary, 'sevenPairs'),
      thirteenOrphans: requireBoolean(summary, 'thirteenOrphans'),
      greaterHonorsAndKnittedTiles: requireBoolean(summary, 'greaterHonorsAndKnittedTiles'),
      lesserHonorsAndKnittedTiles: requireBoolean(summary, 'lesserHonorsAndKnittedTiles'),
      knittedStraight: requireBoolean(summary, 'knittedStraight'),
    },
    minimumFan: requireNumber(summary, 'minimumFan'),
    capEnabled: requireBoolean(summary, 'capEnabled'),
    selfDrawFan: requireNumber(summary, 'fan'),
    flowerFanPerTile: requireNumber(summary.slice(summary.indexOf('flower:')), 'fanPerTile'),
    totalReferencePatterns: requireNumber(summary, 'totalReferencePatterns'),
    enabledPatterns: requireNumber(summary, 'enabledPatterns'),
    disabledForCurrentStructureScope: requireNumber(summary, 'disabledForCurrentStructureScope'),
    patterns: parsePatterns(markdown),
    sourceIds: sourceIds as readonly string[],
  };
}
