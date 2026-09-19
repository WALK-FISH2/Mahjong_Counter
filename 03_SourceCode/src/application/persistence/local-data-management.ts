import { createAppStore } from '../state/create-app-store';

export const CLEAR_DATA_SCOPE = Object.freeze([
  '已保存牌例',
  '回收站',
  '当前草稿（包括当前输入和临时调整）',
  '设置与界面偏好',
  '历史规则快照',
  '本地规则元数据',
  '迁移安全备份',
]);
export interface BackupExportPort {
  exportFullBackup(): Promise<void>;
}
export interface LocalDataPort {
  clear(): Promise<void>;
  estimate(): Promise<Readonly<{ usage: number | null; quota: number | null }>>;
}
export function createLocalDataManagement(
  input: Readonly<{
    data: LocalDataPort;
    backup: BackupExportPort;
    canManage: () => boolean;
    suspend: () => Promise<void>;
    resume: () => void;
    reset: () => Promise<void>;
  }>,
) {
  const state = createAppStore<{ busy: boolean; error: string | null; cleared: boolean }>(() => ({
    busy: false,
    error: null,
    cleared: false,
  }));
  return {
    state,
    estimate: () => input.data.estimate(),
    async clear(
      confirmScope: () => Promise<boolean> | boolean,
      confirmFinal: () =>
        | Promise<'cancel' | 'export-first' | 'without-backup'>
        | 'cancel'
        | 'export-first'
        | 'without-backup',
    ) {
      if (state.getState().busy) return false;
      state.setState({ busy: true, error: null, cleared: false });
      let suspended = false;
      try {
        if (!(await confirmScope())) return false;
        const choice = await confirmFinal();
        if (choice === 'cancel') return false;
        if (!input.canManage()) throw new Error('EDITOR_READ_ONLY');
        await input.suspend();
        suspended = true;
        // A failed/unavailable exporter MUST NOT silently become "without backup".
        if (choice === 'export-first') await input.backup.exportFullBackup();
        await input.data.clear();
        await input.reset();
        state.setState({ cleared: true });
        return true;
      } catch (error) {
        state.setState({ error: error instanceof Error ? error.message : 'CLEAR_FAILED' });
        return false;
      } finally {
        if (suspended) input.resume();
        state.setState({ busy: false });
      }
    },
  };
}
export type LocalDataManagement = ReturnType<typeof createLocalDataManagement>;

export function describeStorage(value: Readonly<{ usage: number | null; quota: number | null }>) {
  const mb = (size: number) => Math.max(0.1, Math.round((size / 1048576) * 10) / 10);
  return {
    description:
      value.usage === null
        ? '浏览器未提供占用估算'
        : `此站点约使用 ${mb(value.usage)} MB${value.quota === null ? '' : ` / 约 ${mb(value.quota)} MB 可用配额`}（浏览器估算，可能包含缓存）`,
    tight:
      value.usage !== null &&
      value.quota !== null &&
      value.quota > 0 &&
      value.usage / value.quota >= 0.8,
  };
}
