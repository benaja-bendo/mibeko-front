/**
 * Ingestion.tsx — Boîte de réception documentaire (admin/éditeur, front#43/#44).
 *
 * Trois zones :
 *  - « Déposer » : formulaire à trois branches (mibeko-python#23 § 3.2), qui
 *    dépose un travail dans la file durable — ne crée plus de document
 *    directement.
 *  - « En cours » : suivi des travaux (`GET /api/v1/ingestion/jobs`), étape
 *    réelle, tentative, erreur lisible, relance.
 *  - « À vérifier » : relecture dirigée d'un document (front#44) — signalements,
 *    points d'observation obligatoires et sondage calculés côté serveur
 *    (mibeko-dashboard#142), cette page ne fait qu'afficher et confirmer.
 *    « Valider » y transite `draft`/`review` vers `validated` ; « Publier »
 *    reste ailleurs, sous son propre garde-fou.
 *
 * Le dépôt et le suivi des travaux passent par l'API Python, la relecture
 * dirigée par l'API Laravel.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePythonStream } from '@/features/ingestion/hooks/usePythonStream';
import { ServiceHealth } from '@/features/ingestion/components/IngestionStats';
import { AVerifierZone } from '@/features/ingestion/components/AVerifierZone';
import { DepotForm } from '@/features/ingestion/components/DepotForm';
import { IngestionJobsQueue } from '@/features/ingestion/components/IngestionJobsQueue';
import AppLayout from '@/widgets/layout/AppLayout';
import { useAuthStore } from '@/features/auth/store/authStore';
import { toast } from '@/shared/store/useToast';

type Zone = 'deposer' | 'en-cours' | 'a-verifier';

const ZONE_LABELS: Record<Zone, string> = {
  deposer: 'Déposer',
  'en-cours': 'En cours',
  'a-verifier': 'À vérifier',
};

export default function Ingestion() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [zone, setZone] = useState<Zone>('deposer');

  usePythonStream({
    onNotification: ({ message, type }) => toast[type](message),
  });

  const openDocument = (documentId: string) => navigate(`/editor/viewer/${documentId}`);

  if (!user || (!user.roles?.includes('admin') && !user.roles?.includes('editor'))) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4 px-4">
            <h1 className="text-2xl font-bold text-red">Accès refusé</h1>
            <p className="text-t2 text-sm">
              Vous n'avez pas les droits nécessaires pour accéder à cette page.
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        {/* Conteneur standard (aligné sur PageContainer) pour éviter tout décalage entre pages */}
        <div className="max-w-screen-2xl mx-auto w-full px-4 md:px-6 py-6 space-y-4">
          {/* ── En-tête ──────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.5]">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-display font-semibold text-t1">Ingestion documentaire</h1>
              <p className="text-t3 text-[11px] font-mono mt-0.5 flex items-center gap-2">
                Déposez un PDF, le système le mène seul jusqu'à un brouillon
                <ServiceHealth />
              </p>
            </div>
          </div>

          {/* ── Zones ────────────────────────────────────────────────────── */}
          <div className="flex items-center rounded-xl border border-b1 overflow-hidden w-fit">
            {(['deposer', 'en-cours', 'a-verifier'] as const).map((z) => (
              <button
                key={z}
                onClick={() => setZone(z)}
                className={[
                  'h-10 px-4 text-xs font-mono transition-colors',
                  zone === z ? 'bg-gold/10 text-gold' : 'bg-s1 text-t3 hover:text-t2',
                ].join(' ')}
              >
                {ZONE_LABELS[z]}
              </button>
            ))}
          </div>

          {zone === 'deposer' && (
            <DepotForm
              onDeposited={(msg) => {
                toast.success(msg);
                setZone('en-cours');
              }}
              onOpenDocument={openDocument}
            />
          )}

          {zone === 'en-cours' && <IngestionJobsQueue onOpenDocument={openDocument} />}

          {zone === 'a-verifier' && <AVerifierZone />}
        </div>
      </div>
    </AppLayout>
  );
}
