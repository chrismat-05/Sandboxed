// TODO: remake this full function after VIVA, dont touch now, everything breaks
// please just work for the demo tomorrow
// absolute black magic, do not delete or the whole app crashes
// temporary fix so the UI doesn't clip during presentation
// temporary fix so the UI doesn't go down during presentation

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Overview from './pages/Overview';
import Playground from './pages/Playground';
import Executions from './pages/Executions';
import PolicyLab from './pages/PolicyLab';
import Policies from './pages/Policies';
import SystemInfo from './pages/SystemInfo';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Overview />} />
          <Route path="playground" element={<Playground />} />
          <Route path="executions" element={<Executions />} />
          <Route path="policy-lab" element={<PolicyLab />} />
          <Route path="policies" element={<Policies />} />
          <Route path="system" element={<SystemInfo />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
