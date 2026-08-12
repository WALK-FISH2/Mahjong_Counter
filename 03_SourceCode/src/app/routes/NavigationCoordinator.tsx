import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from 'zustand';

import { type MainModule, type NavigationStore } from '../../application/navigation';
import { navigationStore } from './navigation-store';

function moduleFromPath(pathname: string): MainModule | null {
  const segment = pathname.split('/').filter(Boolean)[0];
  return segment === 'calculator' ||
    segment === 'rules' ||
    segment === 'saved' ||
    segment === 'settings'
    ? segment
    : null;
}

export function NavigationCoordinator({
  store = navigationStore,
}: Readonly<{ store?: NavigationStore }>) {
  const location = useLocation();
  const currentModule = useStore(store, (state) => state.moduleHistory.at(-1));

  useEffect(() => {
    const module = moduleFromPath(location.pathname);
    if (module !== null && module !== currentModule) store.getState().visitModule(module);
  }, [currentModule, location.pathname, store]);

  return null;
}
