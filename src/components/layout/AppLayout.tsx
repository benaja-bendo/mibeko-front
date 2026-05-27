/**
 * AppLayout.tsx — Layout principal avec Sidebar + zone de contenu.
 * Wraps toutes les pages du tableau de bord Mibeko.
 */
import React from 'react';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
