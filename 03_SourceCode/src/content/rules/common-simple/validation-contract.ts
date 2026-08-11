import type { BuildTimeRuleValidationContract } from '../../../infrastructure/rule-validation/build-time-rule-validator';

export const COMMON_SIMPLE_VALIDATION_CONTRACT = {
  structureMappings: [
    { specKey: 'standard', structureKey: 'standard-meld-pair' },
    { specKey: 'sevenPairs', structureKey: 'seven-pairs' },
    { specKey: 'thirteenOrphans', structureKey: 'thirteen-orphans' },
    {
      specKey: 'greaterHonorsAndKnittedTiles',
      structureKey: 'seven-star-unrelated',
    },
    { specKey: 'lesserHonorsAndKnittedTiles', structureKey: 'all-unrelated' },
    { specKey: 'knittedStraight', structureKey: 'knitted-straight' },
  ],
  scoringStrategyKey: 'scoring.additive',
  selfDrawExtraId: 'selfDraw',
  flowerExtraId: 'flowers',
  forbiddenPlatformKeys: [
    'dealerMultiplier',
    'roomMultiplier',
    'postWinReveal',
    'payment',
    'payout',
  ],
} as const satisfies BuildTimeRuleValidationContract;
