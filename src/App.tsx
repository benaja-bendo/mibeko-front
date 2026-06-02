import { RouterProvider } from 'react-router-dom';
import { TooltipProvider } from '@/shared/components/ui/Tooltip';
import AuthProvider from './app/providers/AuthProvider';
import { router } from './app/router';

export default function App() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </TooltipProvider>
  );
}
