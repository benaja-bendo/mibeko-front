import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth, RedirectIfAuthenticated, RootRedirect } from './guards';
import {
  AcceptInvitationRoutePage,
  AdminDashboardRoutePage,
  AdminMessagesRoutePage,
  AdminAbonnementsRoutePage,
  AdminReferentielsRoutePage,
  AdminSignalementsRoutePage,
  AdminUtilisateursRoutePage,
  AdminAuditRoutePage,
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
  RegisterRoutePage,
  ForgotPasswordRoutePage,
  ResetPasswordRoutePage,
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
  {
    path: '/auth/register',
    element: (
      <RedirectIfAuthenticated>
        <RegisterRoutePage />
      </RedirectIfAuthenticated>
    ),
  },
  {
    path: '/auth/mot-de-passe-oublie',
    element: (
      <RedirectIfAuthenticated>
        <ForgotPasswordRoutePage />
      </RedirectIfAuthenticated>
    ),
  },
  {
    path: '/auth/reinitialiser',
    element: (
      <RedirectIfAuthenticated>
        <ResetPasswordRoutePage />
      </RedirectIfAuthenticated>
    ),
  },
  {
    path: '/auth/accept-invitation',
    element: <AcceptInvitationRoutePage />,
  },

  // ─── Admin space (/admin/*) — admin uniquement ────────────────────────────
  {
    path: '/admin/messages',
    element: <RequireAuth roles={['admin']} requiredRole="admin"><AdminMessagesRoutePage /></RequireAuth>,
  },
  {
    path: '/admin/abonnements',
    element: <RequireAuth roles={['admin']} requiredRole="admin"><AdminAbonnementsRoutePage /></RequireAuth>,
  },
  {
    path: '/admin',
    element: (
      <RequireAuth roles={['admin']} requiredRole="admin">
        <AdminDashboardRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/admin/utilisateurs',
    element: (
      <RequireAuth roles={['admin']} requiredRole="admin">
        <AdminUtilisateursRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/admin/audit',
    element: (
      <RequireAuth roles={['admin']} requiredRole="admin">
        <AdminAuditRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/admin/referentiels',
    element: (
      <RequireAuth roles={['admin']} requiredRole="admin">
        <AdminReferentielsRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/admin/signalements',
    element: (
      <RequireAuth roles={['admin']} requiredRole="admin">
        <AdminSignalementsRoutePage />
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

  // ─── Espace de travail (/app/*) — tout compte authentifié ─────────────────
  //
  // mibeko-front#24 : la garde de rôle a disparu de ces routes. Un rôle Spatie
  // dit qui est la personne dans l'organisation, jamais ce qu'elle a payé —
  // `mobile_user`, attribué à TOUTE auto-inscription (web comprise, cf.
  // `CreateNewUser`), n'a jamais été un palier. Le droit d'usage se lit sur
  // `/me/entitlements`, qui accorde déjà `library` et `assistant` à tous les
  // plans et ne réserve que `export` au Pro ; côté API, les pages elles-mêmes
  // n'étaient pas fermées. Le différenciateur reste le quota (assistant) et
  // l'entitlement (exports : serveur pour les textes, interface web pour les
  // dossiers dont la route reste publique pour le mobile invité), jamais la
  // porte d'entrée. Suite de mibeko-front#7, qui avait ouvert le seul Assistant
  // et laissé le reste de l'espace fermé.
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppDashboardRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/journals',
    element: (
      <RequireAuth>
        <ProJournalsRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/journals/:id',
    element: (
      <RequireAuth>
        <ProJournalViewRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/library',
    element: (
      <RequireAuth>
        <LibraryRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/library/:id',
    element: (
      <RequireAuth>
        <LibraryRoutePage />
      </RequireAuth>
    ),
  },
  {
    // mibeko-front#7 : la garde descend de la route à la fonctionnalité —
    // tout compte authentifié ouvre l'assistant, différencié par quota
    // (lu depuis /me/entitlements, cf. AssistantPage), jamais par rôle.
    path: '/app/assistant',
    element: (
      <RequireAuth>
        <AssistantRoutePage />
      </RequireAuth>
    ),
  },
  {
    path: '/app/dossiers',
    element: (
      <RequireAuth>
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

  // ─── Racine : redirection selon le rôle (admin/éditeur/pro) ───────────────
  { path: '/', element: <RootRedirect /> },

  // ─── Legacy redirects (bookmarks / anciens liens) ─────────────────────────
  { path: '/documents', element: <Navigate to="/editor/documents" replace /> },
  { path: '/ingestion', element: <Navigate to="/editor/ingestion" replace /> },
  { path: '/viewer', element: <Navigate to="/editor" replace /> },
  { path: '/viewer/:id', element: <LegacyViewerRedirectPage /> },

  // ─── Catch-all ─────────────────────────────────────────────────────────────
  { path: '*', element: <Navigate to="/" replace /> },
]);
