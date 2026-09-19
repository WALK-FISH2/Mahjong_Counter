import { createAppStore } from '../state/create-app-store';
import {
  createInitialCalculatorDocument,
  type CalculatorStore,
} from '../calculator/calculator-store';
import { createCalculatorDocument, type CalculatorDocument } from '../../domain/mahjong';
import type { DraftContent, DraftRecord } from './persistence-models';
import { DraftOwnershipError, type DraftRepository } from './draft-repository';
import type { RuleRepository } from '../rules/rule-repository';
import type { SavedExampleService } from '../examples/saved-example-service';
import { persistCalculator, restoreCalculator } from '../examples/saved-example-snapshot';
import type { StorageCapability } from './storage-capability';
import type { CommandHistory } from './command-history';

export interface EditorSignalPort {
  publish(message: 'changed' | 'yield'): void;
  subscribe(listener: (message: 'changed' | 'yield') => void): () => void;
  close(): void;
}
export interface EditorLockPort {
  claim(force: boolean, onLost: () => void): Promise<boolean>;
  release(): void;
  isHeld(): boolean;
  close?(): void;
}
export type DraftSession = Readonly<{
  role: 'starting' | 'primary' | 'read-only';
  pending: DraftRecord | null;
  savedAt: string | null;
  error: string | null;
}>;
export const EDITOR_LEASE_MS = 6000;
export const EDITOR_HEARTBEAT_MS = 1500;

export function createDraftController(
  input: Readonly<{
    calculator: CalculatorStore;
    repository: DraftRepository;
    rules: RuleRepository;
    examples: SavedExampleService;
    storage: StorageCapability;
    history: CommandHistory;
    owner: string;
    id: () => string;
    now: () => number;
    signal: EditorSignalPort;
    lock?: EditorLockPort;
  }>,
) {
  const state = createAppStore<DraftSession>(() => ({
    role: 'starting',
    pending: null,
    savedAt: null,
    error: null,
  }));
  let leaseToken = input.id();
  let current: DraftRecord | null = null;
  let restoring = false;
  let disposed = false;
  let suspended = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queue: Promise<void> = Promise.resolve();
  let checking = false;
  let transferring = false;
  let claimAfter = 0;
  let validUntil = 0;
  const capture = (): DraftContent => ({
    calculator: persistCalculator(input.calculator.getState().document),
    editingMeldId: input.calculator.getState().editingMeldId,
    editingOrigin: input.examples.session.getState().editingOriginal,
  });
  const makeRecord = (content = capture()): DraftRecord => ({
    ...content,
    key: 'current',
    formatVersion: 1,
    savedAt: new Date(input.now()).toISOString(),
    writeToken: input.id(),
    lease: null,
  });
  const canEdit = () =>
    restoring ||
    (!suspended &&
      state.getState().role === 'primary' &&
      state.getState().pending === null &&
      (input.lock?.isHeld() ?? true) &&
      (input.storage.state.getState().mode === 'temporary' || input.now() < validUntil));
  let lastContent = capture();
  let trackedDocument = input.calculator.getState().document;
  function loseOwnership() {
    clearTimeout(timer);
    input.calculator.getState().cancelAnalysis();
    state.setState({ role: 'read-only', error: 'EDITOR_READ_ONLY' });
  }
  function enterTemporaryMode() {
    clearTimeout(timer);
    state.setState({
      pending: null,
      role: (input.lock?.isHeld() ?? true) ? 'primary' : 'read-only',
      savedAt: null,
    });
  }
  // Failures in Saved/Trash operations share this capability too, not just Draft writes.
  const unsubscribeStorage = input.storage.state.subscribe((next, previous) => {
    if (next.mode === 'temporary' && previous.mode !== 'temporary') enterTemporaryMode();
  });
  function failure(error: unknown) {
    if (error instanceof DraftOwnershipError) {
      loseOwnership();
      return;
    }
    input.storage.fail(error);
    state.setState({ error: error instanceof Error ? error.message : 'STORAGE_UNAVAILABLE' });
    if (input.storage.state.getState().mode === 'temporary') enterTemporaryMode();
  }
  async function acquire(force = false): Promise<void> {
    if (input.lock !== undefined && !(await input.lock.claim(force, loseOwnership))) {
      state.setState({ role: 'read-only' });
      return;
    }
    if (input.storage.state.getState().mode === 'temporary') {
      state.setState({ role: 'primary', pending: null });
      return;
    }
    leaseToken = input.id();
    const claimed = await input.repository.claim(
      makeRecord(),
      input.owner,
      leaseToken,
      input.now(),
      EDITOR_LEASE_MS,
      force,
    );
    current = claimed.record;
    validUntil = claimed.acquired ? input.now() + EDITOR_LEASE_MS : 0;
    state.setState({
      role: claimed.acquired ? 'primary' : 'read-only',
      pending: claimed.created ? null : claimed.record,
      savedAt: claimed.record.savedAt,
      error: null,
    });
    input.signal.publish('changed');
  }
  function flush(content = capture()): Promise<void> {
    clearTimeout(timer);
    if (disposed || restoring || !canEdit() || input.storage.state.getState().mode !== 'persistent')
      return queue;
    const tokenAtRequest = leaseToken;
    queue = queue.then(async () => {
      if (disposed || !canEdit() || tokenAtRequest !== leaseToken || current === null) return;
      if (
        JSON.stringify(content) ===
        JSON.stringify({
          calculator: current.calculator,
          editingMeldId: current.editingMeldId,
          editingOrigin: current.editingOrigin,
        })
      ) {
        state.setState({ savedAt: current.savedAt });
        return;
      }
      const next = makeRecord(content);
      try {
        await input.repository.write(
          next,
          input.owner,
          tokenAtRequest,
          current.writeToken,
          input.now(),
        );
        current = { ...next, lease: current.lease };
        state.setState({ savedAt: next.savedAt, error: null });
        input.signal.publish('changed');
      } catch (error) {
        failure(error);
      }
    });
    return queue;
  }
  function dirty() {
    if (!canEdit() || restoring || disposed) return;
    state.setState({ savedAt: null });
    clearTimeout(timer);
    timer = setTimeout(() => {
      void flush();
    }, 500);
  }
  const unsubscribeDocument = input.calculator.subscribe((next, previous) => {
    if (next.document === previous.document && next.editingMeldId === previous.editingMeldId)
      return;
    if (next.documentEpoch !== previous.documentEpoch && !restoring) {
      // Retain best-effort capture for internal replacements; public entries protect before commit.
      void flush(lastContent);
    }
    lastContent = capture();
    trackedDocument = next.document;
    dirty();
  });
  const unsubscribeSession = input.examples.session.subscribe((next, previous) => {
    if (next.editingOriginal !== previous.editingOriginal) {
      if (trackedDocument === input.calculator.getState().document) lastContent = capture();
      dirty();
    }
  });
  async function check(): Promise<void> {
    if (disposed || suspended || checking || transferring) return;
    checking = true;
    try {
      if (state.getState().role !== 'primary' && input.now() < claimAfter) return;
      if (input.storage.state.getState().mode === 'temporary') {
        if (state.getState().role !== 'primary') await acquire();
        return;
      }
      if (state.getState().role === 'primary') {
        const tokenAtCheck = leaseToken;
        const renewed = await input.repository.renew(
          input.owner,
          tokenAtCheck,
          input.now(),
          EDITOR_LEASE_MS,
        );
        if (tokenAtCheck !== leaseToken) return;
        if (!renewed) loseOwnership();
        else validUntil = input.now() + EDITOR_LEASE_MS;
      } else {
        const latest = await input.repository.read();
        // A poll already in flight must not acquire alongside an explicit takeover.
        if (transferring || disposed) return;
        if (latest?.lease === null || latest === null || latest.lease.expiresAt <= input.now())
          await acquire();
      }
    } catch (error) {
      failure(error);
    } finally {
      checking = false;
    }
  }
  const unsubscribeSignal = input.signal.subscribe((message) => {
    if (message === 'yield' && state.getState().role === 'primary') {
      claimAfter = input.now() + EDITOR_LEASE_MS;
      void flush()
        .then(async () => {
          loseOwnership();
          input.lock?.release();
          if (input.storage.state.getState().mode === 'persistent')
            await input.repository.release(input.owner, leaseToken);
          input.signal.publish('changed');
        })
        .catch(failure);
    } else void check();
  });
  const heartbeat = setInterval(() => {
    void check();
  }, EDITOR_HEARTBEAT_MS);
  async function continueDraft(): Promise<boolean> {
    const pending = state.getState().pending;
    if (
      pending === null ||
      state.getState().role !== 'primary' ||
      input.storage.state.getState().mode !== 'persistent'
    )
      return false;
    try {
      const rule =
        pending.editingOrigin === null
          ? await input.rules.getInstalledRule(pending.calculator.ruleRef)
          : await input.examples.resolveHistoricalRule(pending.editingOrigin);
      if (!(await input.repository.renew(input.owner, leaseToken, input.now(), EDITOR_LEASE_MS))) {
        loseOwnership();
        return false;
      }
      restoring = true;
      input.history.withoutHistory(() => {
        input.calculator.getState().restoreEditor(
          rule,
          createCalculatorDocument({
            ...restoreCalculator(pending.calculator),
            revision:
              Math.max(input.calculator.getState().document.revision, pending.calculator.revision) +
              1,
          }),
          pending.editingMeldId,
        );
        input.examples.restoreEditingOrigin(pending.editingOrigin);
      });
      state.setState({ pending: null, error: null });
      return true;
    } catch (error) {
      failure(error);
      return false;
    } finally {
      restoring = false;
      if (state.getState().pending === null) dirty();
    }
  }
  return {
    state,
    canEdit,
    flush,
    async protectCurrentDraft(this: void, document: CalculatorDocument) {
      input.storage.requirePersistence();
      if (!canEdit() || document !== input.calculator.getState().document)
        throw new DraftOwnershipError();
      const content = capture();
      await flush(content);
      input.storage.requirePersistence();
      // A skipped, failed, superseded or late write is not successful protection.
      if (
        !canEdit() ||
        document !== input.calculator.getState().document ||
        current === null ||
        JSON.stringify(current.calculator) !== JSON.stringify(content.calculator) ||
        JSON.stringify(current.editingOrigin) !== JSON.stringify(content.editingOrigin) ||
        current.editingMeldId !== content.editingMeldId
      )
        throw new DraftOwnershipError();
      if (!(await input.repository.renew(input.owner, leaseToken, input.now(), EDITOR_LEASE_MS))) {
        loseOwnership();
        throw new DraftOwnershipError();
      }
    },
    async suspend(this: void) {
      suspended = true;
      clearTimeout(timer);
      await queue;
    },
    resume(this: void) {
      suspended = false;
    },
    clearFence() {
      if (current === null) throw new DraftOwnershipError();
      const blank = makeRecord({
        calculator: persistCalculator(
          createInitialCalculatorDocument(input.calculator.getState().rulePackage),
        ),
        editingMeldId: null,
        editingOrigin: null,
      });
      return { owner: input.owner, token: leaseToken, blank: { ...blank, lease: current.lease } };
    },
    async resetAfterClear(this: void) {
      current = null;
      restoring = true;
      try {
        input.history.withoutHistory(() => {
          const value = input.calculator.getState();
          value.restoreEditor(
            value.rulePackage,
            createInitialCalculatorDocument(value.rulePackage),
            null,
          );
          input.examples.restoreEditingOrigin(null);
        });
      } finally {
        restoring = false;
        suspended = false;
      }
      await acquire();
      state.setState({ pending: null });
    },
    check,
    async start() {
      try {
        await acquire();
      } catch (error) {
        failure(error);
      }
    },
    continueDraft,
    async newDraft() {
      if (state.getState().role !== 'primary') return false;
      restoring = true;
      try {
        input.history.withoutHistory(() => {
          const previous = input.calculator.getState();
          previous.restoreEditor(
            previous.rulePackage,
            createCalculatorDocument({
              ...createInitialCalculatorDocument(previous.rulePackage),
              revision: previous.document.revision + 1,
            }),
            null,
          );
          input.examples.restoreEditingOrigin(null);
        });
        state.setState({ pending: null });
      } finally {
        restoring = false;
      }
      await flush();
      return true;
    },
    async takeover() {
      if (transferring) return;
      transferring = true;
      claimAfter = 0;
      state.setState({ role: 'starting' });
      input.signal.publish('yield');
      try {
        // Allow a live owner to flush; an unresponsive owner cannot keep the lease forever.
        await new Promise((resolve) => setTimeout(resolve, 200));
        await acquire(true);
      } catch (error) {
        failure(error);
      } finally {
        transferring = false;
      }
    },
    async recheckStorage() {
      const success = await input.storage.recheck(() => input.repository.probe(makeRecord()));
      if (success) {
        try {
          await acquire();
        } catch (error) {
          failure(error);
        }
      }
    },
    async leave() {
      await flush();
      input.lock?.release();
      try {
        await input.repository.release(input.owner, leaseToken);
      } catch {
        /* Lease expires after abrupt closure. */
      }
      loseOwnership();
    },
    async dispose(release = true) {
      if (release) await flush();
      disposed = true;
      clearTimeout(timer);
      clearInterval(heartbeat);
      unsubscribeDocument();
      unsubscribeSession();
      unsubscribeStorage();
      unsubscribeSignal();
      input.signal.close();
      input.lock?.release();
      input.lock?.close?.();
      if (release) {
        try {
          await input.repository.release(input.owner, leaseToken);
        } catch {
          /* Expiration is the crash fallback. */
        }
      }
    },
  };
}
export type DraftController = ReturnType<typeof createDraftController>;
