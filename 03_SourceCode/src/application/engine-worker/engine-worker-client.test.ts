import { describe, expect, it, vi } from 'vitest';

import { commonSimpleRulePackage } from '../../content/rules/common-simple/parsed-rule-package';
import { createCalculatorDocument } from '../../domain/mahjong/calculator-document';
import { createWinContext } from '../../domain/mahjong/context';
import { createHandSnapshot } from '../../domain/mahjong/hand';
import { createEngineWorkerRequest, type EngineWorkerResponse } from './engine-worker-protocol';
import {
  EngineRequestCancelledError,
  EngineWorkerClient,
  StaleEngineResponseError,
  type EngineWorkerPort,
  type WorkerMessageEvent,
} from './engine-worker-client';

class FakeWorkerPort implements EngineWorkerPort {
  readonly posted: Parameters<EngineWorkerPort['postMessage']>[0][] = [];
  readonly terminate = vi.fn();
  #listener: ((event: WorkerMessageEvent) => void) | undefined;

  postMessage(message: Parameters<EngineWorkerPort['postMessage']>[0]): void {
    this.posted.push(message);
  }

  addEventListener(_type: 'message', listener: (event: WorkerMessageEvent) => void): void {
    this.#listener = listener;
  }

  removeEventListener(_type: 'message', listener: (event: WorkerMessageEvent) => void): void {
    if (this.#listener === listener) this.#listener = undefined;
  }

  respond(response: EngineWorkerResponse): void {
    this.#listener?.({ data: response });
  }
}

function request(revision = 0) {
  const document = createCalculatorDocument({
    schemaVersion: 1,
    ruleRef: { ruleId: 'common-simple', ruleVersion: '1.0.0' },
    hand: createHandSnapshot(),
    context: createWinContext(),
    revision,
  });
  return createEngineWorkerRequest({
    engineVersion: 'test-engine',
    requestId: `request-${revision}`,
    operation: 'evaluate',
    document,
    rule: commonSimpleRulePackage,
  });
}

function success(target: ReturnType<typeof request>): EngineWorkerResponse {
  return {
    protocolVersion: target.protocolVersion,
    engineVersion: target.engineVersion,
    requestId: target.requestId,
    documentRevision: target.documentRevision,
    operation: 'evaluate',
    status: 'success',
    result: {
      status: 'not-winning',
      ruleRef: target.document.ruleRef,
      candidates: [],
      highestLegalCandidateIds: [],
      selectedCandidateId: null,
      structure: { decompositions: [], unsupportedStructures: [], unavailableCapabilities: [] },
    },
  };
}

describe('EngineWorkerClient', () => {
  it('posts asynchronously so the caller remains responsive', async () => {
    const port = new FakeWorkerPort();
    const client = new EngineWorkerClient(() => port);
    const target = request();
    let callerProgressed = false;
    const pending = client
      .execute(target, () => 0)
      .then(() => {
        expect(callerProgressed).toBe(true);
      });
    callerProgressed = true;
    port.respond(success(target));
    await pending;
  });

  it('accepts the newest response and discards an older response that arrives later', async () => {
    const port = new FakeWorkerPort();
    const client = new EngineWorkerClient(() => port);
    const older = request(4);
    const newest = request(5);
    let currentRevision = 4;
    const olderPending = client.execute(older, () => currentRevision);
    currentRevision = 5;
    const newestPending = client.execute(newest, () => currentRevision);

    port.respond(success(newest));
    await expect(newestPending).resolves.toMatchObject({ documentRevision: 5 });
    port.respond(success(older));

    await expect(olderPending).rejects.toBeInstanceOf(StaleEngineResponseError);
  });

  it('cancels pending work, terminates the worker, and rebuilds a clean worker', async () => {
    const firstPort = new FakeWorkerPort();
    const ports = [firstPort, new FakeWorkerPort()];
    const client = new EngineWorkerClient(() => ports.shift()!);
    const pending = client.execute(request(), () => 0);
    client.cancelAndRebuild();

    await expect(pending).rejects.toBeInstanceOf(EngineRequestCancelledError);
    expect(firstPort.terminate).toHaveBeenCalledOnce();
  });
});
