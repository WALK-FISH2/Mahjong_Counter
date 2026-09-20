import { useEffect, useRef, useState } from 'react';
import { ShareDialog } from './ShareDialog';

// Non-blocking confirmation keeps lease/takeover and document changes observable.
export function useShareConfirmation() {
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => () => resolver.current?.(false), []);
  const finish = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setMessage(null);
  };
  return {
    confirm: (text: string) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false);
        resolver.current = resolve;
        setMessage(text);
      }),
    dialog:
      message === null ? null : (
        <ShareDialog title="替换当前牌面？" onClose={() => finish(false)}>
          <p>{message}</p>
          <button type="button" onClick={() => finish(true)}>
            确认替换
          </button>
        </ShareDialog>
      ),
  };
}
