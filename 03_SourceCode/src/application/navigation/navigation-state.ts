import { createAppStore, type AppStore } from '../state/create-app-store';

export type MainModule = 'calculator' | 'rules' | 'saved' | 'settings';

export type NavigationState = Readonly<{
  moduleHistory: readonly MainModule[];
  detailStack: readonly string[];
  modalStack: readonly string[];
  calculatorScrollY: number;
  visitModule: (module: MainModule) => void;
  pushDetail: (detailId: string) => void;
  popDetail: () => boolean;
  openModal: (modalId: string) => void;
  closeModal: (modalId?: string) => boolean;
  recordCalculatorScroll: (scrollY: number) => void;
  back: () => Readonly<
    | { handled: true; kind: 'modal' | 'detail' | 'module'; module?: MainModule }
    | { handled: false; kind: 'browser' }
  >;
}>;

export type NavigationStore = AppStore<NavigationState>;

export function createNavigationStore(initialModule: MainModule = 'calculator'): NavigationStore {
  return createAppStore<NavigationState>((set, get) => ({
    moduleHistory: Object.freeze([initialModule]),
    detailStack: Object.freeze([]),
    modalStack: Object.freeze([]),
    calculatorScrollY: 0,
    visitModule: (module) => {
      const history = get().moduleHistory;
      if (history.at(-1) === module) return;
      set({ moduleHistory: Object.freeze([...history, module]) });
    },
    pushDetail: (detailId) => {
      set({ detailStack: Object.freeze([...get().detailStack, detailId]) });
    },
    popDetail: () => {
      const details = get().detailStack;
      if (details.length === 0) return false;
      set({ detailStack: Object.freeze(details.slice(0, -1)) });
      return true;
    },
    openModal: (modalId) => {
      set({ modalStack: Object.freeze([...get().modalStack, modalId]) });
    },
    closeModal: (modalId) => {
      const modals = get().modalStack;
      if (modals.length === 0) return false;
      const index = modalId === undefined ? modals.length - 1 : modals.lastIndexOf(modalId);
      if (index < 0) return false;
      set({ modalStack: Object.freeze(modals.filter((_, candidate) => candidate !== index)) });
      return true;
    },
    recordCalculatorScroll: (scrollY) => {
      if (!Number.isFinite(scrollY) || scrollY < 0) return;
      set({ calculatorScrollY: scrollY });
    },
    back: () => {
      const current = get();
      if (current.modalStack.length > 0) {
        current.closeModal();
        return Object.freeze({ handled: true, kind: 'modal' });
      }
      if (current.detailStack.length > 0) {
        current.popDetail();
        return Object.freeze({ handled: true, kind: 'detail' });
      }
      if (current.moduleHistory.length > 1) {
        const moduleHistory = current.moduleHistory.slice(0, -1);
        set({ moduleHistory: Object.freeze(moduleHistory) });
        return Object.freeze({ handled: true, kind: 'module', module: moduleHistory.at(-1)! });
      }
      return Object.freeze({ handled: false, kind: 'browser' });
    },
  }));
}
