import { lazy, Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { reloadForNewBuild } from '@/shared/lib/chunkReload';
import { RouteErrorPage } from './RouteErrorPage';

vi.mock('@/shared/lib/chunkReload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/chunkReload')>()),
  reloadForNewBuild: vi.fn(),
}));

const staleChunkError = new TypeError(
  'Failed to fetch dynamically imported module: https://app.mibeko.fr/assets/AdminDashboard-BVvB4ZQK.js',
);

function Throws({ error }: { error: Error }): never {
  throw error;
}

/** Même montage que `src/app/router/index.tsx` : une route racine porte l'errorElement. */
function renderRoute(element: React.ReactNode) {
  const router = createMemoryRouter(
    [{ errorElement: <RouteErrorPage />, children: [{ path: '/admin', element }] }],
    { initialEntries: ['/admin'] },
  );
  return render(<RouterProvider router={router} />);
}

describe('RouteErrorPage', () => {
  beforeEach(() => {
    // React journalise toute erreur rattrapée par une frontière : bruit attendu.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('recharge l’onglet quand le module d’une page lazy a disparu après un déploiement', async () => {
    vi.mocked(reloadForNewBuild).mockReturnValue(true);
    const AdminDashboard = lazy(() => Promise.reject(staleChunkError));

    renderRoute(
      <Suspense fallback="Chargement…">
        <AdminDashboard />
      </Suspense>,
    );

    expect(await screen.findByText('Nouvelle version de Mibeko')).toBeInTheDocument();
    expect(reloadForNewBuild).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Hey developer/)).not.toBeInTheDocument();
  });

  it('propose un rechargement manuel quand le rechargement automatique est refusé', async () => {
    vi.mocked(reloadForNewBuild).mockReturnValue(false);

    renderRoute(<Throws error={staleChunkError} />);

    expect(await screen.findByText('Page indisponible')).toBeInTheDocument();
    expect(screen.getByText(staleChunkError.message)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recharger la page' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: "Retour à l'accueil" })).not.toBeInTheDocument();
  });

  it('affiche les autres erreurs sans recharger, avec une issue', () => {
    renderRoute(<Throws error={new TypeError("Cannot read properties of undefined (reading 'id')")} />);

    expect(screen.getByText('Une erreur est survenue')).toBeInTheDocument();
    expect(screen.getByText("Cannot read properties of undefined (reading 'id')")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recharger la page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Retour à l'accueil" })).toBeInTheDocument();
    expect(reloadForNewBuild).not.toHaveBeenCalled();
  });
});
