import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LegalArticleBody } from '@/shared/components/LegalArticleBody';

const BUDGET =
  '<table><tr><td>Chapitres</td><td>NOMENCLATURE</td><td>Crédits</td></tr>' +
  '<tr><td>3-2-1</td><td>Assemblée législative</td><td>37.000.000</td></tr></table>';

describe('LegalArticleBody', () => {
  it("rend une vraie table, jamais le balisage, à partir d'un contenu hérité", () => {
    const { container } = render(<LegalArticleBody content={`Barème :\n${BUDGET}`} />);

    expect(container.querySelectorAll('table')).toHaveLength(1);
    expect(container.querySelectorAll('thead th')).toHaveLength(3);
    expect(screen.getByText('Assemblée législative')).toBeInTheDocument();
    expect(screen.getByText('Barème :')).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('&lt;td&gt;');
    // Montant : aligné à droite, chiffres tabulaires.
    expect(screen.getByText('37.000.000').className).toContain('tabular-nums');
  });

  it('préfère la structure servie par l\'API au balisage résiduel', () => {
    const { container } = render(
      <LegalArticleBody
        content={"Chapitre | Montant\n3-2-1 | 50.000.000"}
        tables={[{ caption: 'Crédits ouverts', headers: ['Chapitre', 'Montant'], rows: [['3-2-1', '50.000.000']], line_start: 0, line_end: 2 }]}
      />,
    );

    expect(container.querySelector('figcaption')?.textContent).toBe('Crédits ouverts');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(container.textContent).not.toContain('|');
  });

  it('affiche le repli sur un contenu vide', () => {
    render(<LegalArticleBody content={null} emptyLabel="—" />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
