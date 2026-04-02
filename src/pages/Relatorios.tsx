import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Building2,
  Briefcase,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  DollarSign,
  Activity,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
  ComposedChart,
} from 'recharts';
import { calcService } from '@/services/calcService';
import { exportService } from '@/services/exportService';
import { generateReportPDF, ReportData } from '@/services/institutionalPdfService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  reportService,
  type ReportLoan,
  type ReportPayment,
  type ReportDisbursement,
  type ReportClient,
  type ReportUser,
  type PortfolioStats,
} from '@/services/reports/reportService';
import { LoanApplication, LoanProduct } from '@/models/types';

const CHART_COLORS = {
  primary: 'hsl(215, 70%, 35%)',
  success: 'hsl(150, 60%, 40%)',
  warning: 'hsl(38, 92%, 50%)',
  danger: 'hsl(0, 72%, 51%)',
  accent: 'hsl(175, 60%, 40%)',
  purple: 'hsl(270, 50%, 50%)',
};

const AGING_COLORS = [
  'hsl(150, 60%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(25, 90%, 55%)',
  'hsl(10, 85%, 55%)',
  'hsl(0, 72%, 51%)',
];

const PIE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.accent,
  CHART_COLORS.purple,
];

function ReportHeader({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
  changeLabel,
  variant = 'default',
}: {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}) {
  const colorMap = {
    default: 'text-foreground',
    success: 'text-success',
    danger: 'text-destructive',
    warning: 'text-warning',
  };

  return (
    <div className="p-4 rounded-xl border bg-card/50 backdrop-blur-sm">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p className={`text-xl font-bold mt-1 ${colorMap[variant]}`}>{value}</p>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {change >= 0 ? (
            <ArrowUpRight className="w-3 h-3 text-success" />
          ) : (
            <ArrowDownRight className="w-3 h-3 text-destructive" />
          )}
          <span
            className={`text-xs font-medium ${
              change >= 0 ? 'text-success' : 'text-destructive'
            }`}
          >
            {Math.abs(change).toFixed(1)}%
          </span>
          {changeLabel && (
            <span className="text-xs text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

const CustomTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  padding: '10px 14px',
  fontSize: '13px',
};

export default function Relatorios() {
  const { toast } = useToast();
  const { user, canAccess } = useAuth();

  const isAdmin = canAccess(['admin']);
  const isAnalyst = canAccess(['admin', 'analyst']);
  const isCashier = canAccess(['admin', 'cashier']);

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState('trimestre');
  const [loading, setLoading] = useState(true);

  const [loans, setLoans] = useState<ReportLoan[]>([]);
  const [payments, setPayments] = useState<ReportPayment[]>([]);
  const [disbursements, setDisbursements] = useState<ReportDisbursement[]>([]);
  const [clients, setClients] = useState<ReportClient[]>([]);
  const [users, setUsers] = useState<ReportUser[]>([]);
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats>({
    totalActiveLoans: 0,
    totalOverdueLoans: 0,
    totalActiveAmount: 0,
    totalOverdueAmount: 0,
    delinquencyRate: 0,
    agingBuckets: {
      current: 0,
      days1_30: 0,
      days31_60: 0,
      days61_90: 0,
      days90Plus: 0,
    },
  });

  async function loadReports() {
    try {
      if (!user?.tenantId) return;
      setLoading(true);

      const data = await reportService.loadAll(user.tenantId);

      setLoans(data.loans);
      setPayments(data.payments);
      setDisbursements(data.disbursements);
      setClients(data.clients);
      setUsers(data.users);
      setProducts(data.products);
      setApplications(data.applications);
      setPortfolioStats(reportService.getPortfolioStats(data.loans));
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os relatórios.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadReports();
  }, [user?.tenantId]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const now = new Date();
    let start: Date;

    switch (period) {
      case 'mes':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'trimestre':
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        break;
      case 'semestre':
        start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        break;
      case 'ano':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    }

    setDateFrom(start.toISOString().split('T')[0]);
    setDateTo(now.toISOString().split('T')[0]);
  };

  const analysts = users.filter((u) => u.role === 'analyst' || u.role === 'admin');

  const fromDate = new Date(dateFrom);
  const toDate = new Date(dateTo + 'T23:59:59');

  const filteredDisbursements = useMemo(
    () =>
      disbursements.filter((d) => {
        const dt = new Date(d.disbursedAt);
        return dt >= fromDate && dt <= toDate;
      }),
    [disbursements, dateFrom, dateTo]
  );

  const filteredPayments = useMemo(
    () =>
      payments.filter((p) => {
        const dt = new Date(p.paymentDate);
        return dt >= fromDate && dt <= toDate && !p.reversed;
      }),
    [payments, dateFrom, dateTo]
  );

  const filteredApplications = useMemo(
    () =>
      applications.filter((a) => {
        const dt = new Date(a.createdAt);
        return dt >= fromDate && dt <= toDate;
      }),
    [applications, dateFrom, dateTo]
  );

  const activeLoans = useMemo(
    () => loans.filter((l) => ['active', 'overdue'].includes(l.status)),
    [loans]
  );

  const executiveSummary = useMemo(() => {
    const totalDisbursed = filteredDisbursements.reduce((s, d) => s + d.netAmount, 0);
    const totalReceived = filteredPayments.reduce((s, p) => s + p.amount, 0);
    const principalReceived = filteredPayments.reduce((s, p) => s + p.principalPaid, 0);
    const interestReceived = filteredPayments.reduce((s, p) => s + p.interestPaid, 0);
    const penaltyReceived = filteredPayments.reduce((s, p) => s + p.penaltyPaid, 0);

    const totalApproved = filteredApplications.filter((a) => a.status === 'approved').length;
    const totalRejected = filteredApplications.filter((a) => a.status === 'rejected').length;
    const totalSubmitted = filteredApplications.filter((a) => a.status !== 'draft').length;
    const approvalRate = totalSubmitted > 0 ? (totalApproved / totalSubmitted) * 100 : 0;

    const par30 =
      portfolioStats.totalActiveAmount > 0
        ? ((portfolioStats.agingBuckets.days1_30 +
            portfolioStats.agingBuckets.days31_60 +
            portfolioStats.agingBuckets.days61_90 +
            portfolioStats.agingBuckets.days90Plus) /
            portfolioStats.totalActiveAmount) *
          100
        : 0;

    const par90 =
      portfolioStats.totalActiveAmount > 0
        ? (portfolioStats.agingBuckets.days90Plus / portfolioStats.totalActiveAmount) * 100
        : 0;

    const avgLoanSize =
      activeLoans.length > 0
        ? activeLoans.reduce((s, l) => s + l.principalAmount, 0) / activeLoans.length
        : 0;

    const collectionRate = totalDisbursed > 0 ? (totalReceived / totalDisbursed) * 100 : 0;

    return {
      totalDisbursed,
      totalReceived,
      principalReceived,
      interestReceived,
      penaltyReceived,
      totalApproved,
      totalRejected,
      totalSubmitted,
      approvalRate,
      par30,
      par90,
      avgLoanSize,
      collectionRate,
      activeClients: clients.filter((c) => c.status === 'active').length,
      totalPortfolio: portfolioStats.totalActiveAmount,
      delinquencyRate: portfolioStats.delinquencyRate,
    };
  }, [filteredDisbursements, filteredPayments, filteredApplications, portfolioStats, activeLoans, clients]);

  const monthlyTrendData = useMemo(() => {
    const months: { name: string; desembolsado: number; recebido: number; capital: number; juros: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const label = start.toLocaleDateString('pt-MZ', {
        month: 'short',
        year: '2-digit',
      });

      const d = disbursements.filter((x) => {
        const dt = new Date(x.disbursedAt);
        return dt >= start && dt <= end;
      });

      const p = payments.filter((x) => {
        const dt = new Date(x.paymentDate);
        return dt >= start && dt <= end && !x.reversed;
      });

      months.push({
        name: label,
        desembolsado: d.reduce((s, x) => s + x.netAmount, 0),
        recebido: p.reduce((s, x) => s + x.amount, 0),
        capital: p.reduce((s, x) => s + x.principalPaid, 0),
        juros: p.reduce((s, x) => s + x.interestPaid, 0),
      });
    }

    return months;
  }, [disbursements, payments]);

  const agingData = useMemo(
    () =>
      [
        { name: 'Em Dia', value: portfolioStats.agingBuckets.current, fill: AGING_COLORS[0] },
        { name: '1-30 dias', value: portfolioStats.agingBuckets.days1_30, fill: AGING_COLORS[1] },
        { name: '31-60 dias', value: portfolioStats.agingBuckets.days31_60, fill: AGING_COLORS[2] },
        { name: '61-90 dias', value: portfolioStats.agingBuckets.days61_90, fill: AGING_COLORS[3] },
        { name: '90+ dias', value: portfolioStats.agingBuckets.days90Plus, fill: AGING_COLORS[4] },
      ].filter((d) => d.value > 0),
    [portfolioStats]
  );

  const paymentMethodData = useMemo(() => {
    const methods: Record<string, number> = {};

    filteredPayments.forEach((p) => {
      const label =
        p.paymentMethod === 'cash'
          ? 'Dinheiro'
          : p.paymentMethod === 'mpesa'
          ? 'M-Pesa'
          : p.paymentMethod === 'emola'
          ? 'e-Mola'
          : p.paymentMethod === 'bank_transfer'
          ? 'Transferência'
          : String(p.paymentMethod);

      methods[label] = (methods[label] || 0) + p.amount;
    });

    return Object.entries(methods).map(([name, value], i) => ({
      name,
      value,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [filteredPayments]);

  const productPerformance = useMemo(() => {
    return products
      .map((product) => {
        const productLoans = loans.filter((l) => {
          const app = applications.find((a) => a.id === l.applicationId);
          return app?.productId === product.id;
        });

        const active = productLoans.filter((l) => ['active', 'overdue'].includes(l.status));
        const portfolio = active.reduce((s, l) => s + l.outstandingPrincipal, 0);
        const overdue = active
          .filter((l) => l.status === 'overdue')
          .reduce((s, l) => s + l.outstandingPrincipal, 0);
        const par = portfolio > 0 ? (overdue / portfolio) * 100 : 0;

        return {
          id: product.id,
          name: product.name,
          count: productLoans.length,
          active: active.length,
          portfolio,
          overdue,
          par,
        };
      })
      .filter((p) => p.count > 0);
  }, [loans, products, applications]);

  const analystPerformance = useMemo(() => {
    return analysts
      .map((analyst) => {
        const aLoans = loans.filter((l) => l.analystId === analyst.id);
        const active = aLoans.filter((l) => ['active', 'overdue'].includes(l.status));
        const overdue = active.filter((l) => l.status === 'overdue');
        const portfolio = active.reduce((s, l) => s + l.outstandingPrincipal, 0);
        const overdueAmt = overdue.reduce((s, l) => s + l.outstandingPrincipal, 0);
        const aApps = applications.filter((a) => a.assignedAnalyst === analyst.id);
        const approved = aApps.filter((a) => a.status === 'approved').length;
        const rejected = aApps.filter((a) => a.status === 'rejected').length;

        return {
          id: analyst.id,
          name: analyst.fullName,
          role: analyst.role,
          totalLoans: aLoans.length,
          activeLoans: active.length,
          overdueLoans: overdue.length,
          portfolio,
          overdue: overdueAmt,
          par: portfolio > 0 ? (overdueAmt / portfolio) * 100 : 0,
          appsAnalysed: approved + rejected,
          approved,
          rejected,
          approvalRate: approved + rejected > 0 ? (approved / (approved + rejected)) * 100 : 0,
        };
      })
      .filter((a) => a.totalLoans > 0 || a.appsAnalysed > 0);
  }, [loans, analysts, applications]);

  const parTrendData = useMemo(() => {
    const now = new Date();

    return Array.from({ length: 6 }, (_, i) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0);
      const label = monthStart.toLocaleDateString('pt-MZ', {
        month: 'short',
        year: '2-digit',
      });

      const monthLoans = loans.filter((l) => {
        const created = new Date(l.createdAt);
        return created <= monthEnd && ['active', 'overdue', 'paid_off', 'closed'].includes(l.status);
      });

      const totalAmt = monthLoans.reduce((s, l) => s + l.outstandingPrincipal, 0);
      const overdueAmt = monthLoans
        .filter((l) => l.daysOverdue > 0)
        .reduce((s, l) => s + l.outstandingPrincipal, 0);

      return {
        name: label,
        par: totalAmt > 0 ? (overdueAmt / totalAmt) * 100 : 0,
      };
    });
  }, [loans]);

  const provinceData = useMemo(() => {
    const provinces: Record<string, { count: number; amount: number }> = {};

    activeLoans.forEach((l) => {
      const client = clients.find((c) => c.id === l.clientId);
      const prov = client?.province || 'Desconhecido';

      if (!provinces[prov]) provinces[prov] = { count: 0, amount: 0 };
      provinces[prov].count++;
      provinces[prov].amount += l.outstandingPrincipal;
    });

    return Object.entries(provinces)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [activeLoans, clients]);

  const handleExport = useCallback(
    (type: string) => {
      let data: Record<string, unknown>[] = [];
      let filename = '';

      switch (type) {
        case 'portfolio':
          data = activeLoans.map((l) => {
            const client = clients.find((c) => c.id === l.clientId);
            return {
              'Nº Empréstimo': l.loanNumber,
              Cliente: client?.fullName || '',
              BI: client?.biNumber || '',
              Província: client?.province || '',
              'Capital Original': l.principalAmount,
              'Saldo Devedor': l.outstandingPrincipal,
              'Dias Atraso': l.daysOverdue,
              Estado: l.status === 'overdue' ? 'Em Atraso' : 'Activo',
              'Próx. Vencimento': l.nextPaymentDate || '',
              Analista: users.find((u) => u.id === l.analystId)?.fullName || '',
            };
          });
          filename = 'Relatorio_Carteira';
          break;

        case 'disbursements':
          data = filteredDisbursements.map((d) => {
            const client = clients.find((c) => c.id === d.clientId);
            return {
              Data: new Date(d.disbursedAt).toLocaleDateString('pt-MZ'),
              Cliente: client?.fullName || '',
              'Valor Bruto': d.grossAmount,
              'Taxa Admin': d.adminFee,
              'Valor Líquido': d.netAmount,
              Método: d.method,
              Referência: d.reference || '',
            };
          });
          filename = 'Relatorio_Desembolsos';
          break;

        case 'payments':
          data = filteredPayments.map((p) => {
            const client = clients.find((c) => c.id === p.clientId);
            return {
              Recibo: p.receiptNumber || '',
              Data: new Date(p.paymentDate).toLocaleDateString('pt-MZ'),
              Cliente: client?.fullName || '',
              'Valor Total': p.amount,
              Capital: p.principalPaid,
              Juros: p.interestPaid,
              Multa: p.penaltyPaid,
              Método: p.paymentMethod,
            };
          });
          filename = 'Relatorio_Pagamentos';
          break;

        case 'aging':
          data = activeLoans
            .sort((a, b) => b.daysOverdue - a.daysOverdue)
            .map((l) => {
              const client = clients.find((c) => c.id === l.clientId);
              const bucket =
                l.daysOverdue === 0
                  ? 'Em Dia'
                  : l.daysOverdue <= 30
                  ? '1-30 dias'
                  : l.daysOverdue <= 60
                  ? '31-60 dias'
                  : l.daysOverdue <= 90
                  ? '61-90 dias'
                  : '90+ dias';

              return {
                'Nº Empréstimo': l.loanNumber,
                Cliente: client?.fullName || '',
                Telefone: client?.phone || '',
                'Capital Original': l.principalAmount,
                'Saldo Devedor': l.outstandingPrincipal,
                'Dias Atraso': l.daysOverdue,
                Faixa: bucket,
                'Próx. Vencimento': l.nextPaymentDate || '',
              };
            });
          filename = 'Relatorio_Aging_Carteira';
          break;
      }

      if (data.length === 0) {
        toast({
          title: 'Sem dados',
          description: 'Não há dados para exportar no período seleccionado',
          variant: 'destructive',
        });
        return;
      }

      exportService.exportToCSV(data, filename);
      toast({
        title: 'Relatório exportado',
        description: `${filename}.csv descarregado com sucesso`,
      });
    },
    [activeLoans, clients, users, filteredDisbursements, filteredPayments, toast]
  );

  const reportDate = new Date().toLocaleDateString('pt-MZ', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const periodLabel = `${new Date(dateFrom).toLocaleDateString('pt-MZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} — ${new Date(dateTo).toLocaleDateString('pt-MZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;

  const handleExportPDF = useCallback(() => {
    const reportData: ReportData = {
      period: periodLabel,
      emittedBy: user?.fullName || 'Sistema',
      emitterRole:
        user?.role === 'admin'
          ? 'Administrador'
          : user?.role === 'analyst'
          ? 'Analista de Crédito'
          : 'Caixa',
      summary: {
        totalPortfolio: executiveSummary.totalPortfolio,
        activeLoans: portfolioStats.totalActiveLoans,
        activeClients: executiveSummary.activeClients,
        avgLoanSize: executiveSummary.avgLoanSize,
        totalDisbursed: executiveSummary.totalDisbursed,
        totalReceived: executiveSummary.totalReceived,
        par30: executiveSummary.par30,
        par90: executiveSummary.par90,
        delinquencyRate: executiveSummary.delinquencyRate,
        approvalRate: executiveSummary.approvalRate,
        totalApproved: executiveSummary.totalApproved,
        totalRejected: executiveSummary.totalRejected,
        totalSubmitted: executiveSummary.totalSubmitted,
        principalReceived: executiveSummary.principalReceived,
        interestReceived: executiveSummary.interestReceived,
        penaltyReceived: executiveSummary.penaltyReceived,
        collectionRate: executiveSummary.collectionRate,
      },
      agingData: agingData.map((d) => ({ name: d.name, value: d.value })),
      provinceData,
      productData: productPerformance.map((p) => ({
        name: p.name,
        count: p.count,
        portfolio: p.portfolio,
        overdue: p.overdue,
        par: p.par,
      })),
      analystData: analystPerformance.map((a) => ({
        name: a.name,
        activeLoans: a.activeLoans,
        portfolio: a.portfolio,
        overdue: a.overdue,
        par: a.par,
        approved: a.approved,
        rejected: a.rejected,
      })),
      portfolioDetail: activeLoans.map((l) => {
        const client = clients.find((c) => c.id === l.clientId);
        return {
          loanNumber: l.loanNumber,
          client: client?.fullName || '',
          bi: client?.biNumber || '',
          principal: l.principalAmount,
          outstanding: l.outstandingPrincipal,
          daysOverdue: l.daysOverdue,
          status: l.status === 'overdue' ? 'Em Atraso' : 'Activo',
        };
      }),
    };

    generateReportPDF(reportData);

    toast({
      title: 'Relatório PDF exportado',
      description: 'Relatório institucional descarregado com sucesso',
    });
  }, [periodLabel, executiveSummary, portfolioStats, agingData, provinceData, productPerformance, analystPerformance, activeLoans, clients, user, toast]);

  if (loading) {
    return <div className="p-6">A carregar relatórios...</div>;
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold tracking-tight">Relatórios Institucionais</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              MicroLoan Hub • Relatório gerado em {reportDate} • Período: {periodLabel}
            </p>
            {user && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Emitido por: {user.fullName} (
                {user.role === 'admin'
                  ? 'Administrador'
                  : user.role === 'analyst'
                  ? 'Analista de Crédito'
                  : 'Caixa/Tesouraria'}
                )
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Shield className="w-3 h-3 mr-1" />
              {user?.role === 'admin'
                ? 'Acesso Total'
                : user?.role === 'analyst'
                ? 'Analista'
                : 'Caixa'}
            </Badge>
          </div>
        </div>
      </motion.div>

      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-xs font-medium">Período Rápido</Label>
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes">Este Mês</SelectItem>
                  <SelectItem value="trimestre">Trimestre</SelectItem>
                  <SelectItem value="semestre">Semestre</SelectItem>
                  <SelectItem value="ano">Este Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">De</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>

            <div>
              <Label className="text-xs font-medium">Até</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>

            <div className="flex gap-2 ml-auto flex-wrap">
              <Button size="sm" onClick={handleExportPDF} className="bg-primary text-primary-foreground">
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Relatório PDF
              </Button>

              <Button variant="outline" size="sm" onClick={() => handleExport('portfolio')}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Carteira CSV
              </Button>

              <Button variant="outline" size="sm" onClick={() => handleExport('aging')}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Aging CSV
              </Button>

              {isCashier && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleExport('disbursements')}>
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Desembolsos CSV
                  </Button>

                  <Button variant="outline" size="sm" onClick={() => handleExport('payments')}>
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Pagamentos CSV
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="executive" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="executive" className="text-xs">
            Sumário Executivo
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="text-xs">
            Qualidade da Carteira
          </TabsTrigger>
          {isCashier && (
            <TabsTrigger value="operations" className="text-xs">
              Operações
            </TabsTrigger>
          )}
          {isAnalyst && (
            <TabsTrigger value="performance" className="text-xs">
              Desempenho
            </TabsTrigger>
          )}
          <TabsTrigger value="geographic" className="text-xs">
            Geográfico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="space-y-6">
          <ReportHeader
            title="Sumário Executivo"
            subtitle="Indicadores-chave para Conselho de Direcção e Banco de Moçambique"
            icon={Briefcase}
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Carteira Activa Total" value={calcService.formatCurrency(executiveSummary.totalPortfolio)} />
            <MetricCard label="Empréstimos Activos" value={portfolioStats.totalActiveLoans.toString()} />
            <MetricCard label="Clientes Activos" value={executiveSummary.activeClients.toString()} />
            <MetricCard label="Ticket Médio" value={calcService.formatCurrency(executiveSummary.avgLoanSize)} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Total Desembolsado" value={calcService.formatCurrency(executiveSummary.totalDisbursed)} variant="success" />
            <MetricCard label="Total Recebido" value={calcService.formatCurrency(executiveSummary.totalReceived)} variant="success" />
            <MetricCard label="PAR > 30 dias" value={calcService.formatPercentage(executiveSummary.par30)} variant={executiveSummary.par30 > 10 ? 'danger' : executiveSummary.par30 > 5 ? 'warning' : 'success'} />
            <MetricCard label="Taxa de Inadimplência" value={calcService.formatPercentage(executiveSummary.delinquencyRate)} variant={executiveSummary.delinquencyRate > 10 ? 'danger' : 'default'} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard label="Solicitações Recebidas" value={executiveSummary.totalSubmitted.toString()} />
            <MetricCard label="Aprovadas" value={executiveSummary.totalApproved.toString()} variant="success" />
            <MetricCard label="Rejeitadas" value={executiveSummary.totalRejected.toString()} variant="danger" />
            <MetricCard label="Taxa de Aprovação" value={calcService.formatPercentage(executiveSummary.approvalRate)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="card-elevated lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Desembolsos vs Recebimentos (6 meses)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={monthlyTrendData}>
                      <defs>
                        <linearGradient id="gradDisb" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <RechartsTooltip contentStyle={CustomTooltipStyle} formatter={(v: number) => calcService.formatCurrency(v)} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Area type="monotone" dataKey="desembolsado" fill="url(#gradDisb)" stroke={CHART_COLORS.primary} strokeWidth={2} name="Desembolsado" />
                      <Line type="monotone" dataKey="recebido" stroke={CHART_COLORS.success} strokeWidth={2.5} dot={{ r: 3 }} name="Recebido" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Aging da Carteira</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={agingData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {agingData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={CustomTooltipStyle} formatter={(v: number) => calcService.formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  {agingData.map((e) => (
                    <div key={e.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.fill }} />
                      <span className="text-muted-foreground">{e.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-6">
          <ReportHeader
            title="Qualidade da Carteira"
            subtitle="Portfolio at Risk (PAR), aging e provisões"
            icon={Shield}
          />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MetricCard label="Carteira Total" value={calcService.formatCurrency(portfolioStats.totalActiveAmount)} />
            <MetricCard label="Em Dia" value={calcService.formatCurrency(portfolioStats.agingBuckets.current)} variant="success" />
            <MetricCard label="PAR > 30" value={calcService.formatPercentage(executiveSummary.par30)} variant={executiveSummary.par30 > 10 ? 'danger' : 'warning'} />
            <MetricCard label="PAR > 90" value={calcService.formatPercentage(executiveSummary.par90)} variant={executiveSummary.par90 > 5 ? 'danger' : 'default'} />
            <MetricCard label="Empréstimos em Atraso" value={portfolioStats.totalOverdueLoans.toString()} variant="danger" />
          </div>

          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Mapa de Aging Detalhado</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Faixa de Atraso</TableHead>
                    <TableHead className="text-xs text-right">Nº Empréstimos</TableHead>
                    <TableHead className="text-xs text-right">Saldo Devedor</TableHead>
                    <TableHead className="text-xs text-right">% da Carteira</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { label: 'Em Dia (0 dias)', loans: activeLoans.filter((l) => l.daysOverdue === 0) },
                    { label: '1–30 dias', loans: activeLoans.filter((l) => l.daysOverdue > 0 && l.daysOverdue <= 30) },
                    { label: '31–60 dias', loans: activeLoans.filter((l) => l.daysOverdue > 30 && l.daysOverdue <= 60) },
                    { label: '61–90 dias', loans: activeLoans.filter((l) => l.daysOverdue > 60 && l.daysOverdue <= 90) },
                    { label: '90+ dias', loans: activeLoans.filter((l) => l.daysOverdue > 90) },
                  ].map((bucket) => {
                    const amount = bucket.loans.reduce((s, l) => s + l.outstandingPrincipal, 0);
                    const pct = portfolioStats.totalActiveAmount > 0 ? (amount / portfolioStats.totalActiveAmount) * 100 : 0;

                    return (
                      <TableRow key={bucket.label}>
                        <TableCell className="text-sm font-medium">{bucket.label}</TableCell>
                        <TableCell className="text-sm text-right">{bucket.loans.length}</TableCell>
                        <TableCell className="text-sm text-right">{calcService.formatCurrency(amount)}</TableCell>
                        <TableCell className="text-sm text-right">{pct.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}

                  <TableRow className="font-bold border-t-2">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{activeLoans.length}</TableCell>
                    <TableCell className="text-right">{calcService.formatCurrency(portfolioStats.totalActiveAmount)}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Qualidade por Produto de Crédito</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Produto</TableHead>
                    <TableHead className="text-xs text-right">Empréstimos</TableHead>
                    <TableHead className="text-xs text-right">Carteira</TableHead>
                    <TableHead className="text-xs text-right">Em Atraso</TableHead>
                    <TableHead className="text-xs text-right">PAR %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productPerformance.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm font-medium">{p.name}</TableCell>
                      <TableCell className="text-sm text-right">{p.active}</TableCell>
                      <TableCell className="text-sm text-right">{calcService.formatCurrency(p.portfolio)}</TableCell>
                      <TableCell className="text-sm text-right text-destructive">{calcService.formatCurrency(p.overdue)}</TableCell>
                      <TableCell className="text-sm text-right">
                        <Badge variant={p.par > 10 ? 'destructive' : p.par > 5 ? 'secondary' : 'default'} className="text-xs">
                          {p.par.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {isCashier && (
          <TabsContent value="operations" className="space-y-6">
            <ReportHeader
              title="Relatório Operacional"
              subtitle="Desembolsos, pagamentos e movimentação de caixa"
              icon={DollarSign}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Desembolsado (Período)" value={calcService.formatCurrency(executiveSummary.totalDisbursed)} />
              <MetricCard label="Nº Desembolsos" value={filteredDisbursements.length.toString()} />
              <MetricCard label="Recebido (Período)" value={calcService.formatCurrency(executiveSummary.totalReceived)} variant="success" />
              <MetricCard label="Nº Pagamentos" value={filteredPayments.length.toString()} />
            </div>
          </TabsContent>
        )}

        {isAnalyst && (
          <TabsContent value="performance" className="space-y-6">
            <ReportHeader
              title="Desempenho"
              subtitle="Análise por analista e produto de crédito"
              icon={Activity}
            />

            <Card className="card-elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Performance por Analista de Crédito</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Analista</TableHead>
                      <TableHead className="text-xs">Perfil</TableHead>
                      <TableHead className="text-xs text-right">Empréstimos</TableHead>
                      <TableHead className="text-xs text-right">Carteira</TableHead>
                      <TableHead className="text-xs text-right">Em Atraso</TableHead>
                      <TableHead className="text-xs text-right">PAR %</TableHead>
                      <TableHead className="text-xs text-right">Analisadas</TableHead>
                      <TableHead className="text-xs text-right">Taxa Aprov.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analystPerformance.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm font-medium">{a.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {a.role === 'admin' ? 'Admin' : 'Analista'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-right">{a.activeLoans}</TableCell>
                        <TableCell className="text-sm text-right">{calcService.formatCurrency(a.portfolio)}</TableCell>
                        <TableCell className="text-sm text-right text-destructive">{calcService.formatCurrency(a.overdue)}</TableCell>
                        <TableCell className="text-sm text-right">
                          <Badge variant={a.par > 10 ? 'destructive' : a.par > 5 ? 'secondary' : 'default'} className="text-xs">
                            {a.par.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-right">{a.appsAnalysed}</TableCell>
                        <TableCell className="text-sm text-right">{a.approvalRate.toFixed(0)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="geographic" className="space-y-6">
          <ReportHeader
            title="Distribuição Geográfica"
            subtitle="Carteira por província e concentração regional"
            icon={Building2}
          />

          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Detalhe por Província</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Província</TableHead>
                    <TableHead className="text-xs text-right">Nº Empréstimos</TableHead>
                    <TableHead className="text-xs text-right">Saldo Devedor</TableHead>
                    <TableHead className="text-xs text-right">% da Carteira</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {provinceData.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell className="text-sm font-medium">{p.name}</TableCell>
                      <TableCell className="text-sm text-right">{p.count}</TableCell>
                      <TableCell className="text-sm text-right">{calcService.formatCurrency(p.amount)}</TableCell>
                      <TableCell className="text-sm text-right">
                        {portfolioStats.totalActiveAmount > 0
                          ? ((p.amount / portfolioStats.totalActiveAmount) * 100).toFixed(1)
                          : '0.0'}
                        %
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-center py-4 border-t">
        <p className="text-xs text-muted-foreground">
          MicroLoan Hub — Relatório gerado automaticamente • {reportDate}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Documento para uso interno — Confidencial
        </p>
      </div>
    </div>
  );
}