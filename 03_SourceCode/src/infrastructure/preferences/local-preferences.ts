import { createAppStore } from '../../application/state/create-app-store';
import {
  DEFAULT_CALCULATOR_PREFERENCES,
  cloneCalculatorPreferences,
  type CalculatorPreferences,
  type CalculatorPreferencesPort,
} from '../../application/preferences';
import { parsePreferences, preferencesSchema } from '../../schemas/persistence/preferences-schema';

export const PREFERENCES_KEY = 'mahjong.preferences';
export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export class LocalPreferences implements CalculatorPreferencesPort {
  readonly state = createAppStore<{ preferences: CalculatorPreferences; warning: string | null }>(
    () => ({ preferences: DEFAULT_CALCULATOR_PREFERENCES, warning: null }),
  );
  constructor(private readonly storage: () => PreferenceStorage) {
    try {
      const raw = this.raw();
      if (raw !== null) {
        if (raw.length > 100_000) throw new Error('PREFERENCES_LIMIT');
        this.state.setState({ preferences: parsePreferences(JSON.parse(raw)) });
      }
    } catch {
      this.state.setState({
        warning: '偏好不可读取，已使用安全默认值；原数据保留。可重置偏好恢复持久化。',
      });
    }
  }
  raw(): string | null {
    return this.storage().getItem(PREFERENCES_KEY);
  }
  restoreRaw(raw: string | null): void {
    if (raw === null) this.storage().removeItem(PREFERENCES_KEY);
    else this.storage().setItem(PREFERENCES_KEY, raw);
  }
  read(): Promise<CalculatorPreferences> {
    return Promise.resolve(cloneCalculatorPreferences(this.state.getState().preferences));
  }
  write(value: CalculatorPreferences): Promise<void> {
    const preferences = preferencesSchema.parse(value);
    // An unreadable/future version is never overwritten by startup onboarding or a default.
    if (this.state.getState().warning === null) {
      try {
        this.storage().setItem(PREFERENCES_KEY, JSON.stringify({ version: 2, preferences }));
      } catch {
        this.state.setState({
          warning: '偏好写入失败，本次设置仅保留在会话中。请重试或重置偏好。',
        });
      }
    }
    this.state.setState({ preferences });
    return Promise.resolve();
  }
  reset(): void {
    this.storage().removeItem(PREFERENCES_KEY);
    this.acceptCleared();
  }
  acceptCleared(): void {
    this.state.setState({ preferences: DEFAULT_CALCULATOR_PREFERENCES, warning: null });
  }
}
