import { useEffect, useRef, type ReactNode } from 'react';

export function ShareDialog({
  title,
  onClose,
  children,
}: Readonly<{ title: string; onClose: () => void; children: ReactNode }>) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={onClose}
      style={{ maxWidth: 'min(90vw, 48rem)', maxHeight: '85vh', overflow: 'auto' }}
    >
      <h2>{title}</h2>
      {children}
      <button type="button" onClick={onClose}>
        取消
      </button>
    </dialog>
  );
}
