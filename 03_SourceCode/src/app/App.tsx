import { useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';

import { loadCalculatorStore } from './bootstrap/calculator-bootstrap';
import { AppRoutes } from './routes/AppRoutes';
import type { CalculatorStore } from '../application/calculator/calculator-store';

export function App() {
  const [calculatorStore, setCalculatorStore] = useState<CalculatorStore>();
  const [calculatorLoadFailed, setCalculatorLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;

    loadCalculatorStore().then(
      (store) => {
        if (active) {
          setCalculatorStore(store);
        }
      },
      () => {
        if (active) {
          setCalculatorLoadFailed(true);
        }
      },
    );

    return () => {
      active = false;
    };
  }, []);

  return (
    <HashRouter>
      <AppRoutes calculatorStore={calculatorStore} calculatorLoadFailed={calculatorLoadFailed} />
    </HashRouter>
  );
}
