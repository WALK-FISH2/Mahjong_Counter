export type WinMode = 'discard' | 'self-draw';
export type KnownContextPrimitive = boolean | number | string;

export type UnknownContextValue = Readonly<{
  status: 'unknown';
}>;

export type KnownContextValue = Readonly<{
  status: 'known';
  value: KnownContextPrimitive;
}>;

export type ContextValue = UnknownContextValue | KnownContextValue;

export type WinContext = Readonly<{
  mode: WinMode;
  values: Readonly<Record<string, ContextValue>>;
}>;

export const UNKNOWN_CONTEXT_VALUE: UnknownContextValue = Object.freeze({ status: 'unknown' });

export function knownContextValue(value: KnownContextPrimitive): KnownContextValue {
  return Object.freeze({ status: 'known', value });
}

export function createWinContext(
  mode: WinMode = 'discard',
  values: Readonly<Record<string, ContextValue>> = {},
): WinContext {
  return Object.freeze({ mode, values: Object.freeze({ ...values }) });
}

export function setWinMode(context: WinContext, mode: WinMode): WinContext {
  return createWinContext(mode, context.values);
}

export function setContextValue(
  context: WinContext,
  contextId: string,
  value: ContextValue,
): WinContext {
  return createWinContext(context.mode, { ...context.values, [contextId]: value });
}

export function isKnownContextValue(value: ContextValue): value is KnownContextValue {
  return value.status === 'known';
}
