import type {
  EngineWorkerRequest,
  EngineWorkerResponse,
  EngineWorkerSuccess,
} from './engine-worker-protocol';

export type WorkerMessageEvent = Readonly<{ data: EngineWorkerResponse }>;

export type EngineWorkerPort = Readonly<{
  postMessage: (message: EngineWorkerRequest) => void;
  addEventListener: (type: 'message', listener: (event: WorkerMessageEvent) => void) => void;
  removeEventListener: (type: 'message', listener: (event: WorkerMessageEvent) => void) => void;
  terminate: () => void;
}>;

export type EngineWorkerPortFactory = () => EngineWorkerPort;

export class EngineRequestCancelledError extends Error {
  constructor() {
    super('Engine Worker request was cancelled.');
    this.name = 'EngineRequestCancelledError';
  }
}

export class StaleEngineResponseError extends Error {
  constructor() {
    super('Engine Worker response belongs to a stale CalculatorDocument revision.');
    this.name = 'StaleEngineResponseError';
  }
}

export class EngineWorkerExecutionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'EngineWorkerExecutionError';
    this.code = code;
  }
}

type PendingRequest = Readonly<{
  request: EngineWorkerRequest;
  currentDocumentRevision: () => number;
  resolve: (response: EngineWorkerSuccess) => void;
  reject: (error: Error) => void;
}>;

export class EngineWorkerClient {
  readonly #factory: EngineWorkerPortFactory;
  readonly #pending = new Map<string, PendingRequest>();
  #port: EngineWorkerPort | undefined;

  readonly #onMessage = (event: WorkerMessageEvent): void => {
    const response = event.data;
    const pending = this.#pending.get(response.requestId);
    if (pending === undefined) return;
    this.#pending.delete(response.requestId);

    if (
      response.protocolVersion !== pending.request.protocolVersion ||
      response.engineVersion !== pending.request.engineVersion ||
      response.operation !== pending.request.operation ||
      response.documentRevision !== pending.request.documentRevision ||
      response.documentRevision !== pending.currentDocumentRevision()
    ) {
      pending.reject(new StaleEngineResponseError());
      return;
    }
    if (response.status === 'error') {
      pending.reject(new EngineWorkerExecutionError(response.error.code, response.error.message));
      return;
    }
    pending.resolve(response);
  };

  constructor(factory: EngineWorkerPortFactory) {
    this.#factory = factory;
  }

  #createPort(): EngineWorkerPort {
    const port = this.#factory();
    port.addEventListener('message', this.#onMessage);
    return port;
  }

  execute(
    request: EngineWorkerRequest,
    currentDocumentRevision: () => number,
  ): Promise<EngineWorkerSuccess> {
    if (this.#pending.has(request.requestId)) {
      return Promise.reject(new Error(`Duplicate Engine Worker requestId: ${request.requestId}`));
    }

    return new Promise((resolve, reject) => {
      this.#pending.set(
        request.requestId,
        Object.freeze({ request, currentDocumentRevision, resolve, reject }),
      );
      this.#port ??= this.#createPort();
      this.#port.postMessage(request);
    });
  }

  cancelAndRebuild(): void {
    this.#port?.removeEventListener('message', this.#onMessage);
    this.#port?.terminate();
    this.#pending.forEach(({ reject }) => reject(new EngineRequestCancelledError()));
    this.#pending.clear();
    this.#port = this.#createPort();
  }

  dispose(): void {
    this.#port?.removeEventListener('message', this.#onMessage);
    this.#port?.terminate();
    this.#port = undefined;
    this.#pending.forEach(({ reject }) => reject(new EngineRequestCancelledError()));
    this.#pending.clear();
  }
}
