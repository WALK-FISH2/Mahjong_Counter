import { Navigate, Route, Routes } from 'react-router-dom';

import { CalculatorPage } from '../../pages/calculator/CalculatorPage';
import { EncyclopediaPage } from '../../pages/encyclopedia/EncyclopediaPage';
import { SavedExamplesPage } from '../../pages/saved-examples/SavedExamplesPage';
import { SavedExampleDetailPage } from '../../pages/saved-examples/SavedExampleDetailPage';
import { SettingsPage } from '../../pages/settings/SettingsPage';
import { AppLayout } from './AppLayout';
import type { CalculatorStore } from '../../application/calculator/calculator-store';
import type { CalculatorRuntime } from '../bootstrap/calculator-bootstrap';
import { replayOnboarding } from '../../application/preferences';
import { PersistencePanel } from '../../features/saved-examples/PersistencePanel';
import { TrashExamplesPage } from '../../pages/saved-examples/TrashExamplesPage';

export type AppRoutesProps = Readonly<{
  calculatorStore?: CalculatorStore | undefined;
  calculatorRuntime?: CalculatorRuntime | undefined;
  calculatorLoadFailed?: boolean;
}>;

export function AppRoutes({
  calculatorStore,
  calculatorRuntime,
  calculatorLoadFailed = false,
}: AppRoutesProps) {
  const store = calculatorRuntime?.store ?? calculatorStore;
  return (
    <>
      {calculatorRuntime?.persistence !== undefined && (
        <PersistencePanel persistence={calculatorRuntime.persistence} />
      )}
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate replace to="/calculator" />} />
          <Route
            path="calculator"
            element={
              <CalculatorPage
                store={store}
                runtime={calculatorRuntime}
                loadFailed={calculatorLoadFailed}
              />
            }
          />
          <Route path="rules" element={<EncyclopediaPage runtime={calculatorRuntime} />} />
          <Route
            path="rules/:ruleId/:ruleVersion"
            element={<EncyclopediaPage runtime={calculatorRuntime} />}
          />
          <Route
            path="rules/:ruleId/:ruleVersion/patterns/:patternId"
            element={<EncyclopediaPage runtime={calculatorRuntime} />}
          />
          <Route
            path="saved"
            element={<SavedExamplesPage service={calculatorRuntime?.savedExamples} />}
          />
          <Route
            path="saved/trash"
            element={<TrashExamplesPage service={calculatorRuntime?.savedExamples} />}
          />
          <Route
            path="saved/:exampleId"
            element={<SavedExampleDetailPage service={calculatorRuntime?.savedExamples} />}
          />
          <Route
            path="settings"
            element={
              <SettingsPage
                onReplayOnboarding={
                  calculatorRuntime === undefined
                    ? undefined
                    : () => replayOnboarding(calculatorRuntime.preferencesPort)
                }
                preferencesPort={calculatorRuntime?.preferencesPort}
              />
            }
          />
          <Route path="*" element={<Navigate replace to="/calculator" />} />
        </Route>
      </Routes>
    </>
  );
}
