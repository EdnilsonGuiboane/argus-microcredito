import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Users,
  FileText,
  CheckCircle,
  Banknote,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KPICard } from '@/components/dashboard/KPICard';
import { calcService } from '@/services/calcService';
import { loanService } from '@/services/loans/loanService';
import { paymentService } from '@/services/payments/paymentService';
import { applicationService } from '@/services/applications/applicationService';
import { clientService } from '@/services/clients/clientService';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  portfolioService,
  type PortfolioStats,
} from '@/services/portfolio/portfolioService';
import { Loan, LoanApplication, Client, InstallmentPayment } from '@/models/types';


export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<PortfolioStats | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [payments, setPayments] = useState<InstallmentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);

        const [portfolioStats, loansData, applicationsData, clientsData, paymentsData] =
          await Promise.all([
            portfolioService.getStats(),
            loanService.list(),
            applicationService.list(),
            clientService.list(),
            paymentService.list(),
          ]);

        setPortfolio(portfolioStats);
        setLoans(loansData);
        setApplications(applicationsData);
        setClients(clientsData);
        setPayments(paymentsData);
      } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const dashboardStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = now.toISOString().split('T')[0];

    const inReview = applications.filter((a) =>
      ['submitted', 'under_review', 'pending_documents'].includes(a.status)
    ).length;

    const approvedToday = applications.filter(
      (a) => a.status === 'approved' && a.reviewedAt?.startsWith(today)
    ).length;

    const disbursedThisMonth = loans
      .filter((l) => l.disbursedAt && new Date(l.disbursedAt) >= startOfMonth)
      .reduce((sum, l) => sum + l.disbursedAmount, 0);

    const paymentsThisMonth = payments
      .filter((p) => {
        if (!p.paymentDate || p.totalPaid <= 0) return false;
        const paidDate = new Date(p.paymentDate);
        return (
          paidDate.getMonth() === now.getMonth() &&
          paidDate.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, p) => sum + p.totalPaid, 0);

    return {
      totalClients: clients.length,
      inReview,
      approvedToday,
      disbursedThisMonth,
      paymentsThisMonth,
    };
  }, [applications, loans, clients, payments]);

  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthStart.toLocaleDateString('pt-MZ', { month: 'short' });

      const disbursed = loans
        .filter((l) => {
          if (!l.disbursedAt) return false;
          const d = new Date(l.disbursedAt);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((sum, l) => sum + l.disbursedAmount, 0);

      const received = payments
        .filter((p) => {
          if (!p.paymentDate || p.totalPaid <= 0) return false;
          const d = new Date(p.paymentDate);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((sum, p) => sum + p.totalPaid, 0);

      months.push({
        name: monthName,
        desembolsado: Math.round(disbursed),
        recebido: Math.round(received),
      });
    }

    return months;
  }, [loans, payments]);

  const agingChartData = useMemo(() => {
    if (!portfolio) return [];

    return [
      { name: 'Em dia', value: portfolio.agingBuckets.current, color: 'hsl(150, 60%, 45%)' },
      { name: '1-30 dias', value: portfolio.agingBuckets.days1_30, color: 'hsl(38, 92%, 50%)' },
      { name: '31-60 dias', value: portfolio.agingBuckets.days31_60, color: 'hsl(25, 90%, 55%)' },
      { name: '61-90 dias', value: portfolio.agingBuckets.days61_90, color: 'hsl(10, 85%, 55%)' },
      { name: '90+ dias', value: portfolio.agingBuckets.days90Plus, color: 'hsl(0, 72%, 51%)' },
    ].filter((d) => d.value > 0);
  }, [portfolio]);

  if (loading || !portfolio) {
    return <div className="p-6">A carregar dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema de microcrédito</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Carteira Activa"
          value={calcService.formatCurrency(portfolio.activePortfolio)}
          subtitle={`${portfolio.activeLoans} empréstimos activos`}
          icon={Briefcase}
          variant="primary"
          delay={0}
        />

        <KPICard
          title="Solicitações em Análise"
          value={dashboardStats.inReview.toString()}
          subtitle="Aguardando decisão"
          icon={FileText}
          variant="info"
          delay={0.1}
        />

        <KPICard
          title="Desembolsado (Mês)"
          value={calcService.formatCurrency(dashboardStats.disbursedThisMonth)}
          subtitle={`${dashboardStats.approvedToday} aprovados hoje`}
          icon={Banknote}
          variant="success"
          delay={0.2}
        />

        <KPICard
          title="Inadimplência"
          value={calcService.formatPercentage(portfolio.delinquencyRate)}
          subtitle={`${calcService.formatCurrency(portfolio.overdueAmount)} em atraso`}
          icon={AlertTriangle}
          variant={portfolio.delinquencyRate > 10 ? 'danger' : 'warning'}
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Clientes"
          value={dashboardStats.totalClients.toString()}
          icon={Users}
          variant="default"
          delay={0.4}
        />

        <KPICard
          title="Aprovados Hoje"
          value={dashboardStats.approvedToday.toString()}
          icon={CheckCircle}
          variant="default"
          delay={0.5}
        />

        <KPICard
          title="Pagamentos (Mês)"
          value={calcService.formatCurrency(dashboardStats.paymentsThisMonth)}
          icon={CreditCard}
          variant="default"
          delay={0.6}
        />

        <KPICard
          title="Em Atraso"
          value={portfolio.inArrearsLoans.toString()}
          subtitle="Empréstimos com atraso"
          icon={AlertTriangle}
          variant="default"
          delay={0.7}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="card-elevated h-full">
            <CardHeader>
              <CardTitle className="text-lg">Desembolsos vs Pagamentos</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(215, 70%, 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(215, 70%, 45%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(150, 60%, 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(150, 60%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => calcService.formatCurrency(value)}
                    />

                    <Area
                      type="monotone"
                      dataKey="desembolsado"
                      stroke="hsl(215, 70%, 45%)"
                      fillOpacity={1}
                      fill="url(#colorDisbursed)"
                      name="Desembolsado"
                    />

                    <Area
                      type="monotone"
                      dataKey="recebido"
                      stroke="hsl(150, 60%, 45%)"
                      fillOpacity={1}
                      fill="url(#colorReceived)"
                      name="Recebido"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="card-elevated h-full">
            <CardHeader>
              <CardTitle className="text-lg">Aging de Carteira</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={agingChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {agingChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>

                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => calcService.formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {agingChartData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}