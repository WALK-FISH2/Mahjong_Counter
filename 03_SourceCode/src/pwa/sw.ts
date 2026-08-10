/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope & {
  readonly __WB_MANIFEST: readonly unknown[];
};

const scaffoldBuildEntries = self.__WB_MANIFEST;

self.addEventListener('install', () => {
  void scaffoldBuildEntries;
});
