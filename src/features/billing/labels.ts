export const channelLabel = (value: string | null) => value === 'mobile_money' ? 'Mobile Money' : value === 'especes' ? 'Espèces' : value ?? 'Non renseigné';
export const creditLabel = { purchase: 'Achat', correction: 'Correction', consumption: 'Utilisation' };
export const grantLabel = { active: 'Actif', ended: 'Terminé', scheduled: 'À venir' };
