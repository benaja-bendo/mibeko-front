export const channelLabel = (value: string | null) => value === 'mobile_money' ? 'Mobile Money' : value === 'bank_transfer' ? 'Virement bancaire' : value === 'cash' || value === 'especes' ? 'Espèces' : value ?? 'Non renseigné';
export const creditLabel = { purchase: 'Achat', correction: 'Correction', consumption: 'Utilisation' };
export const grantLabel = { active: 'Actif', ended: 'Terminé', scheduled: 'À venir', revoked: 'Accès retiré' };
export const paymentOrderLabel = {
  awaiting_payment: 'Paiement attendu',
  payment_declared: 'Paiement déclaré',
  verifying: 'Vérification en cours',
  activated: 'Activé',
  rejected: 'Refusé',
};
