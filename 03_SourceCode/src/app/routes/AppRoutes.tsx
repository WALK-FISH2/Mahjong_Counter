import { Navigate, Route, Routes } from 'react-router-dom';

import { CalculatorPage } from '../../pages/calculator/CalculatorPage';
import { EncyclopediaPage } from '../../pages/encyclopedia/EncyclopediaPage';
import { SavedExamplesPage } from '../../pages/saved-examples/SavedExamplesPage';
import { SettingsPage } from '../../pages/settings/SettingsPage';
import { AppLayout } from './AppLayout';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate replace to="/calculator" />} />
        <Route path="calculator" element={<CalculatorPage />} />
        <Route path="rules" element={<EncyclopediaPage />} />
        <Route path="saved" element={<SavedExamplesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate replace to="/calculator" />} />
      </Route>
    </Routes>
  );
}
