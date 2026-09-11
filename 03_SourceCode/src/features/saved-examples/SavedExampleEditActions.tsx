import { useState } from 'react';
import { useStore } from 'zustand';
import { useNavigate } from 'react-router-dom';
import {
  canSaveExample,
  defaultExampleName,
  type SavedExampleService,
} from '../../application/examples';
import type { CalculatorStore } from '../../application/calculator/calculator-store';
import { ExampleDialog, SaveExampleDialog } from './SaveExampleDialog';
import { savedErrorMessage } from './saved-error-message';

export function SavedExampleEditActions({
  service,
  calculator,
  mode,
  onOpen,
  onClose,
  formalVisible,
}: Readonly<{
  service: SavedExampleService;
  calculator: CalculatorStore;
  mode: 'new' | 'update' | null;
  onOpen: (mode: 'new' | 'update') => void;
  onClose: () => void;
  formalVisible: boolean;
}>) {
  const session = useStore(service.session);
  const state = useStore(calculator);
  const navigate = useNavigate();
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const original = session.editingOriginal;
  const canSave = formalVisible && canSaveExample(state) && !session.busy;
  return (
    <>
      {original !== null && (
        <section className="saved-session" aria-label="牌例保存状态">
          <p role="status">
            {session.savedDocument === state.document ? '已保存' : '有未保存修改'}：{original.name}
          </p>
          <div className="saved-actions">
            <button
              type="button"
              className="secondary-action"
              disabled={!canSave}
              onClick={() => onOpen('update')}
            >
              更新原记录
            </button>
            <button
              type="button"
              className="secondary-action"
              disabled={!canSave}
              onClick={() => onOpen('new')}
            >
              另存为新牌例
            </button>
            <button
              type="button"
              className="secondary-action"
              disabled={session.busy}
              onClick={() => setDiscardPrompt(true)}
            >
              放弃修改
            </button>
          </div>
        </section>
      )}
      {error !== null && <p role="alert">{error}</p>}
      {mode !== null && (
        <SaveExampleDialog
          initialName={
            mode === 'update' && original !== null ? original.name : defaultExampleName(state)
          }
          updating={mode === 'update'}
          onClose={onClose}
          onSave={async (name) => {
            if (!formalVisible) throw new Error('Formal Calculator is not active');
            await service.save(name, mode);
            onClose();
          }}
        />
      )}
      {discardPrompt && (
        <ExampleDialog title="放弃当前编辑副本？" onClose={() => setDiscardPrompt(false)}>
          <p>将回到保存时的原记录；原记录不会被修改。</p>
          <button
            className="primary-action"
            type="button"
            onClick={() => {
              setDiscardPrompt(false);
              void service
                .discard(() => true)
                .then(
                  (id) => {
                    if (id !== null) void navigate(`/saved/${encodeURIComponent(id)}`);
                    else setError('当前状态保护未完成，未放弃修改。');
                  },
                  (reason: unknown) => setError(savedErrorMessage(reason)),
                );
            }}
          >
            确认放弃
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() => setDiscardPrompt(false)}
          >
            继续编辑
          </button>
        </ExampleDialog>
      )}
    </>
  );
}
