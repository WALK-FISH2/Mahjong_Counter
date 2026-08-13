import { describe, expect, it } from 'vitest';

import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import {
  createCalculatorDocument,
  createHandSnapshot,
  createWinContext,
} from '../../domain/mahjong';
import {
  createEngineWorkerRequest,
  ENGINE_WORKER_PROTOCOL_VERSION,
} from './engine-worker-protocol';

const document = createCalculatorDocument({
  schemaVersion: 1,
  ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
  hand: createHandSnapshot({ concealed: ['m1'] }),
  context: createWinContext(),
  revision: 7,
});

describe('Engine Worker protocol', () => {
  it.each(['evaluate', 'wait-analysis', 'discard-to-ready'] as const)(
    'round-trips a %s request through structured serialization',
    (operation) => {
      const request = createEngineWorkerRequest({
        engineVersion: 'test-engine',
        requestId: `request-${operation}`,
        operation,
        document,
        rule: commonSimpleRulePackage,
      });

      expect(structuredClone(request)).toEqual(request);
      expect(JSON.parse(JSON.stringify(request))).toEqual(request);
      expect(request).toMatchObject({
        protocolVersion: ENGINE_WORKER_PROTOCOL_VERSION,
        engineVersion: 'test-engine',
        requestId: `request-${operation}`,
        documentRevision: 7,
        operation,
      });
    },
  );
});
