import {
  EDITOR_HEARTBEAT_MS,
  EDITOR_LEASE_MS,
  type EditorLockPort,
} from '../../application/persistence/draft-controller';

type Lease = Readonly<{ owner: string; term: number; expiresAt: number }>;
type Message = Lease & Readonly<{ kind: 'probe' | 'claim' | 'heartbeat' | 'release' }>;
function parseMessage(value: unknown): Message | null {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('kind' in value) ||
    !('owner' in value) ||
    !('term' in value) ||
    !('expiresAt' in value)
  )
    return null;
  if (
    !['probe', 'claim', 'heartbeat', 'release'].some((kind) => kind === value.kind) ||
    typeof value.owner !== 'string' ||
    value.owner.length > 128 ||
    typeof value.term !== 'number' ||
    !Number.isSafeInteger(value.term) ||
    value.term < 0 ||
    typeof value.expiresAt !== 'number' ||
    !Number.isSafeInteger(value.expiresAt)
  )
    return null;
  const kind = value.kind;
  if (kind !== 'probe' && kind !== 'claim' && kind !== 'heartbeat' && kind !== 'release')
    return null;
  return { kind, owner: value.owner, term: value.term, expiresAt: value.expiresAt };
}

// Secondary coordination when Web Locks is missing. This does not replace the atomic
// IndexedDB fence. With unavailable IDB it coordinates isolated, non-persisting editors.
export function createBroadcastEditorLock(): EditorLockPort | undefined {
  let channel: BroadcastChannel;
  try {
    channel = new BroadcastChannel('mahjong-calculator-editor-lease');
  } catch {
    return undefined;
  }
  const owner = crypto.randomUUID();
  let held = false;
  let candidate = false;
  let term = 0;
  let observedTerm = 0;
  let leader: Lease | null = null;
  let onLost = () => {};
  let generation = 0;
  const alive = () => leader !== null && leader.expiresAt > Date.now();
  const outranks = (a: Lease, b: Lease) =>
    a.term > b.term || (a.term === b.term && a.owner > b.owner);
  const send = (kind: Message['kind']) => {
    try {
      channel.postMessage({
        kind,
        owner,
        term,
        expiresAt: Date.now() + EDITOR_LEASE_MS,
      } satisfies Message);
    } catch {
      held = false;
      candidate = false;
      onLost();
    }
  };
  channel.onmessage = (event: MessageEvent<unknown>) => {
    const message = parseMessage(event.data);
    if (message === null || message.owner === owner) return;
    if (message.kind === 'probe') {
      if (held || candidate) send('heartbeat');
      return;
    }
    if (message.kind === 'release') {
      if (leader?.owner === message.owner && leader.term === message.term) leader = null;
      return;
    }
    if (message.expiresAt <= Date.now() || message.expiresAt > Date.now() + EDITOR_LEASE_MS * 2)
      return;
    observedTerm = Math.max(observedTerm, message.term);
    const own: Lease = { owner, term, expiresAt: Date.now() + EDITOR_LEASE_MS };
    if ((held || candidate) && !outranks(message, own)) {
      send('heartbeat');
      return;
    }
    if (!alive() || leader === null || outranks(message, leader) || message.owner === leader.owner)
      leader = message;
    if ((held || candidate) && outranks(message, own)) {
      const wasHeld = held;
      held = false;
      candidate = false;
      if (wasHeld) onLost();
    }
  };
  const heartbeat = setInterval(() => {
    if (held) send('heartbeat');
  }, EDITOR_HEARTBEAT_MS);
  const release = () => {
    generation++;
    if (held || candidate) send('release');
    held = false;
    candidate = false;
  };
  return {
    isHeld: () => held,
    async claim(force, lost) {
      if (held && !force) return true;
      onLost = lost;
      const request = ++generation;
      // Bounded discovery/election windows are protocol steps, not waits used by tests.
      send('probe');
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (request !== generation || (!force && alive())) return false;
      term = Math.max(term, observedTerm) + 1;
      candidate = true;
      send('claim');
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (request !== generation || !candidate) return false;
      candidate = false;
      held = true;
      leader = null;
      send('heartbeat');
      return held;
    },
    release,
    close() {
      release();
      clearInterval(heartbeat);
      channel.close();
    },
  };
}
