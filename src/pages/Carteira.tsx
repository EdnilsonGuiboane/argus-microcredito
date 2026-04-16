import { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { calcService } from '@/services/calcService';
import { loanService } from '@/services/loans/loanService';
import { clientService } from '@/services/clients/clientService';
import { Loan, Client } from '@/models/types';
import { cn } from '@/lib/utils';

export default function Carteira() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCarteira() {
      try {
        setLoading(true);

        const [loansData, clientsData] = await Promise.all([
          loanService.list(),
          clientService.list(),
        ]);
        

        const eligibleLoans = loansData.filter((loan) => {
          const outstandingTotal =
            (loan.outstandingPrincipal || 0) + (loan.outstandingInterest || 0);

          const hasDisbursement = !!loan.disbursedAt;
          const hasOutstanding = outstandingTotal > 0;
          const isNotClosed =
            loan.status !== 'closed' && loan.status !== 'cancelled';

          return hasDisbursement && hasOutstanding && isNotClosed;
        });

        setLoans(eligibleLoans);
        setClients(clientsData);
      } catch (error) {
        console.error('Erro ao carregar carteira:', error);
      } finally {
        setLoading(false);
      }
    }

    void loadCarteira();
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

  const portfolio = useMemo(() => {
    const activePortfolio = loans.reduce(
      (sum, loan) =>
        sum + (loan.outstandingPrincipal || 0) + (loan.outstandingInterest || 0),
      0
    );

    const totalOutstandingPrincipal = loans.reduce(
      (sum, loan) => sum + (loan.outstandingPrincipal || 0),
      0
    );

    const totalOutstandingInterest = loans.reduce(
      (sum, loan) => sum + (loan.outstandingInterest || 0),
      0
    );

    const inArrearsLoans = loans.filter(
      (loan) => loan.daysOverdue > 0 || loan.status === 'in_arrears'
    ).length;

    return {
      activePortfolio,
      totalOutstandingPrincipal,
      totalOutstandingInterest,
      inArrearsLoans,
    };
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
                  {calcService.formatCurrency(portfolio.activePortfolio)}
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
                  {calcService.formatCurrency(portfolio.totalOutstandingPrincipal)}
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
                  {calcService.formatCurrency(portfolio.totalOutstandingInterest)}
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
                  {portfolio.inArrearsLoans}
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
                    (loan.outstandingPrincipal || 0) +
                    (loan.outstandingInterest || 0);

                  const isInArrears =
                    loan.daysOverdue > 0 || loan.status === 'in_arrears';

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
                          isInArrears && 'text-destructive font-medium'
                        )}
                      >
                        {loan.daysOverdue > 0 ? `${loan.daysOverdue} dias` : '-'}
                      </td>
                      <td>
                        <span
                          className={cn(
                            'status-badge',
                            isInArrears
                              ? 'bg-destructive/15 text-destructive'
                              : 'bg-success/15 text-success'
                          )}
                        >
                          {isInArrears ? 'Em Atraso' : 'Activo'}
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