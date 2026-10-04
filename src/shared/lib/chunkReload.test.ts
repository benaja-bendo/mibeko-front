import { isChunkLoadError, reloadForNewBuild } from './chunkReload';

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://app.mibeko.fr/assets/AdminDashboard-BVvB4ZQK.js',
    'error loading dynamically imported module: https://app.mibeko.fr/assets/Library-x.js',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/pdf-rptWOpCb.css',
  ])('reconnaît « %s »', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it('ne confond pas une erreur de rendu ordinaire', () => {
    expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(false);
  });

  it('accepte une valeur levée qui n’est pas une Error', () => {
    expect(isChunkLoadError('Failed to fetch dynamically imported module: /assets/a.js')).toBe(true);
    expect(isChunkLoadError(undefined)).toBe(false);
    expect(isChunkLoadError({ status: 404 })).toBe(false);
  });
});

describe('reloadForNewBuild', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-04T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('recharge une première fois', () => {
    const reload = vi.fn();

    expect(reloadForNewBuild(reload)).toBe(true);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('refuse un second rechargement dans les 10 secondes, pour ne pas boucler', () => {
    const reload = vi.fn();
    reloadForNewBuild(reload);

    vi.advanceTimersByTime(9_000);

    expect(reloadForNewBuild(reload)).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it('recharge de nouveau au déploiement suivant', () => {
    const reload = vi.fn();
    reloadForNewBuild(reload);

    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(reloadForNewBuild(reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('ne recharge pas hors ligne', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const reload = vi.fn();

    expect(reloadForNewBuild(reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('ne recharge pas sans sessionStorage, faute de garde-fou', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Accès refusé', 'SecurityError');
    });
    const reload = vi.fn();

    expect(reloadForNewBuild(reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
