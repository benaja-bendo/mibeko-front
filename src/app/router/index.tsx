import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { RequireAuth, RedirectIfAuthenticated } from './guards';

function PageFallback() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-bg text-gold font-mono text-xs tracking-widest uppercase">
      Chargement…
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Wrap = ({ Component }: { Component: React.LazyExoticComponent<any> }) => (
  <Suspense fallback={<PageFallback />}>
    <Component />
  </Suspense>
);

// Auth
const LoginPage = lazy(() => import('@/features/auth/components/LoginPage'));

// Editor space
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const LegalDocuments = lazy(() => import('@/pages/LegalDocuments'));
const Ingestion = lazy(() => import('@/pages/Ingestion'));
const Viewer = lazy(() => import('@/pages/Viewer'));
const Settings = lazy(() => import('@/pages/Settings'));

// Pro space
const Library = lazy(() => import('@/pages/app/Library'));
const AssistantPage = lazy(() => import('@/pages/app/Assistant'));
const Dossiers = lazy(() => import('@/pages/app/Dossiers'));

// Admin space
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));

export const router = createBrowserRouter([
  // ─── Auth ─────────────────────────────────────────────────────────────────
  {
    path: '/auth/login',
    element: (
      <RedirectIfAuthenticated>
        <Wrap Component={LoginPage} />
      </RedirectIfAuthenticated>
    ),
  },

  // ─── Admin space (/admin/*) — admin uniquement ────────────────────────────
  {
    path: '/admin',
    element: (
      <RequireAuth roles={['admin']} requiredRole="admin">
        <Wrap Component={AdminDashboard} />
      </RequireAuth>
    ),
  },

  // ─── Editor space (/editor/*) — admin + editor ────────────────────────────
  {
    path: '/editor',
    element: (
      <RequireAuth roles={['admin', 'editor']} requiredRole="editor">
        <Wrap Component={Dashboard} />
      </RequireAuth>
    ),
  },
  {
    path: '/editor/documents',
    element: (
      <RequireAuth roles={['admin', 'editor']} requiredRole="editor">
        <Wrap Component={LegalDocuments} />
      </RequireAuth>
    ),
  },
  {
    path: '/editor/ingestion',
    element: (
      <RequireAuth roles={['admin', 'editor']} requiredRole="editor">
        <Wrap Component={Ingestion} />
      </RequireAuth>
    ),
  },
  {
    path: '/editor/viewer/:id',
    element: (
      <RequireAuth roles={['admin', 'editor']} requiredRole="editor">
        <Wrap Component={Viewer} />
      </RequireAuth>
    ),
  },
  {
    path: '/editor/settings',
    element: (
      <RequireAuth roles={['admin', 'editor']} requiredRole="editor">
        <Wrap Component={Settings} />
      </RequireAuth>
    ),
  },

  // ─── Pro space (/app/*) — user_pro + editor + admin ───────────────────────
  {
    path: '/app/library',
    element: (
      <RequireAuth roles={['admin', 'editor', 'user_pro']} requiredRole="user_pro">
        <Wrap Component={Library} />
      </RequireAuth>
    ),
  },
  {
    path: '/app/library/:id',
    element: (
      <RequireAuth roles={['admin', 'editor', 'user_pro']} requiredRole="user_pro">
        <Wrap Component={Library} />
      </RequireAuth>
    ),
  },
  {
    path: '/app/assistant',
    element: (
      <RequireAuth roles={['admin', 'editor', 'user_pro']} requiredRole="user_pro">
        <Wrap Component={AssistantPage} />
      </RequireAuth>
    ),
  },
  {
    path: '/app/dossiers',
    element: (
      <RequireAuth roles={['admin', 'editor', 'user_pro']} requiredRole="user_pro">
        <Wrap Component={Dossiers} />
      </RequireAuth>
    ),
  },

  // ─── Legacy redirects (bookmarks / anciens liens) ─────────────────────────
  { path: '/', element: <Navigate to="/editor" replace /> },
  { path: '/documents', element: <Navigate to="/editor/documents" replace /> },
  { path: '/ingestion', element: <Navigate to="/editor/ingestion" replace /> },
  { path: '/settings', element: <Navigate to="/editor/settings" replace /> },
  { path: '/viewer', element: <Navigate to="/editor" replace /> },

  // ─── Catch-all ─────────────────────────────────────────────────────────────
  { path: '*', element: <Navigate to="/" replace /> },
]);
