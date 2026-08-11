import type { z } from 'zod';

import type { RulePackageDefinition } from '../../domain/rules/rule-package';
import { contextDefinitionsSchema } from './context-definition-schema';
import { encyclopediaDefinitionSchema } from './encyclopedia-definition-schema';
import { handModelDefinitionSchema } from './hand-model-schema';
import { legalityDefinitionSchema } from './legality-definition-schema';
import { patternDefinitionsSchema } from './pattern-definition-schema';
import { patternRelationDefinitionsSchema } from './pattern-relation-schema';
import { ruleManifestSchema } from './rule-manifest-schema';
import { createRulePackageSchema } from './rule-package-schema';
import { ruleSourceDefinitionsSchema } from './rule-source-schema';
import { scoringDefinitionSchema } from './scoring-definition-schema';
import { structureDefinitionsSchema } from './structure-definition-schema';
import { temporaryAdjustmentDefinitionsSchema } from './temporary-adjustment-definition-schema';
import { tileSetDefinitionSchema } from './tile-set-schema';

export const rulePackageDefinitionSchema = createRulePackageSchema({
  manifest: ruleManifestSchema,
  tileSet: tileSetDefinitionSchema,
  handModel: handModelDefinitionSchema,
  structures: structureDefinitionsSchema,
  contexts: contextDefinitionsSchema,
  patterns: patternDefinitionsSchema,
  relations: patternRelationDefinitionsSchema,
  scoring: scoringDefinitionSchema,
  legality: legalityDefinitionSchema,
  temporaryAdjustments: temporaryAdjustmentDefinitionsSchema,
  encyclopedia: encyclopediaDefinitionSchema,
  sources: ruleSourceDefinitionsSchema,
}) satisfies z.ZodType<RulePackageDefinition>;

export function parseRulePackageDefinition(input: unknown): RulePackageDefinition {
  return rulePackageDefinitionSchema.parse(input);
}
