import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { AuthAppearance } from './AuthAppearance';

/**
 * Affiche un écran de chargement uniforme pendant le lazy loading des pages.
 */
function PageFallback() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-bg text-gold font-mono text-xs tracking-widest uppercase">
      Chargement…
    </div>
  );
}

/**
 * Encapsule une page lazy dans un Suspense partagé pour le routeur.
 */
function LazyPage({ Component }: { Component: LazyExoticComponent<ComponentType> }) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  );
}

/** Rend une route d'authentification sous l'identité claire du site public. */
function AuthRoutePage({ Component }: { Component: LazyExoticComponent<ComponentType> }) {
  return (
    <AuthAppearance>
      <LazyPage Component={Component} />
    </AuthAppearance>
  );
}

/**
 * Redirige les anciens liens viewer vers le nouvel espace éditeur.
 */
export function LegacyViewerRedirectPage() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/editor/viewer/${id}` : '/editor'} replace />;
}

const LoginPage = lazy(() => import('@/features/auth/components/LoginPage'));
const AcceptInvitationPage = lazy(() => import('@/features/auth/components/AcceptInvitationPage'));
const RegisterPage = lazy(() => import('@/features/auth/components/RegisterPage'));
const VerifyEmailPage = lazy(() => import('@/features/auth/components/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/components/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/components/ResetPasswordPage'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const LegalDocuments = lazy(() => import('@/pages/LegalDocuments'));
const ReviewQueue = lazy(() => import('@/pages/ReviewQueue'));
const Relations = lazy(() => import('@/pages/Relations'));
const Journals = lazy(() => import('@/pages/Journals'));
const JournalDetail = lazy(() => import('@/pages/JournalDetail'));
const Ingestion = lazy(() => import('@/pages/Ingestion'));
const Viewer = lazy(() => import('@/pages/Viewer'));
const Settings = lazy(() => import('@/pages/Settings'));
const AppDashboard = lazy(() => import('@/pages/app/Dashboard'));
const Library = lazy(() => import('@/pages/app/Library'));
const ProJournals = lazy(() => import('@/pages/app/Journals'));
const ProJournalView = lazy(() => import('@/pages/app/JournalView'));
const AssistantPage = lazy(() => import('@/pages/app/Assistant'));
const Dossiers = lazy(() => import('@/pages/app/Dossiers'));
const Upgrade = lazy(() => import('@/pages/app/Upgrade'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminSante = lazy(() => import('@/pages/admin/Sante'));
const AdminReferentiels = lazy(() => import('@/pages/admin/Referentiels'));
const AdminSignalements = lazy(() => import('@/pages/admin/Signalements'));
const AdminUtilisateurs = lazy(() => import('@/pages/admin/Utilisateurs'));
const AdminAudit = lazy(() => import('@/pages/admin/Audit'));
const AdminMessages = lazy(() => import('@/pages/admin/Messages'));
const AdminAbonnements = lazy(() => import('@/pages/admin/Abonnements'));
const AdminOnboarding = lazy(() => import('@/pages/admin/Onboarding'));
const SettingsAccount = lazy(() => import('@/pages/settings/Account'));
const SettingsNotifications = lazy(() => import('@/pages/settings/Notifications'));
const SettingsBilling = lazy(() => import('@/pages/settings/Billing'));
const SettingsSupport = lazy(() => import('@/pages/settings/Support'));

/**
 * Rend la page de connexion en lazy loading.
 */
export function LoginRoutePage() {
  return <AuthRoutePage Component={LoginPage} />;
}

export function RegisterRoutePage() {
  return <AuthRoutePage Component={RegisterPage} />;
}

export function VerifyEmailRoutePage() {
  return <AuthRoutePage Component={VerifyEmailPage} />;
}

export function ForgotPasswordRoutePage() {
  return <AuthRoutePage Component={ForgotPasswordPage} />;
}

export function ResetPasswordRoutePage() {
  return <AuthRoutePage Component={ResetPasswordPage} />;
}

/**
 * Rend le tableau de bord éditeur en lazy loading.
 */
export function DashboardRoutePage() {
  return <LazyPage Component={Dashboard} />;
}

/**
 * Rend le catalogue de documents en lazy loading.
 */
export function LegalDocumentsRoutePage() {
  return <LazyPage Component={LegalDocuments} />;
}

/**
 * Rend la file de revue priorisée et assignable en lazy loading.
 */
export function ReviewQueueRoutePage() {
  return <LazyPage Component={ReviewQueue} />;
}

/**
 * Rend la relecture des relations modification/abrogation candidates en lazy loading.
 */
export function RelationsRoutePage() {
  return <LazyPage Component={Relations} />;
}

/**
 * Rend la liste des journaux officiels en lazy loading.
 */
export function JournalsRoutePage() {
  return <LazyPage Component={Journals} />;
}

/**
 * Rend le détail d'un journal officiel en lazy loading.
 */
export function JournalDetailRoutePage() {
  return <LazyPage Component={JournalDetail} />;
}

/**
 * Rend la page d'ingestion en lazy loading.
 */
export function IngestionRoutePage() {
  return <LazyPage Component={Ingestion} />;
}

/**
 * Rend le viewer de document en lazy loading.
 */
export function ViewerRoutePage() {
  return <LazyPage Component={Viewer} />;
}

/**
 * Rend la page des réglages en lazy loading.
 */
export function SettingsRoutePage() {
  return <LazyPage Component={Settings} />;
}

/**
 * Rend le tableau de bord Pro (accueil de l'espace) en lazy loading.
 */
export function AppDashboardRoutePage() {
  return <LazyPage Component={AppDashboard} />;
}

/**
 * Rend la bibliothèque Pro en lazy loading.
 */
export function LibraryRoutePage() {
  return <LazyPage Component={Library} />;
}

/**
 * Rend le kiosque Journal Officiel de l'espace Pro en lazy loading.
 */
export function ProJournalsRoutePage() {
  return <LazyPage Component={ProJournals} />;
}

/**
 * Rend le sommaire d'un numéro du Journal Officiel (Pro) en lazy loading.
 */
export function ProJournalViewRoutePage() {
  return <LazyPage Component={ProJournalView} />;
}

/**
 * Rend l'assistant Pro en lazy loading.
 */
export function AssistantRoutePage() {
  return <LazyPage Component={AssistantPage} />;
}

/**
 * Rend la page des dossiers Pro en lazy loading.
 */
export function DossiersRoutePage() {
  return <LazyPage Component={Dossiers} />;
}

/**
 * Rend la page de découverte Pro en lazy loading.
 */
export function UpgradeRoutePage() {
  return <LazyPage Component={Upgrade} />;
}

/**
 * Rend le tableau de bord admin en lazy loading.
 */
export function AdminDashboardRoutePage() {
  return <LazyPage Component={AdminDashboard} />;
}

export function AdminSanteRoutePage() {
  return <LazyPage Component={AdminSante} />;
}

export function AdminAbonnementsRoutePage() {
  return <LazyPage Component={AdminAbonnements} />;
}

export function AdminOnboardingRoutePage() {
  return <LazyPage Component={AdminOnboarding} />;
}

/**
 * Rend la gestion des référentiels (admin) en lazy loading.
 */
export function AdminReferentielsRoutePage() {
  return <LazyPage Component={AdminReferentiels} />;
}

/**
 * Rend le triage des signalements (admin) en lazy loading.
 */
export function AdminSignalementsRoutePage() {
  return <LazyPage Component={AdminSignalements} />;
}

/**
 * Rend la gestion des utilisateurs (admin) en lazy loading.
 */
export function AdminUtilisateursRoutePage() {
  return <LazyPage Component={AdminUtilisateurs} />;
}

/**
 * Rend le journal d'activité (admin) en lazy loading.
 */
export function AdminAuditRoutePage() {
  return <LazyPage Component={AdminAudit} />;
}

/**
 * Rend la page publique d'acceptation d'invitation en lazy loading.
 */
export function AcceptInvitationRoutePage() {
  return <AuthRoutePage Component={AcceptInvitationPage} />;
}

/**
 * Rend la page « Compte » des paramètres en lazy loading.
 */
export function SettingsAccountRoutePage() {
  return <LazyPage Component={SettingsAccount} />;
}

/**
 * Rend la page « Notifications » des paramètres en lazy loading.
 */
export function SettingsNotificationsRoutePage() {
  return <LazyPage Component={SettingsNotifications} />;
}

/**
 * Rend la page « Facturation » des paramètres en lazy loading.
 */
export function SettingsBillingRoutePage() {
  return <LazyPage Component={SettingsBilling} />;
}

/**
 * Rend la page « Support & Légal » des paramètres en lazy loading.
 */
export function SettingsSupportRoutePage() {
  return <LazyPage Component={SettingsSupport} />;
}

export function AdminMessagesRoutePage() {
  return <LazyPage Component={AdminMessages} />;
}
