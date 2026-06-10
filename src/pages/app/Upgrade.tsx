import { Link } from 'react-router-dom';
import AppLayout from '@/shared/components/layout/AppLayout';

const BENEFITS = [
  'Bibliotheque juridique centralisee',
  'Assistant IA avec citations',
  'Organisation des recherches par dossiers',
];

/**
 * Présente une page simple de découverte de l'offre Pro pour éviter les CTA cassés.
 */
export default function Upgrade() {
  return (
    <AppLayout>
      <div className="h-full overflow-y-auto bg-bg">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="rounded-2xl border border-b1 bg-s1 p-8 shadow-sm">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-gold">
              Mibeko Pro
            </div>

            <h1 className="mt-4 text-3xl font-display font-semibold text-t1">
              Passez a l&apos;offre Pro
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-t2">
              Debloquez les outils de recherche, d&apos;analyse et de gestion documentaire
              pour votre pratique juridique.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {BENEFITS.map((benefit) => (
                <div key={benefit} className="rounded-xl border border-b1 bg-s2 p-4">
                  <div className="text-sm font-medium text-t1">{benefit}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/app/library"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-gold px-4 text-sm font-semibold text-on-gold transition-opacity hover:opacity-90"
              >
                Voir la bibliotheque
              </Link>
              <a
                href="https://mibeko.fr"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-b1 bg-s1 px-4 text-sm font-medium text-t2 transition-colors hover:bg-s2 hover:text-t1"
              >
                Decouvrir l&apos;offre
              </a>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
