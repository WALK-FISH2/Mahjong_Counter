import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { savedErrorMessage } from './saved-error-message';

export function ExampleDialog({
  title,
  children,
  onClose,
}: Readonly<{ title: string; children: ReactNode; onClose: () => void }>) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector<HTMLElement>('input, button')?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  return (
    <div className="saved-dialog-backdrop">
      <div
        ref={ref}
        className="saved-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
          if (event.key !== 'Tab') return;
          const controls = ref.current?.querySelectorAll<HTMLElement>(
            'input:not(:disabled), button:not(:disabled), a[href]',
          );
          const first = controls?.[0];
          const last = controls?.[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          }
          if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function SaveExampleDialog({
  initialName,
  updating,
  onSave,
  onClose,
}: Readonly<{
  initialName: string;
  updating: boolean;
  onSave: (name: string) => Promise<void>;
  onClose: () => void;
}>) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <ExampleDialog
      title={updating ? '更新原记录' : '保存牌例'}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          setBusy(true);
          setError(null);
          void onSave(name).catch((reason: unknown) => {
            setError(savedErrorMessage(reason));
            setBusy(false);
          });
        }}
      >
        <label>
          名称
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={256}
            required
            disabled={busy}
          />
        </label>
        {error !== null && <p role="alert">{error}</p>}
        <div className="saved-actions">
          <button className="primary-action" type="submit" disabled={busy}>
            {busy ? '正在保存…' : updating ? '确认更新原记录' : '确认保存'}
          </button>
          <button className="secondary-action" type="button" disabled={busy} onClick={onClose}>
            取消
          </button>
        </div>
      </form>
    </ExampleDialog>
  );
}
