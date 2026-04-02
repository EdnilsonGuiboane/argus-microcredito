import { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { calcService } from '@/services/calcService';
import { loanService } from '@/services/loans/loanService';
import { clientService } from '@/services/clients/clientService';
import { portfolioService, type PortfolioStats } from '@/services/portfolio/portfolioService';
import { Loan, Client } from '@/models/types';
import { cn } from '@/lib/utils';

export default function Carteira() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCarteira() {
      try {
        setLoading(true);

        const [loansData, clientsData, portfolioStats] = await Promise.all([
          loanService.list(),
          clientService.list(),
          portfolioService.getStats(),
        ]);

        const activeLoans = loansData.filter((l) =>
          ['active', 'in_arrears'].includes(l.status)
        );

        setLoans(activeLoans);
        setClients(clientsData);
        setPortfolio(portfolioStats);
      } catch (error) {
        console.error('Erro ao carregar carteira:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCarteira();
  }, []);

  const getClient = (id: string) => clients.find((c) => c.id === id);

  const sortedLoans = useMemo(() => {
    return [...loans].sort((a, b) => {
      if (b.daysOverdue !== a.daysOverdue) {
        return b.daysOverdue - a.daysOverdue;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [loans]);

  if (loading) {
    return <div className="p-6">A carregar carteira...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Carteira de Empréstimos</h1>
        <p className="text-muted-foreground">{loans.length} empréstimos activos</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Carteira Activa</p>
                <p className="text-2xl font-bold">
                  {calcService.formatCurrency(portfolio?.activePortfolio || 0)}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Capital em Dívida</p>
                <p className="text-2xl font-bold">
                  {calcService.formatCurrency(portfolio?.totalOutstandingPrincipal || 0)}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Juros em Dívida</p>
                <p className="text-2xl font-bold">
                  {calcService.formatCurrency(portfolio?.totalOutstandingInterest || 0)}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Atraso</p>
                <p className="text-2xl font-bold text-destructive">
                  {portfolio?.inArrearsLoans || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nº Empréstimo</th>
                  <th>Cliente</th>
                  <th>Capital</th>
                  <th>Saldo</th>
                  <th>Próx. Parcela</th>
                  <th>Atraso</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {sortedLoans.slice(0, 50).map((loan, i) => {
                  const client = getClient(loan.clientId);
                  const totalOutstanding =
                    loan.outstandingPrincipal + loan.outstandingInterest;

                  return (
                    <motion.tr
                      key={loan.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      <td className="font-medium">{loan.loanNumber}</td>
                      <td>{client?.fullName || loan.clientId}</td>
                      <td>{calcService.formatCurrency(loan.principalAmount)}</td>
                      <td>{calcService.formatCurrency(totalOutstanding)}</td>
                      <td>
                        {loan.nextPaymentDate
                          ? new Date(loan.nextPaymentDate).toLocaleDateString('pt-MZ')
                          : '-'}
                      </td>
                      <td
                        className={cn(
                          loan.daysOverdue > 0 && 'text-destructive font-medium'
                        )}
                      >
                        {loan.daysOverdue > 0 ? `${loan.daysOverdue} dias` : '-'}
                      </td>
                      <td>
                        <span
                          className={cn(
                            'status-badge',
                            loan.status === 'in_arrears'
                              ? 'bg-destructive/15 text-destructive'
                              : 'bg-success/15 text-success'
                          )}
                        >
                          {loan.status === 'in_arrears' ? 'Em Atraso' : 'Activo'}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>

            {sortedLoans.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">
                Nenhum empréstimo activo encontrado
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}