import React from 'react';
import { cn } from '@/shared/lib/utils';

/**
 * Conteneur standard des pages plein écran (espaces éditeur/admin) :
 * même largeur maximale et mêmes gouttières partout pour éviter tout
 * décalage horizontal du contenu lors de la navigation entre pages.
 */
export default function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('max-w-screen-2xl mx-auto w-full px-4 md:px-6 py-6', className)}>
      {children}
    </div>
  );
}
