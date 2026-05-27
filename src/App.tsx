import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { TooltipProvider } from './components/ui/Tooltip';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Catalogue = lazy(() => import('./pages/Catalogue'));
const Ingestion = lazy(() => import('./pages/Ingestion'));
const Viewer = lazy(() => import('./pages/Viewer'));

function PageFallback() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-bg text-gold font-mono text-xs tracking-widest uppercase">
      Chargement…
    </div>
  );
}

export default function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/catalogue" element={<Catalogue />} />
            <Route path="/ingestion" element={<Ingestion />} />
            <Route path="/viewer/:id" element={<Viewer />} />
            <Route path="/viewer" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  );
}
