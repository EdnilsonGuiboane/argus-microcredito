 import { Navigate } from 'react-router-dom';
 import { useAuth } from '@/contexts/AuthContext';
 import { UserRole } from '@/models/types';
 
 interface ProtectedRouteProps {
   children: React.ReactNode;
   requiredRoles?: UserRole[];
 }
 
 export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
   const { isAuthenticated, canAccess, isLoading } = useAuth();
 
   if (isLoading) {
     return null;
   }
 
   if (!isAuthenticated) {
     return <Navigate to="/login" replace />;
   }
 
   if (requiredRoles && !canAccess(requiredRoles)) {
     return <Navigate to="/dashboard" replace />;
   }
 
   return <>{children}</>;
 }