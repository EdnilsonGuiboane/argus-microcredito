 import { Outlet, Navigate } from 'react-router-dom';
 import { motion } from 'framer-motion';
 import { AppSidebar } from './AppSidebar';
 import { Topbar } from './Topbar';
 import { useAuth } from '@/contexts/AuthContext';
 
 export function MainLayout() {
   const { isAuthenticated, isLoading } = useAuth();
 
   if (isLoading) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-background">
         <div className="animate-pulse flex flex-col items-center gap-4">
           <div className="w-12 h-12 rounded-lg bg-primary/20" />
           <div className="h-4 w-32 rounded bg-muted" />
         </div>
       </div>
     );
   }
 
   if (!isAuthenticated) {
     return <Navigate to="/login" replace />;
   }
 
   return (
     <div className="min-h-screen bg-background">
       <AppSidebar />
       <div className="pl-[72px] lg:pl-64 transition-all duration-200">
         <Topbar />
         <motion.main
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.3 }}
           className="p-6"
         >
           <Outlet />
         </motion.main>
       </div>
     </div>
   );
 }