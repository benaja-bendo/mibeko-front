import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth, RedirectIfAuthenticated } from './guards';
import {
  AdminDashboardRoutePage,
  AppDashboardRoutePage,
  AssistantRoutePage,
  DashboardRoutePage,
  DossiersRoutePage,
  IngestionRoutePage,
  JournalDetailRoutePage,
  JournalsRoutePage,
  LegalDocumentsRoutePage,
  LegacyViewerRedirectPage,
  LibraryRoutePage,
  LoginRoutePage,
  ProJournalsRoutePage,
  ProJournalViewRoutePage,
  SettingsRoutePage,
  SettingsAccountRoutePage,
  SettingsBillingRoutePage,
  SettingsNotificationsRoutePage,
  SettingsSupportRoutePage,
  UpgradeRoutePage,
  ViewerRoutePage,
} from './routeElements';

export const router = createBrowserRouter([
  // ─── Auth ─────────────────────────────────────────────────────────────────
  {
    path: '/auth/login',
    element: (
      <RedirectIfAuthenticated>
        <LoginRoutePage />
      </RedirectIfAuthenticated>
    ),
  },

  // ─── Admin space (/admin/*) — admin uniquement ────────────────────────────
  {
    path: '/admin',
    element: (
      <RequireAuth roles={['admin']} requiredRole="admin">
        <AdminDashboardRoutePage />
      </RequireAuth>
    ),
  },

  // ─── Editor space (/editor/*) — admin + editor ────────────────────────────
  {
    path: '/editor',
    element: (
      <RequireAuth roles={['admin', 'editor']} requiredRole="editor">
        <DashboardRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/editor/documents',
    element: (
      <RequireAuth roles={['admin', 'editor']} requiredRole="editor">
        <LegalDocumentsRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/editor/journals',
    element: (
      <RequireAuth roles={['admin', 'editor']} requiredRole="editor">
        <JournalsRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/editor/journals/:id',
    element: (
      <RequireAuth roles={['admin', 'editor']} requiredRole="editor">
        <JournalDetailRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/editor/ingestion',
    element: (
      <RequireAuth roles={['admin', 'editor']} requiredRole="editor">
        <IngestionRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/editor/viewer/:id',
    element: (
      <RequireAuth roles={['admin', 'editor']} requiredRole="editor">
        <ViewerRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/editor/settings',
    element: (
      <RequireAuth roles={['admin', 'editor']} requiredRole="editor">
        <SettingsRoutePage />
      </RequireAuth>
    ),
  },

  // ─── Pro space (/app/*) — user_pro + editor + admin ───────────────────────
  {
    path: '/app',
    element: (
      <RequireAuth roles={['admin', 'editor', 'user_pro']} requiredRole="user_pro">
        <AppDashboardRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/journals',
    element: (
      <RequireAuth roles={['admin', 'editor', 'user_pro']} requiredRole="user_pro">
        <ProJournalsRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/journals/:id',
    element: (
      <RequireAuth roles={['admin', 'editor', 'user_pro']} requiredRole="user_pro">
        <ProJournalViewRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/library',
    element: (
      <RequireAuth roles={['admin', 'editor', 'user_pro']} requiredRole="user_pro">
        <LibraryRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/library/:id',
    element: (
      <RequireAuth roles={['admin', 'editor', 'user_pro']} requiredRole="user_pro">
        <LibraryRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/assistant',
    element: (
      <RequireAuth roles={['admin', 'editor', 'user_pro']} requiredRole="user_pro">
        <AssistantRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/dossiers',
    element: (
      <RequireAuth roles={['admin', 'editor', 'user_pro']} requiredRole="user_pro">
        <DossiersRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/upgrade',
    element: (
      <RequireAuth>
        <UpgradeRoutePage />
      </RequireAuth>
    ),
  },

  // ─── Settings (/settings/*) — tout utilisateur authentifié ────────────────
  {
    path: '/settings',
    element: <Navigate to="/settings/account" replace />,
  },
  {
    path: '/settings/account',
    element: (
      <RequireAuth>
        <SettingsAccountRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/settings/notifications',
    element: (
      <RequireAuth>
        <SettingsNotificationsRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/settings/billing',
    element: (
      <RequireAuth>
        <SettingsBillingRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/settings/support',
    element: (
      <RequireAuth>
        <SettingsSupportRoutePage />
      </RequireAuth>
    ),
  },

  // ─── Legacy redirects (bookmarks / anciens liens) ─────────────────────────
  { path: '/', element: <Navigate to="/editor" replace /> },
  { path: '/documents', element: <Navigate to="/editor/documents" replace /> },
  { path: '/ingestion', element: <Navigate to="/editor/ingestion" replace /> },
  { path: '/settings', element: <Navigate to="/editor/settings" replace /> },
  { path: '/viewer', element: <Navigate to="/editor" replace /> },
  { path: '/viewer/:id', element: <LegacyViewerRedirectPage /> },

  // ─── Catch-all ─────────────────────────────────────────────────────────────
  { path: '*', element: <Navigate to="/" replace /> },
]);
