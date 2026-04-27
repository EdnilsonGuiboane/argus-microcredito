 import { useEffect } from "react";
 import { Toaster } from "@/components/ui/toaster";
 import { Toaster as Sonner } from "@/components/ui/sonner";
 import { TooltipProvider } from "@/components/ui/tooltip";
 import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
 import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
 import { AuthProvider } from "@/contexts/AuthContext";
 import { ThemeProvider } from "@/contexts/ThemeContext";
 import { MainLayout } from "@/components/layout/MainLayout";
 import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
 import { initializeMockData } from "@/services/mockService";
 import Login from "@/pages/Login";
 import Dashboard from "@/pages/Dashboard";
import Clientes from "@/pages/Clientes";
import Solicitacoes from "@/pages/Solicitacoes";
import Carteira from "@/pages/Carteira";
import Analise from "@/pages/Analise";
import Contratos from "@/pages/Contratos";
import Desembolsos from "@/pages/Desembolsos";
import Pagamentos from "@/pages/Pagamentos";
import Cobrancas from "@/pages/Cobrancas";
import Relatorios from "@/pages/Relatorios";
import Configuracoes from "@/pages/Configuracoes";
import NotFound from "./pages/NotFound";
import Simulador from "./pages/Simulador";
 
 const queryClient = new QueryClient();
 
 const App = () => {
   useEffect(() => {
     initializeMockData();
   }, []);
 
   return (
     <QueryClientProvider client={queryClient}>
       <ThemeProvider>
         <AuthProvider>
           <TooltipProvider>
             <Toaster />
             <Sonner />
             <BrowserRouter>
               <Routes>
                 <Route path="/login" element={<Login />} />
                 <Route path="/" element={<Navigate to="/dashboard" replace />} />
                 <Route element={<MainLayout />}>
                   <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/clientes" element={<ProtectedRoute requiredRoles={['admin', 'analyst']}><Clientes /></ProtectedRoute>} />
                  <Route path="/simulador" element={<ProtectedRoute requiredRoles={['admin', 'analyst']}><Simulador /></ProtectedRoute>} />
                    <Route path="/solicitacoes" element={<ProtectedRoute requiredRoles={['admin', 'analyst']}><Solicitacoes /></ProtectedRoute>} />
                    <Route path="/analise" element={<ProtectedRoute requiredRoles={['admin', 'analyst']}><Analise /></ProtectedRoute>} />
                    <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />
                    <Route path="/desembolsos" element={<ProtectedRoute requiredRoles={['admin', 'cashier']}><Desembolsos /></ProtectedRoute>} />
                    <Route path="/pagamentos" element={<ProtectedRoute requiredRoles={['admin', 'cashier']}><Pagamentos /></ProtectedRoute>} />
                    <Route path="/carteira" element={<ProtectedRoute><Carteira /></ProtectedRoute>} />
                    <Route path="/cobrancas" element={<ProtectedRoute requiredRoles={['admin', 'analyst']}><Cobrancas /></ProtectedRoute>} />
                    <Route path="/relatorios" element={<ProtectedRoute requiredRoles={['admin', 'analyst']}><Relatorios /></ProtectedRoute>} />
                    <Route path="/configuracoes" element={<ProtectedRoute requiredRoles={['admin']}><Configuracoes /></ProtectedRoute>} />
                 </Route>
                 <Route path="*" element={<NotFound />} />
               </Routes>
             </BrowserRouter>
           </TooltipProvider>
         </AuthProvider>
       </ThemeProvider>
     </QueryClientProvider>
   );
 };
 
 export default App;
