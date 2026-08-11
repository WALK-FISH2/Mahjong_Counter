import { z } from 'zod';

import type { PatternDefinition } from '../../domain/rules/pattern-definition';
import {
  PATTERN_RELATION_RESOLUTIONS,
  type PatternRelationDefinition,
} from '../../domain/rules/pattern-relation';
import { patternDefinitionsSchema } from './pattern-definition-schema';

const MAX_PATTERN_RELATIONS = 4096;
const stableIdSchema = z.string().trim().min(1).max(128);

const uniquePatternIdsSchema = z
  .array(stableIdSchema)
  .min(2)
  .max(2048)
  .superRefine((patternIds, context) => {
    const seen = new Set<string>();
    patternIds.forEach((patternId, index) => {
      if (seen.has(patternId)) {
        context.addIssue({
          code: 'custom',
          message: 'relation pattern IDs must be unique',
          path: [index],
        });
      }
      seen.add(patternId);
    });
  });

const prioritySchema = z
  .array(stableIdSchema)
  .min(2)
  .max(2048)
  .superRefine((priority, context) => {
    const seen = new Set<string>();
    priority.forEach((patternId, index) => {
      if (seen.has(patternId)) {
        context.addIssue({
          code: 'custom',
          message: 'relation priority must be unique',
          path: [index],
        });
      }
      seen.add(patternId);
    });
  });

export const patternRelationDefinitionSchema = z
  .discriminatedUnion('type', [
    z.strictObject({
      type: z.literal('covers'),
      winner: stableIdSchema,
      covered: stableIdSchema,
    }),
    z.strictObject({
      type: z.literal('mutually-exclusive'),
      patterns: uniquePatternIdsSchema,
      resolution: z.enum(PATTERN_RELATION_RESOLUTIONS),
      priority: prioritySchema.optional(),
    }),
    z.strictObject({
      type: z.literal('non-repeat-group'),
      groupId: stableIdSchema,
      patterns: uniquePatternIdsSchema,
      resolution: z.enum(PATTERN_RELATION_RESOLUTIONS),
      priority: prioritySchema.optional(),
    }),
  ])
  .superRefine((relation, context) => {
    if (relation.type === 'covers') {
      if (relation.winner === relation.covered) {
        context.addIssue({
          code: 'custom',
          message: 'a pattern cannot cover itself',
          path: ['covered'],
        });
      }
      return;
    }

    if (relation.resolution === 'explicit-priority' && relation.priority === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'explicit-priority relations require a complete priority list',
        path: ['priority'],
      });
      return;
    }

    if (relation.priority !== undefined) {
      const members = new Set(relation.patterns);
      if (
        relation.priority.length !== relation.patterns.length ||
        relation.priority.some((patternId) => !members.has(patternId))
      ) {
        context.addIssue({
          code: 'custom',
          message: 'relation priority must contain every relation member exactly once',
          path: ['priority'],
        });
      }
    }
  })
  .transform((relation): PatternRelationDefinition => {
    if (relation.type === 'covers') {
      return {
        type: relation.type,
        winner: relation.winner,
        covered: relation.covered,
      };
    }

    if (relation.type === 'mutually-exclusive') {
      return {
        type: relation.type,
        patterns: relation.patterns,
        resolution: relation.resolution,
        ...(relation.priority === undefined ? {} : { priority: relation.priority }),
      };
    }

    return {
      type: relation.type,
      groupId: relation.groupId,
      patterns: relation.patterns,
      resolution: relation.resolution,
      ...(relation.priority === undefined ? {} : { priority: relation.priority }),
    };
  }) satisfies z.ZodType<PatternRelationDefinition>;

function relationIdentity(relation: PatternRelationDefinition): string {
  if (relation.type === 'covers') {
    return `${relation.type}:${relation.winner}:${relation.covered}`;
  }

  const members = [...relation.patterns].sort().join(',');
  const priority = relation.priority?.join(',') ?? '';
  return relation.type === 'mutually-exclusive'
    ? `${relation.type}:${members}:${relation.resolution}:${priority}`
    : `${relation.type}:${relation.groupId}:${members}:${relation.resolution}:${priority}`;
}

export const patternRelationDefinitionsSchema = z
  .array(patternRelationDefinitionSchema)
  .max(MAX_PATTERN_RELATIONS)
  .superRefine((relations, context) => {
    const identities = new Set<string>();
    const nonRepeatGroupIds = new Set<string>();

    relations.forEach((relation, index) => {
      const identity = relationIdentity(relation);
      if (identities.has(identity)) {
        context.addIssue({
          code: 'custom',
          message: 'pattern relations must be unique',
          path: [index],
        });
      }
      identities.add(identity);

      if (relation.type === 'non-repeat-group') {
        if (nonRepeatGroupIds.has(relation.groupId)) {
          context.addIssue({
            code: 'custom',
            message: 'non-repeat group IDs must be unique',
            path: [index, 'groupId'],
          });
        }
        nonRepeatGroupIds.add(relation.groupId);
      }
    });
  });

export type PatternRelationsWithPatterns = Readonly<{
  patterns: readonly PatternDefinition[];
  relations: readonly PatternRelationDefinition[];
}>;

function hasCoversCycle(
  patternIds: ReadonlySet<string>,
  relations: readonly PatternRelationDefinition[],
): boolean {
  const adjacency = new Map<string, string[]>();
  const indegree = new Map([...patternIds].map((patternId) => [patternId, 0]));

  relations.forEach((relation) => {
    if (
      relation.type !== 'covers' ||
      !patternIds.has(relation.winner) ||
      !patternIds.has(relation.covered)
    ) {
      return;
    }

    const coveredPatterns = adjacency.get(relation.winner) ?? [];
    coveredPatterns.push(relation.covered);
    adjacency.set(relation.winner, coveredPatterns);
    indegree.set(relation.covered, (indegree.get(relation.covered) ?? 0) + 1);
  });

  const queue = [...indegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([patternId]) => patternId);
  let visitedCount = 0;

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const patternId = queue[queueIndex];
    if (patternId === undefined) {
      continue;
    }
    visitedCount += 1;

    for (const coveredPatternId of adjacency.get(patternId) ?? []) {
      const nextDegree = (indegree.get(coveredPatternId) ?? 0) - 1;
      indegree.set(coveredPatternId, nextDegree);
      if (nextDegree === 0) {
        queue.push(coveredPatternId);
      }
    }
  }

  return visitedCount !== indegree.size;
}

export const patternRelationsWithPatternsSchema = z
  .strictObject({
    patterns: patternDefinitionsSchema,
    relations: patternRelationDefinitionsSchema,
  })
  .superRefine((catalog, context) => {
    const patternIds = new Set(catalog.patterns.map((pattern) => pattern.patternId));

    catalog.relations.forEach((relation, relationIndex) => {
      const referencedPatternIds =
        relation.type === 'covers' ? [relation.winner, relation.covered] : relation.patterns;

      referencedPatternIds.forEach((patternId) => {
        if (!patternIds.has(patternId)) {
          context.addIssue({
            code: 'custom',
            message: 'relation members must reference declared patterns',
            path: ['relations', relationIndex],
          });
        }
      });
    });

    if (hasCoversCycle(patternIds, catalog.relations)) {
      context.addIssue({
        code: 'custom',
        message: 'covers relations must not contain a directed cycle',
        path: ['relations'],
      });
    }
  }) satisfies z.ZodType<PatternRelationsWithPatterns>;

export function parsePatternRelationsWithPatterns(input: unknown): PatternRelationsWithPatterns {
  return patternRelationsWithPatternsSchema.parse(input);
}
