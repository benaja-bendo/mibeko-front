import { Link } from 'react-router-dom';
import logoMibeko from '@/assets/logo_mibeko.svg';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  /** Liens de bas de carte (« Déjà un compte ? », « Mot de passe oublié »…). */
  footer?: React.ReactNode;
}

/**
 * Habillage commun aux écrans d'authentification.
 *
 * Extrait de `LoginPage` quand l'inscription et la réinitialisation de mot de
 * passe sont arrivées : quatre copies du même en-tête auraient dérivé l'une de
 * l'autre au premier changement de marque.
 */
export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link to="/auth/login" className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
            <img src={logoMibeko} alt="Mibeko Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-t1 font-display text-xl font-semibold leading-tight">Mibeko</div>
            <div className="text-t3 font-mono text-[10px] uppercase tracking-widest">LegalTech</div>
          </div>
        </Link>

        <div className="bg-s1 border border-b1 rounded-xl p-6 space-y-5">
          <div>
            <h1 className="text-t1 font-display text-lg font-semibold">{title}</h1>
            <p className="text-t3 text-sm mt-1">{subtitle}</p>
          </div>

          {children}
        </div>

        {footer && <div className="mt-5 text-center text-sm text-t3 space-y-1.5">{footer}</div>}
      </div>
    </div>
  );
}
