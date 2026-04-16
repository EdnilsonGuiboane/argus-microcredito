import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bell,
  Sun,
  Moon,
  User,
  X,
  FileText,
  Users,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { clientService } from '@/services/clients/clientService';
import { applicationService } from '@/services/applications/applicationService';
import { loanService } from '@/services/loans/loanService';
import { LoanApplication, Loan } from '@/models/types';
import { useIsMobile } from '@/hooks/use-mobile';

interface SearchResult {
  type: 'client' | 'application' | 'loan';
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

export function Topbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }

      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      void runSearch(searchQuery.trim());
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  async function runSearch(queryText: string) {
    try {
      setSearchLoading(true);

      const [clients, applications, loans] = await Promise.all([
        clientService.list(),
        applicationService.list(),
        loanService.list(),
      ]);

      const query = queryText.toLowerCase();
      const results: SearchResult[] = [];

      clients
        .filter(
          (c) =>
            c.fullName.toLowerCase().includes(query) ||
            c.biNumber.toLowerCase().includes(query) ||
            c.phone.includes(query)
        )
        .slice(0, 3)
        .forEach((c) => {
          results.push({
            type: 'client',
            id: c.id,
            title: c.fullName,
            subtitle: `BI: ${c.biNumber}`,
            path: '/clientes',
          });
        });

      applications
        .filter(
          (a: LoanApplication) =>
            a.id.toLowerCase().includes(query) ||
            a.clientId.toLowerCase().includes(query)
        )
        .slice(0, 3)
        .forEach((a) => {
          const client = clients.find((c) => c.id === a.clientId);
          results.push({
            type: 'application',
            id: a.id,
            title: `Solicitação ${a.id.slice(0, 8)}`,
            subtitle: client?.fullName || a.clientId,
            path:
              ['submitted', 'under_review', 'pending_documents'].includes(a.status)
                ? '/analise'
                : '/solicitacoes',
          });
        });

      loans
        .filter(
          (l: Loan) =>
            l.loanNumber.toLowerCase().includes(query) ||
            l.id.toLowerCase().includes(query)
        )
        .slice(0, 3)
        .forEach((l) => {
          const client = clients.find((c) => c.id === l.clientId);
          results.push({
            type: 'loan',
            id: l.id,
            title: l.loanNumber,
            subtitle: client?.fullName || l.clientId,
            path: '/carteira',
          });
        });

      setSearchResults(results);
    } catch (error) {
      console.error('Erro na pesquisa global:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  const handleResultClick = (result: SearchResult) => {
    navigate(result.path);
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'client':
        return Users;
      case 'application':
        return FileText;
      case 'loan':
        return CreditCard;
    }
  };

  return (
    <header
      className={
        isMobile
          ? 'h-16 bg-card border-b border-border flex items-center justify-between px-3 pl-14'
          : 'h-16 bg-card border-b border-border flex items-center justify-between px-6'
      }
    >
      <div className="relative flex-1 max-w-xl">
        <AnimatePresence>
          {searchOpen ? (
            <motion.div
              initial={{ opacity: 0, width: '40px' }}
              animate={{ opacity: 1, width: '100%' }}
              exit={{ opacity: 0, width: '40px' }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isMobile
                    ? 'Pesquisar...'
                    : 'Pesquisar clientes, solicitações, empréstimos...'
                }
                className="pl-10 pr-10 bg-muted/50 border-none focus-visible:ring-1"
              />

              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>

              {(searchLoading || searchResults.length > 0 || searchQuery.length >= 2) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50"
                >
                  {searchLoading ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      A pesquisar...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((result) => {
                      const Icon = getResultIcon(result.type);

                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleResultClick(result)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {result.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {result.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      Nenhum resultado encontrado
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Search className="w-4 h-4 mr-2" />
                <span className="text-sm hidden sm:inline">Pesquisar...</span>

                {!isMobile && (
                  <kbd className="ml-4 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground relative"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground px-2"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>

              <span className="text-sm font-medium hidden sm:inline">
                {user?.fullName?.split(' ')[0] || 'User'}
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
              Configurações
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => void logout()}
              className="text-destructive"
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}