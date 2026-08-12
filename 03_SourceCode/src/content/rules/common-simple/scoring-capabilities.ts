import {
  contextMatchExtraScoringCalculator,
  createExtraScoringCalculatorRegistry,
  tileGroupCountExtraScoringCalculator,
} from '../../../domain/engine/scoring/cap-and-extras';
import {
  additiveScoringStrategy,
  createScoringStrategyRegistry,
} from '../../../domain/engine/scoring/scoring-strategy';

export const commonSimpleScoringStrategyRegistry = createScoringStrategyRegistry([
  additiveScoringStrategy,
]);

export const commonSimpleExtraScoringCalculatorRegistry = createExtraScoringCalculatorRegistry([
  contextMatchExtraScoringCalculator,
  tileGroupCountExtraScoringCalculator,
]);
