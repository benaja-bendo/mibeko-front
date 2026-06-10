import { RouterProvider } from 'react-router-dom';
import { TooltipProvider } from '@/shared/components/ui/Tooltip';
import AuthProvider from './app/providers/AuthProvider';
import { ThemeAccountSync } from './app/providers/ThemeAccountSync';
import { router } from './app/router';

export default function App() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <ThemeAccountSync />
        <RouterProvider router={router} />
      </AuthProvider>
    </TooltipProvider>
  );
}
