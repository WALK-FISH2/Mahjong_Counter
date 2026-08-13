import type { SystemEvaluation } from '../../domain/engine/evaluation';

export type ResultAction = 'save' | 'copy' | 'share';
export type ResultActionPolicy = Readonly<Record<ResultAction, boolean>>;

export function getResultActionPolicy(
  status: SystemEvaluation['status'] | 'quick-calc',
): ResultActionPolicy {
  switch (status) {
    case 'legal-win':
      return Object.freeze({ save: true, copy: true, share: true });
    case 'structural-win-but-illegal':
    case 'not-winning':
      return Object.freeze({ save: false, copy: true, share: true });
    case 'incomplete-context':
      return Object.freeze({ save: false, copy: true, share: false });
    case 'quick-calc':
      return Object.freeze({ save: false, copy: true, share: false });
  }
}
