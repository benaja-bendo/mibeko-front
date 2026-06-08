/**
 * templates.ts — Modèles de documents juridiques générables.
 *
 * Chaque modèle décrit ses champs (formulaire) et sait produire un document
 * HTML imprimable (export PDF via l'impression du navigateur). Volontairement
 * sans dépendance externe : on garde le contrôle de la mise en page.
 *
 * ⚠️ Ces trames sont des points de départ rédactionnels, à adapter par le
 * professionnel ; elles ne constituent pas un conseil juridique.
 */

export type TemplateFieldType = 'text' | 'textarea' | 'date' | 'number';

export interface TemplateField {
  key: string;
  label: string;
  type: TemplateFieldType;
  placeholder?: string;
  required?: boolean;
  /** Valeur par défaut. */
  defaultValue?: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category: 'Contentieux' | 'Sociétés' | 'Contrats';
  description: string;
  fields: TemplateField[];
  /** Construit le document final à partir des valeurs saisies. */
  build: (values: Record<string, string>) => { title: string; html: string };
}

/** Échappe le HTML pour éviter toute injection depuis les saisies utilisateur. */
function esc(value = ''): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Convertit les sauts de ligne en paragraphes pour les champs longs. */
function paragraphs(value = ''): string {
  return value
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

/** Coquille HTML commune (en-tête cabinet + corps). */
function wrap(title: string, body: string): string {
  return `
<section class="legal-doc">
  <header class="ld-head">
    <div class="ld-firm">Cabinet juridique</div>
    <div class="ld-meta">Document généré via Mibeko Pro</div>
  </header>
  <h1 class="ld-title">${esc(title)}</h1>
  ${body}
</section>`.trim();
}

const FR_DATE = () => new Date().toLocaleDateString('fr-FR');

export const TEMPLATES: DocumentTemplate[] = [
  // ─── Mise en demeure ───────────────────────────────────────────────────────
  {
    id: 'mise-en-demeure',
    name: 'Mise en demeure de payer',
    category: 'Contentieux',
    description:
      'Sommation de régler une créance échue, préalable à toute action en recouvrement.',
    fields: [
      { key: 'lieu', label: 'Fait à', type: 'text', placeholder: 'Kinshasa', required: true },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'expediteur', label: 'Expéditeur (créancier)', type: 'text', required: true },
      { key: 'destinataire', label: 'Destinataire (débiteur)', type: 'text', required: true },
      { key: 'adresse', label: 'Adresse du destinataire', type: 'textarea' },
      { key: 'montant', label: 'Montant dû', type: 'text', placeholder: '15 000 USD', required: true },
      { key: 'cause', label: 'Cause de la créance', type: 'textarea', placeholder: 'Facture n°… du …', required: true },
      { key: 'delai', label: 'Délai accordé (jours)', type: 'number', defaultValue: '8' },
    ],
    build: (v) => {
      const title = 'Mise en demeure';
      const body = `
        <p class="ld-right">${esc(v.lieu || '')}, le ${esc(v.date || FR_DATE())}</p>
        <p><strong>${esc(v.expediteur || '')}</strong></p>
        <p>À l'attention de <strong>${esc(v.destinataire || '')}</strong><br/>${esc(v.adresse || '')}</p>
        <p class="ld-object"><strong>Objet :</strong> Mise en demeure de payer</p>
        <p>Madame, Monsieur,</p>
        ${paragraphs(v.cause || '')}
        <p>Sauf erreur ou omission de notre part, vous restez devoir la somme de
        <strong>${esc(v.montant || '')}</strong>.</p>
        <p>En conséquence, nous vous mettons en demeure de régler cette somme dans un
        délai de <strong>${esc(v.delai || '8')} jours</strong> à compter de la réception
        de la présente. À défaut, nous nous réservons le droit d'engager toute action
        judiciaire utile au recouvrement de notre créance, majorée des intérêts et frais.</p>
        <p>Dans l'attente, nous vous prions d'agréer l'expression de nos salutations distinguées.</p>
        <p class="ld-sign">${esc(v.expediteur || '')}</p>`;
      return { title, html: wrap(title, body) };
    },
  },

  // ─── Statuts SARL (OHADA) ──────────────────────────────────────────────────
  {
    id: 'statuts-sarl',
    name: 'Statuts de SARL (OHADA)',
    category: 'Sociétés',
    description:
      'Trame de statuts d\'une SARL conforme à l\'Acte uniforme OHADA relatif aux sociétés commerciales.',
    fields: [
      { key: 'denomination', label: 'Dénomination sociale', type: 'text', required: true },
      { key: 'objet', label: 'Objet social', type: 'textarea', required: true },
      { key: 'siege', label: 'Siège social', type: 'text', required: true },
      { key: 'capital', label: 'Capital social', type: 'text', placeholder: '1 000 000 FCFA', required: true },
      { key: 'duree', label: 'Durée (années)', type: 'number', defaultValue: '99' },
      { key: 'gerant', label: 'Gérant', type: 'text', required: true },
      { key: 'associes', label: 'Associés (un par ligne)', type: 'textarea' },
    ],
    build: (v) => {
      const title = `Statuts — ${v.denomination || 'SARL'}`;
      const body = `
        <p>Les soussignés conviennent de constituer une Société à Responsabilité
        Limitée régie par l'Acte uniforme OHADA relatif au droit des sociétés
        commerciales et du groupement d'intérêt économique, et par les présents statuts.</p>
        <h2>Article 1 — Forme</h2>
        <p>Il est formé une société à responsabilité limitée (SARL).</p>
        <h2>Article 2 — Dénomination</h2>
        <p>La société a pour dénomination : <strong>${esc(v.denomination || '')}</strong>.</p>
        <h2>Article 3 — Objet</h2>
        ${paragraphs(v.objet || '')}
        <h2>Article 4 — Siège social</h2>
        <p>Le siège social est fixé à : ${esc(v.siege || '')}.</p>
        <h2>Article 5 — Durée</h2>
        <p>La durée de la société est fixée à <strong>${esc(v.duree || '99')} ans</strong>
        à compter de son immatriculation au RCCM.</p>
        <h2>Article 6 — Capital social</h2>
        <p>Le capital social est fixé à la somme de <strong>${esc(v.capital || '')}</strong>,
        divisé en parts sociales souscrites en totalité et intégralement libérées.</p>
        <h2>Article 7 — Associés</h2>
        ${paragraphs(v.associes || '')}
        <h2>Article 8 — Gérance</h2>
        <p>La société est gérée par <strong>${esc(v.gerant || '')}</strong>, nommé(e) pour
        la durée de la société.</p>
        <p class="ld-sign">Fait en autant d'originaux que de parties.</p>`;
      return { title, html: wrap(title, body) };
    },
  },

  // ─── Contrat de bail commercial ────────────────────────────────────────────
  {
    id: 'bail-commercial',
    name: 'Bail à usage professionnel',
    category: 'Contrats',
    description:
      'Contrat de bail à usage professionnel (commercial) selon l\'Acte uniforme OHADA sur le droit commercial général.',
    fields: [
      { key: 'bailleur', label: 'Bailleur', type: 'text', required: true },
      { key: 'preneur', label: 'Preneur', type: 'text', required: true },
      { key: 'local', label: 'Désignation du local', type: 'textarea', required: true },
      { key: 'destination', label: 'Destination des lieux', type: 'text' },
      { key: 'loyer', label: 'Loyer mensuel', type: 'text', required: true },
      { key: 'duree', label: 'Durée (années)', type: 'number', defaultValue: '3' },
      { key: 'depot', label: 'Dépôt de garantie', type: 'text' },
    ],
    build: (v) => {
      const title = 'Contrat de bail à usage professionnel';
      const body = `
        <p><strong>Entre les soussignés :</strong></p>
        <p>${esc(v.bailleur || '')}, ci-après « le Bailleur »,</p>
        <p>Et ${esc(v.preneur || '')}, ci-après « le Preneur »,</p>
        <p>Il a été convenu ce qui suit :</p>
        <h2>Article 1 — Objet</h2>
        <p>Le Bailleur donne à bail au Preneur les locaux suivants :</p>
        ${paragraphs(v.local || '')}
        <h2>Article 2 — Destination</h2>
        <p>Les lieux sont loués à usage de : ${esc(v.destination || '—')}.</p>
        <h2>Article 3 — Durée</h2>
        <p>Le présent bail est conclu pour une durée de <strong>${esc(v.duree || '3')} ans</strong>.</p>
        <h2>Article 4 — Loyer</h2>
        <p>Le loyer mensuel est fixé à <strong>${esc(v.loyer || '')}</strong>, payable
        d'avance.</p>
        <h2>Article 5 — Dépôt de garantie</h2>
        <p>Un dépôt de garantie de ${esc(v.depot || '—')} est versé à la signature.</p>
        <p class="ld-sign">Fait en deux exemplaires originaux.</p>`;
      return { title, html: wrap(title, body) };
    },
  },
];

/** Récupère un modèle par son identifiant. */
export const getTemplate = (id: string): DocumentTemplate | undefined =>
  TEMPLATES.find((t) => t.id === id);

/**
 * Feuille de style commune pour l'aperçu et l'impression d'un document.
 * Injectée à la fois dans l'aperçu (modale) et dans la fenêtre d'impression.
 */
export const DOC_PRINT_STYLES = `
  .legal-doc { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6; font-size: 12pt; }
  .legal-doc .ld-head { display: flex; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 8px; margin-bottom: 24px; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.08em; }
  .legal-doc .ld-firm { font-weight: 700; }
  .legal-doc .ld-meta { color: #777; }
  .legal-doc .ld-title { text-align: center; font-size: 16pt; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 24px; }
  .legal-doc h2 { font-size: 12pt; margin: 18px 0 6px; }
  .legal-doc p { margin: 0 0 10px; text-align: justify; }
  .legal-doc .ld-right { text-align: right; }
  .legal-doc .ld-object { margin: 18px 0; }
  .legal-doc .ld-sign { margin-top: 36px; font-style: italic; }
`;
