import React from 'react';
import Sidebar from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  space?: 'editor' | 'app' | 'admin';
}

export default function AppLayout({ children, space = 'editor' }: AppLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg">
      <Sidebar space={space} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}
