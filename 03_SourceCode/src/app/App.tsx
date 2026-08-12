import { useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';

import { loadCalculatorRuntime, type CalculatorRuntime } from './bootstrap/calculator-bootstrap';
import { AppRoutes } from './routes/AppRoutes';

export function App() {
  const [calculatorRuntime, setCalculatorRuntime] = useState<CalculatorRuntime>();
  const [calculatorLoadFailed, setCalculatorLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;

    loadCalculatorRuntime().then(
      (runtime) => {
        if (active) {
          setCalculatorRuntime(runtime);
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
      <AppRoutes
        calculatorRuntime={calculatorRuntime}
        calculatorLoadFailed={calculatorLoadFailed}
      />
    </HashRouter>
  );
}
