import type { ClipboardPort } from '../../application/analysis-lifecycle';

export function createBrowserClipboardPort(): ClipboardPort {
  return Object.freeze({
    writeText: async (text: string) => {
      if (navigator.clipboard?.writeText === undefined) {
        throw new Error('Clipboard API unavailable.');
      }
      await navigator.clipboard.writeText(text);
    },
  });
}
