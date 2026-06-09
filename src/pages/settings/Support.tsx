import { Mail, BookOpen, FileText, Shield, Scale, ExternalLink } from 'lucide-react';
import type { ComponentType } from 'react';
import SettingsLayout from './SettingsLayout';
import { SettingsCard } from '@/features/settings';

interface LinkRow {
  icon: ComponentType<{ className?: string }>;
  label: string;
  description: string;
  href: string;
  external?: boolean;
}

const HELP_LINKS: LinkRow[] = [
  {
    icon: BookOpen,
    label: "Centre d'aide",
    description: 'Guides et réponses aux questions fréquentes.',
    href: 'https://mibeko.fr/aide',
    external: true,
  },
  {
    icon: Mail,
    label: 'Contacter le support',
    description: 'Notre équipe vous répond sous 24 h ouvrées.',
    href: 'mailto:support@mibeko.fr',
  },
];

const LEGAL_LINKS: LinkRow[] = [
  { icon: FileText, label: "Conditions générales (CGU/CGV)", description: "Conditions d'utilisation du service.", href: 'https://mibeko.fr/cgu', external: true },
  { icon: Shield, label: 'Politique de confidentialité', description: 'Traitement et protection de vos données.', href: 'https://mibeko.fr/confidentialite', external: true },
  { icon: Scale, label: 'Mentions légales', description: "Informations sur l'éditeur du service.", href: 'https://mibeko.fr/mentions-legales', external: true },
];

/** Rangée de lien cliquable homogène (aide ou légal). */
function LinkItem({ icon: Icon, label, description, href, external }: LinkRow) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 group"
    >
      <div className="w-9 h-9 rounded-md bg-s2 border border-b1 flex items-center justify-center text-t2 shrink-0 group-hover:text-gold transition-colors">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-t1 group-hover:text-gold transition-colors">{label}</div>
        <p className="text-xs text-t3 mt-0.5">{description}</p>
      </div>
      {external && <ExternalLink className="w-3.5 h-3.5 text-t4 shrink-0" />}
    </a>
  );
}

/**
 * Page « Support & Légal » : assistance, centre d'aide et documents juridiques.
 *
 * Contenu statique (liens vers le site public) ; aucune donnée utilisateur n'y transite.
 */
export default function Support() {
  return (
    <SettingsLayout title="Support & Légal" description="Assistance, documentation et informations juridiques.">
      <div className="space-y-6">
        <SettingsCard title="Aide & contact" description="Besoin d'un coup de main ? Nous sommes là.">
          <div className="divide-y divide-b1">
            {HELP_LINKS.map((link) => (
              <LinkItem key={link.label} {...link} />
            ))}
          </div>
        </SettingsCard>

        <SettingsCard title="Documents juridiques" description="Cadre contractuel et conformité.">
          <div className="divide-y divide-b1">
            {LEGAL_LINKS.map((link) => (
              <LinkItem key={link.label} {...link} />
            ))}
          </div>
        </SettingsCard>

        <p className="text-xs text-t4 text-center font-mono">
          Mibeko — LegalTech · {new Date().getFullYear()}
        </p>
      </div>
    </SettingsLayout>
  );
}
