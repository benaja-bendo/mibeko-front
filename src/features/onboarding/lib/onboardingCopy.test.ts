import { describe, it, expect } from 'vitest';
import { onboardingCopy } from './onboardingCopy';

describe('onboardingCopy', () => {
  it('résout une clé connue', () => {
    expect(onboardingCopy('onboarding.welcome.title')).toBe('Bienvenue sur Mibeko');
    expect(onboardingCopy('onboarding.discover_sources.cta')).toBe('Continuer');
  });

  it('retombe sur le repli pour une clé inconnue, jamais la clé brute', () => {
    expect(onboardingCopy('onboarding.future_step.title', 'Repli')).toBe('Repli');
    expect(onboardingCopy('onboarding.future_step.title', 'Repli')).not.toBe('onboarding.future_step.title');
  });

  it('retombe sur le repli pour une clé absente', () => {
    expect(onboardingCopy(null, 'Repli')).toBe('Repli');
    expect(onboardingCopy(undefined)).toBe('');
  });
});
