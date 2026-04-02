import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardCheck,
  FileSignature,
  Banknote,
  CreditCard,
  Briefcase,
  PhoneCall,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserRole } from '@/models/types';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'analyst', 'cashier'] },
  { path: '/clientes', label: 'Clientes', icon: Users, roles: ['admin', 'analyst'] },
  { path: '/solicitacoes', label: 'Solicitações', icon: FileText, roles: ['admin', 'analyst'] },
  { path: '/analise', label: 'Análise', icon: ClipboardCheck, roles: ['admin', 'analyst'] },
  { path: '/contratos', label: 'Contratos', icon: FileSignature, roles: ['admin', 'analyst', 'cashier'] },
  { path: '/desembolsos', label: 'Desembolsos', icon: Banknote, roles: ['admin', 'cashier'] },
  { path: '/pagamentos', label: 'Pagamentos', icon: CreditCard, roles: ['admin', 'cashier'] },
  { path: '/carteira', label: 'Carteira', icon: Briefcase, roles: ['admin', 'analyst', 'cashier'] },
  { path: '/cobrancas', label: 'Cobranças', icon: PhoneCall, roles: ['admin', 'analyst'] },
  { path: '/relatorios', label: 'Relatórios', icon: BarChart3, roles: ['admin', 'analyst'] },
  { path: '/configuracoes', label: 'Configurações', icon: Settings, roles: ['admin'] },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, roles, logout, canAccess } = useAuth();
  const location = useLocation();

  const visibleItems = navItems.filter((item) => canAccess(item.roles));

  const primaryRole: UserRole | null = roles[0] ?? null;

  const getRoleBadge = (role: UserRole) => {
    const badges: Record<UserRole, { label: string; color: string }> = {
      admin: { label: 'Admin', color: 'bg-primary/20 text-primary' },
      analyst: { label: 'Analista', color: 'bg-accent/20 text-accent' },
      cashier: { label: 'Caixa', color: 'bg-success/20 text-success' },
    };
    return badges[role];
  };

  const initials =
    user?.fullName
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border flex flex-col"
    >
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="font-semibold text-sidebar-foreground whitespace-nowrap overflow-hidden"
              >
                Microcrédito
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        <ul className="space-y-1 px-3">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            const linkContent = (
              <NavLink
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  'hover:bg-sidebar-accent group',
                  isActive && 'bg-sidebar-accent text-sidebar-primary'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 flex-shrink-0 transition-colors',
                    isActive
                      ? 'text-sidebar-primary'
                      : 'text-sidebar-muted group-hover:text-sidebar-foreground'
                  )}
                />

                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className={cn(
                        'text-sm font-medium whitespace-nowrap overflow-hidden',
                        isActive
                          ? 'text-sidebar-foreground'
                          : 'text-sidebar-muted group-hover:text-sidebar-foreground'
                      )}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );

            return (
              <li key={item.path}>
                {collapsed ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" sideOffset={10}>
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  linkContent
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {user && (
          <div
            className={cn(
              'flex items-center gap-3 p-2 rounded-lg',
              collapsed ? 'justify-center' : ''
            )}
          >
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-sidebar-foreground">
                {initials}
              </span>
            </div>

            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex-1 overflow-hidden"
                >
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {user.fullName}
                  </p>

                  {primaryRole && (
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        getRoleBadge(primaryRole).color
                      )}
                    >
                      {getRoleBadge(primaryRole).label}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {!collapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void logout()}
                    className="text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
    </motion.aside>
  );
}